import { LeaveStatus } from "../../../generated/prisma/enums.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { AppError } from "../../shared/errors/AppError.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const AUTO_APPROVAL_MS = 48 * 60 * 60 * 1000;
const MAX_LEAVE_DAYS = 60;

type LeaveWindow = {
	start: Date;
	end: Date;
};

function normalizeDate(date: Date): Date {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);
}

function dateKey(date: Date): string {
	return normalizeDate(date).toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
	return new Date(
		Date.UTC(
			date.getUTCFullYear(),
			date.getUTCMonth(),
			date.getUTCDate() + days,
		),
	);
}

function differenceInDaysInclusive(start: Date, end: Date): number {
	const normalizedStart = normalizeDate(start).getTime();
	const normalizedEnd = normalizeDate(end).getTime();
	return Math.floor((normalizedEnd - normalizedStart) / DAY_MS) + 1;
}

function academicYearWindow(date: Date): LeaveWindow {
	const normalized = normalizeDate(date);
	const startYear =
		normalized.getUTCMonth() >= 6
			? normalized.getUTCFullYear()
			: normalized.getUTCFullYear() - 1;
	return {
		start: new Date(Date.UTC(startYear, 6, 1)),
		end: new Date(Date.UTC(startYear + 1, 5, 30)),
	};
}

function effectiveLeaveWindow(leave: {
	startDate: Date;
	endDate: Date;
	returnDate: Date | null;
}): LeaveWindow {
	const start = normalizeDate(leave.startDate);
	const end = normalizeDate(leave.endDate);
	if (!leave.returnDate) {
		return { start, end };
	}

	const returnedOn = normalizeDate(leave.returnDate);
	const effectiveEnd = new Date(
		Math.min(end.getTime(), returnedOn.getTime() - DAY_MS),
	);
	return {
		start,
		end: effectiveEnd,
	};
}

function overlapDays(left: LeaveWindow, right: LeaveWindow): number {
	const start = left.start > right.start ? left.start : right.start;
	const end = left.end < right.end ? left.end : right.end;
	if (end < start) {
		return 0;
	}

	return differenceInDaysInclusive(start, end);
}

function formatLeaveResponse<
	T extends {
		startDate: Date;
		endDate: Date;
		appliedOn: Date;
		autoApproveAt: Date;
		actionedAt: Date | null;
		returnDate: Date | null;
	},
>(leave: T) {
	return {
		...leave,
		startDate: dateKey(leave.startDate),
		endDate: dateKey(leave.endDate),
		appliedOn: leave.appliedOn.toISOString(),
		autoApproveAt: leave.autoApproveAt.toISOString(),
		actionedAt: leave.actionedAt ? leave.actionedAt.toISOString() : null,
		returnDate: leave.returnDate ? dateKey(leave.returnDate) : null,
	};
}

export class LeavesService {
	private async ensureStudentExists(studentId: string) {
		const student = await prisma.student.findFirst({
			where: { id: studentId, deletedAt: null, isActive: true },
			select: { id: true },
		});

		if (!student) {
			throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
		}
	}

	private async getLeaveById(leaveId: string) {
		const leave = await prisma.leave.findUnique({
			where: { id: leaveId },
			include: {
				student: {
					include: {
						user: {
							select: {
								id: true,
								email: true,
								firstName: true,
								lastName: true,
							},
						},
					},
				},
			},
		});

		if (!leave) {
			throw new AppError("Leave not found", 404, "LEAVE_NOT_FOUND");
		}

		return leave;
	}

	private async getStudentAssignmentSnapshot(studentId: string) {
		const [hostelAssignment, messAssignment] = await Promise.all([
			prisma.hostelAssignment.findFirst({
				where: {
					studentId,
					isCurrent: true,
				},
				include: {
					hostel: { select: { id: true, name: true } },
					room: { select: { id: true, roomNumber: true } },
				},
			}),
			prisma.messAssignment.findFirst({
				where: {
					studentId,
					isCurrent: true,
				},
				include: {
					mess: { select: { id: true, name: true } },
				},
			}),
		]);

		return { hostelAssignment, messAssignment };
	}

	private async assertLeaveRules(
		studentId: string,
		startDate: Date,
		endDate: Date,
	) {
		const today = normalizeDate(new Date());
		const minimumStartDate = addDays(today, 2);
		if (startDate < minimumStartDate) {
			throw new AppError(
				"Leave must start at least 2 calendar days from today",
				422,
				"LEAVE_TOO_EARLY",
			);
		}

		if (endDate < startDate) {
			throw new AppError(
				"End date must be on or after start date",
				422,
				"LEAVE_INVALID_RANGE",
			);
		}

		const existingLeaves = await prisma.leave.findMany({
			where: {
				studentId,
				status: {
					notIn: [LeaveStatus.REJECTED, LeaveStatus.CANCELLED],
				},
			},
			select: {
				startDate: true,
				endDate: true,
				returnDate: true,
				status: true,
			},
		});

		const requestedWindow = { start: startDate, end: endDate };
		for (const existing of existingLeaves) {
			const activeWindow = effectiveLeaveWindow(existing);
			if (overlapDays(activeWindow, requestedWindow) > 0) {
				throw new AppError(
					"Requested leave overlaps with an existing leave",
					409,
					"LEAVE_OVERLAP",
				);
			}
		}

		const { start: yearStart, end: yearEnd } = academicYearWindow(today);
		const usedDays = existingLeaves.reduce((total, existing) => {
			return (
				total +
				overlapDays(effectiveLeaveWindow(existing), {
					start: yearStart,
					end: yearEnd,
				})
			);
		}, 0);

		const requestedDays = overlapDays(requestedWindow, {
			start: yearStart,
			end: yearEnd,
		});
		if (usedDays + requestedDays > MAX_LEAVE_DAYS) {
			throw new AppError(
				"Leave limit exceeded for the current academic year",
				422,
				"LEAVE_LIMIT_EXCEEDED",
			);
		}
	}

	async getStudentLeaves(studentId: string) {
		await this.ensureStudentExists(studentId);
		const today = normalizeDate(new Date());
		const { start: yearStart, end: yearEnd } = academicYearWindow(today);

		const [leaves, assignmentSnapshot] = await Promise.all([
			prisma.leave.findMany({
				where: { studentId },
				orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
			}),
			this.getStudentAssignmentSnapshot(studentId),
		]);

		const usedDays = leaves.reduce((total, leave) => {
			if (
				leave.status === LeaveStatus.REJECTED ||
				leave.status === LeaveStatus.CANCELLED
			) {
				return total;
			}
			return (
				total +
				overlapDays(effectiveLeaveWindow(leave), {
					start: yearStart,
					end: yearEnd,
				})
			);
		}, 0);

		const summary = leaves.reduce(
			(acc, leave) => {
				acc[leave.status] += 1;
				return acc;
			},
			{
				PENDING: 0,
				APPROVED: 0,
				REJECTED: 0,
				AUTO_APPROVED: 0,
				CANCELLED: 0,
			},
		);

		return {
			leaves: leaves.map((leave) => formatLeaveResponse(leave)),
			summary: {
				...summary,
				usedDays,
				remainingDays: Math.max(MAX_LEAVE_DAYS - usedDays, 0),
			},
			assignmentSnapshot,
		};
	}

	async applyLeave(
		studentId: string,
		actorUserId: string,
		input: {
			startDate: Date;
			endDate: Date;
			reason?: string | undefined;
		},
	) {
		await this.ensureStudentExists(studentId);
		const startDate = normalizeDate(input.startDate);
		const endDate = normalizeDate(input.endDate);
		await this.assertLeaveRules(studentId, startDate, endDate);

		const appliedOn = new Date();
		const autoApproveAt = new Date(appliedOn.getTime() + AUTO_APPROVAL_MS);

		const created = await prisma.$transaction(async (tx) => {
			const leave = await tx.leave.create({
				data: {
					studentId,
					startDate,
					endDate,
					duration: differenceInDaysInclusive(startDate, endDate),
					reason: input.reason ?? null,
					status: LeaveStatus.PENDING,
					autoApproveAt,
				},
			});

			await tx.auditLog.create({
				data: {
					action: "LEAVE_APPLIED",
					entityType: "leave",
					entityId: leave.id,
					userId: actorUserId,
					newValue: {
						studentId,
						startDate: dateKey(startDate),
						endDate: dateKey(endDate),
						status: LeaveStatus.PENDING,
					},
				},
			});

			return leave;
		});

		return formatLeaveResponse(created);
	}

	async cancelOrReturnLeave(
		studentId: string,
		actorUserId: string,
		leaveId: string,
	) {
		const leave = await this.getLeaveById(leaveId);
		if (leave.studentId !== studentId) {
			throw new AppError("Leave not found", 404, "LEAVE_NOT_FOUND");
		}

		if (leave.status === LeaveStatus.PENDING) {
			const updated = await prisma.$transaction(async (tx) => {
				const nextLeave = await tx.leave.update({
					where: { id: leaveId },
					data: {
						status: LeaveStatus.CANCELLED,
						actionedAt: new Date(),
					},
				});

				await tx.auditLog.create({
					data: {
						action: "LEAVE_CANCELLED",
						entityType: "leave",
						entityId: leaveId,
						userId: actorUserId,
						oldValue: { status: leave.status },
						newValue: { status: LeaveStatus.CANCELLED },
					},
				});

				return nextLeave;
			});

			return formatLeaveResponse(updated);
		}

		if (
			leave.status !== LeaveStatus.APPROVED &&
			leave.status !== LeaveStatus.AUTO_APPROVED
		) {
			throw new AppError(
				"Leave cannot be returned",
				409,
				"LEAVE_CANNOT_BE_RETURNED",
			);
		}

		const returnDate = normalizeDate(new Date());
		if (returnDate < normalizeDate(leave.startDate)) {
			throw new AppError(
				"Return date cannot be earlier than the leave start date",
				422,
				"RETURN_DATE_INVALID",
			);
		}

		if (returnDate > normalizeDate(leave.endDate)) {
			throw new AppError(
				"Return date cannot be after the leave end date",
				422,
				"RETURN_DATE_INVALID",
			);
		}

		const updated = await prisma.$transaction(async (tx) => {
			const nextLeave = await tx.leave.update({
				where: { id: leaveId },
				data: { returnDate },
			});

			await tx.auditLog.create({
				data: {
					action: "LEAVE_RETURN_MARKED",
					entityType: "leave",
					entityId: leaveId,
					userId: actorUserId,
					oldValue: {
						returnDate: leave.returnDate
							? dateKey(leave.returnDate)
							: null,
					},
					newValue: { returnDate: dateKey(returnDate) },
				},
			});

			return nextLeave;
		});

		return formatLeaveResponse(updated);
	}

	async setReturnDate(
		studentId: string,
		actorUserId: string,
		leaveId: string,
		returnDateInput: Date,
	) {
		const leave = await this.getLeaveById(leaveId);
		if (leave.studentId !== studentId) {
			throw new AppError("Leave not found", 404, "LEAVE_NOT_FOUND");
		}

		if (
			leave.status !== LeaveStatus.APPROVED &&
			leave.status !== LeaveStatus.AUTO_APPROVED
		) {
			throw new AppError(
				"Only approved leaves can be marked returned",
				409,
				"LEAVE_CANNOT_BE_RETURNED",
			);
		}

		const returnDate = normalizeDate(returnDateInput);
		if (
			returnDate < normalizeDate(leave.startDate) ||
			returnDate > normalizeDate(leave.endDate)
		) {
			throw new AppError(
				"Return date must fall within the approved leave window",
				422,
				"RETURN_DATE_INVALID",
			);
		}

		const updated = await prisma.$transaction(async (tx) => {
			const nextLeave = await tx.leave.update({
				where: { id: leaveId },
				data: { returnDate },
			});

			await tx.auditLog.create({
				data: {
					action: "LEAVE_RETURN_MARKED",
					entityType: "leave",
					entityId: leaveId,
					userId: actorUserId,
					oldValue: {
						returnDate: leave.returnDate
							? dateKey(leave.returnDate)
							: null,
					},
					newValue: { returnDate: dateKey(returnDate) },
				},
			});

			return nextLeave;
		});

		return formatLeaveResponse(updated);
	}

	async getPendingLeaves() {
		const leaves = await prisma.leave.findMany({
			where: {
				status: LeaveStatus.PENDING,
			},
			include: {
				student: {
					include: {
						user: {
							select: {
								id: true,
								email: true,
								firstName: true,
								lastName: true,
							},
						},
						messAssignments: {
							where: { isCurrent: true },
							include: {
								mess: { select: { id: true, name: true } },
							},
							take: 1,
						},
						hostelAssignments: {
							where: { isCurrent: true },
							include: {
								hostel: { select: { id: true, name: true } },
								room: {
									select: { id: true, roomNumber: true },
								},
							},
							take: 1,
						},
					},
				},
			},
			orderBy: [{ autoApproveAt: "asc" }, { appliedOn: "asc" }],
		});

		return {
			leaves: leaves.map((leave) => ({
				...formatLeaveResponse(leave),
				student: {
					id: leave.student.id,
					rollNumber: leave.student.rollNumber,
					firstName: leave.student.user.firstName,
					lastName: leave.student.user.lastName,
					email: leave.student.user.email,
				},
				currentMess: leave.student.messAssignments[0]?.mess ?? null,
				currentHostel: leave.student.hostelAssignments[0]
					? {
							id: leave.student.hostelAssignments[0].hostel.id,
							name: leave.student.hostelAssignments[0].hostel
								.name,
							roomNumber:
								leave.student.hostelAssignments[0].room
									.roomNumber,
						}
					: null,
			})),
		};
	}

	async approveLeave(wardenUserId: string, leaveId: string) {
		const leave = await this.getLeaveById(leaveId);
		if (leave.status !== LeaveStatus.PENDING) {
			throw new AppError(
				"Only pending leaves can be approved",
				409,
				"LEAVE_NOT_PENDING",
			);
		}

		const updated = await prisma.$transaction(async (tx) => {
			const nextLeave = await tx.leave.update({
				where: { id: leaveId },
				data: {
					status: LeaveStatus.APPROVED,
					actionedById: wardenUserId,
					actionedAt: new Date(),
				},
			});

			await tx.auditLog.create({
				data: {
					action: "LEAVE_APPROVED",
					entityType: "leave",
					entityId: leaveId,
					userId: wardenUserId,
					oldValue: { status: leave.status },
					newValue: { status: LeaveStatus.APPROVED },
				},
			});

			return nextLeave;
		});

		return formatLeaveResponse(updated);
	}

	async rejectLeave(
		wardenUserId: string,
		leaveId: string,
		rejectionReason: string,
	) {
		const leave = await this.getLeaveById(leaveId);
		if (leave.status !== LeaveStatus.PENDING) {
			throw new AppError(
				"Only pending leaves can be rejected",
				409,
				"LEAVE_NOT_PENDING",
			);
		}

		const updated = await prisma.$transaction(async (tx) => {
			const nextLeave = await tx.leave.update({
				where: { id: leaveId },
				data: {
					status: LeaveStatus.REJECTED,
					actionedById: wardenUserId,
					actionedAt: new Date(),
					rejectionReason,
				},
			});

			await tx.auditLog.create({
				data: {
					action: "LEAVE_REJECTED",
					entityType: "leave",
					entityId: leaveId,
					userId: wardenUserId,
					oldValue: { status: leave.status },
					newValue: { status: LeaveStatus.REJECTED, rejectionReason },
				},
			});

			return nextLeave;
		});

		return formatLeaveResponse(updated);
	}

	async autoApproveDueLeaves(now = new Date()) {
		const dueLeaves = await prisma.leave.findMany({
			where: {
				status: LeaveStatus.PENDING,
				autoApproveAt: { lte: now },
			},
			select: {
				id: true,
				studentId: true,
				status: true,
			},
		});

		let processed = 0;
		for (const leave of dueLeaves) {
			await prisma.$transaction(async (tx) => {
				await tx.leave.update({
					where: { id: leave.id },
					data: {
						status: LeaveStatus.AUTO_APPROVED,
						actionedAt: new Date(),
					},
				});

				await tx.auditLog.create({
					data: {
						action: "LEAVE_AUTO_APPROVED",
						entityType: "leave",
						entityId: leave.id,
						userId: null,
						oldValue: { status: LeaveStatus.PENDING },
						newValue: {
							status: LeaveStatus.AUTO_APPROVED,
							trigger: "scheduler",
						},
					},
				});
			});

			processed += 1;
		}

		return { success: true, processed };
	}
}

export const leavesService = new LeavesService();
