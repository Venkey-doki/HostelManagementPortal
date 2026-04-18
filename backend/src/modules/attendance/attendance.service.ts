import { prisma } from "../../infrastructure/database/prisma.js";
import { AppError } from "../../shared/errors/AppError.js";

type MealFlags = {
	breakfast: boolean;
	lunch: boolean;
	dinner: boolean;
};

type AttendanceRow = {
	studentId: string;
	breakfast: boolean;
	lunch: boolean;
	dinner: boolean;
};

export class AttendanceService {
	private normalizeDate(date: Date): Date {
		return new Date(
			Date.UTC(
				date.getUTCFullYear(),
				date.getUTCMonth(),
				date.getUTCDate(),
			),
		);
	}

	private dateKey(date: Date): string {
		return this.normalizeDate(date).toISOString().slice(0, 10);
	}

	private assertNotFuture(date: Date) {
		const todayKey = this.dateKey(new Date());
		if (this.dateKey(date) > todayKey) {
			throw new AppError(
				"Future attendance dates are not allowed",
				422,
				"FUTURE_DATE_NOT_ALLOWED",
			);
		}
	}

	private async resolveInchargeMess(userId: string, date: Date) {
		const assignment = await prisma.inchargeAssignment.findFirst({
			where: {
				userId,
				isCurrent: true,
				startDate: { lte: date },
				OR: [{ endDate: null }, { endDate: { gte: date } }],
			},
			select: { messId: true },
		});

		if (!assignment) {
			throw new AppError(
				"No active mess assignment found for incharge",
				403,
				"INCHARGE_ASSIGNMENT_NOT_FOUND",
			);
		}

		return assignment.messId;
	}

	private async ensureStudentBelongsToMessOnDate(
		studentId: string,
		messId: string,
		date: Date,
	) {
		const assignment = await prisma.messAssignment.findFirst({
			where: {
				studentId,
				messId,
				startDate: { lte: date },
				OR: [{ endDate: null }, { endDate: { gte: date } }],
			},
			select: { id: true },
		});

		if (!assignment) {
			throw new AppError(
				"Student is not assigned to this mess for the selected date",
				422,
				"STUDENT_MESS_ASSIGNMENT_MISSING",
			);
		}
	}

	private async ensureNotWaived(messId: string, date: Date) {
		const waiver = await prisma.messDayWaiver.findUnique({
			where: {
				messId_date: {
					messId,
					date,
				},
			},
		});

		if (waiver) {
			throw new AppError(
				"Attendance cannot be marked on a waived mess day",
				409,
				"MESS_DAY_WAIVED",
			);
		}
	}

	async getInchargeDailyRoster(inchargeUserId: string, date: Date) {
		const normalizedDate = this.normalizeDate(date);
		this.assertNotFuture(normalizedDate);

		const messId = await this.resolveInchargeMess(
			inchargeUserId,
			normalizedDate,
		);

		const [mess, assignments, attendanceRows, waiver] = await Promise.all([
			prisma.mess.findUnique({
				where: { id: messId },
				select: { id: true, name: true, gender: true },
			}),
			prisma.messAssignment.findMany({
				where: {
					messId,
					startDate: { lte: normalizedDate },
					OR: [
						{ endDate: null },
						{ endDate: { gte: normalizedDate } },
					],
				},
				include: {
					student: {
						include: {
							user: {
								select: {
									id: true,
									firstName: true,
									lastName: true,
									email: true,
									isActive: true,
								},
							},
						},
					},
				},
				orderBy: {
					student: { rollNumber: "asc" },
				},
			}),
			prisma.attendance.findMany({
				where: {
					messId,
					date: normalizedDate,
				},
				select: {
					studentId: true,
					breakfast: true,
					lunch: true,
					dinner: true,
				},
			}),
			prisma.messDayWaiver.findUnique({
				where: {
					messId_date: {
						messId,
						date: normalizedDate,
					},
				},
			}),
		]);

		if (!mess) {
			throw new AppError("Mess not found", 404, "MESS_NOT_FOUND");
		}

		const attendanceByStudent = new Map(
			attendanceRows.map((row) => [row.studentId, row]),
		);

		const students = assignments
			.filter((assignment) => assignment.student.user.isActive)
			.map((assignment) => {
				const row = attendanceByStudent.get(assignment.studentId);
				return {
					studentId: assignment.studentId,
					rollNumber: assignment.student.rollNumber,
					firstName: assignment.student.user.firstName,
					lastName: assignment.student.user.lastName,
					email: assignment.student.user.email,
					attendance: {
						breakfast: row?.breakfast ?? false,
						lunch: row?.lunch ?? false,
						dinner: row?.dinner ?? false,
					},
				};
			});

		return {
			date: this.dateKey(normalizedDate),
			mess,
			waiver: waiver
				? { date: this.dateKey(waiver.date), reason: waiver.reason }
				: null,
			students,
		};
	}

	async markSingleAttendance(
		inchargeUserId: string,
		input: {
			studentId: string;
			date: Date;
			breakfast: boolean;
			lunch: boolean;
			dinner: boolean;
		},
	) {
		const normalizedDate = this.normalizeDate(input.date);
		this.assertNotFuture(normalizedDate);

		const messId = await this.resolveInchargeMess(
			inchargeUserId,
			normalizedDate,
		);
		await this.ensureStudentBelongsToMessOnDate(
			input.studentId,
			messId,
			normalizedDate,
		);
		await this.ensureNotWaived(messId, normalizedDate);

		return prisma.attendance.upsert({
			where: {
				studentId_date: {
					studentId: input.studentId,
					date: normalizedDate,
				},
			},
			update: {
				messId,
				breakfast: input.breakfast,
				lunch: input.lunch,
				dinner: input.dinner,
				markedById: inchargeUserId,
			},
			create: {
				studentId: input.studentId,
				messId,
				date: normalizedDate,
				breakfast: input.breakfast,
				lunch: input.lunch,
				dinner: input.dinner,
				markedById: inchargeUserId,
			},
		});
	}

	async markBulkAttendance(
		inchargeUserId: string,
		input: {
			date: Date;
			rows: AttendanceRow[];
		},
	) {
		const normalizedDate = this.normalizeDate(input.date);
		this.assertNotFuture(normalizedDate);

		const messId = await this.resolveInchargeMess(
			inchargeUserId,
			normalizedDate,
		);
		await this.ensureNotWaived(messId, normalizedDate);

		const studentIds = Array.from(
			new Set(input.rows.map((row) => row.studentId)),
		);
		const assignments = await prisma.messAssignment.findMany({
			where: {
				studentId: { in: studentIds },
				messId,
				startDate: { lte: normalizedDate },
				OR: [{ endDate: null }, { endDate: { gte: normalizedDate } }],
			},
			select: { studentId: true },
		});

		const assignedStudents = new Set(
			assignments.map((assignment) => assignment.studentId),
		);
		const invalidStudents = studentIds.filter(
			(studentId) => !assignedStudents.has(studentId),
		);

		if (invalidStudents.length > 0) {
			throw new AppError(
				"Some students are not assigned to this mess for the selected date",
				422,
				"INVALID_STUDENT_ASSIGNMENTS",
			);
		}

		await prisma.$transaction(
			input.rows.map((row) =>
				prisma.attendance.upsert({
					where: {
						studentId_date: {
							studentId: row.studentId,
							date: normalizedDate,
						},
					},
					update: {
						messId,
						breakfast: row.breakfast,
						lunch: row.lunch,
						dinner: row.dinner,
						markedById: inchargeUserId,
					},
					create: {
						studentId: row.studentId,
						messId,
						date: normalizedDate,
						breakfast: row.breakfast,
						lunch: row.lunch,
						dinner: row.dinner,
						markedById: inchargeUserId,
					},
				}),
			),
		);

		return { success: true, updated: input.rows.length };
	}

	async setMessDayWaiver(
		inchargeUserId: string,
		input: { date: Date; reason?: string | undefined },
	) {
		const normalizedDate = this.normalizeDate(input.date);
		this.assertNotFuture(normalizedDate);

		const messId = await this.resolveInchargeMess(
			inchargeUserId,
			normalizedDate,
		);

		await prisma.$transaction([
			prisma.messDayWaiver.upsert({
				where: {
					messId_date: {
						messId,
						date: normalizedDate,
					},
				},
				update: {
					reason: input.reason ?? null,
					createdById: inchargeUserId,
				},
				create: {
					messId,
					date: normalizedDate,
					reason: input.reason ?? null,
					createdById: inchargeUserId,
				},
			}),
			prisma.attendance.deleteMany({
				where: {
					messId,
					date: normalizedDate,
				},
			}),
		]);

		return { success: true, messId, date: this.dateKey(normalizedDate) };
	}

	async removeMessDayWaiver(inchargeUserId: string, date: Date) {
		const normalizedDate = this.normalizeDate(date);
		this.assertNotFuture(normalizedDate);

		const messId = await this.resolveInchargeMess(
			inchargeUserId,
			normalizedDate,
		);

		await prisma.messDayWaiver.deleteMany({
			where: { messId, date: normalizedDate },
		});

		return { success: true, messId, date: this.dateKey(normalizedDate) };
	}

	async getStudentCalendar(studentId: string, month: string) {
		const [yearStr, monthStr] = month.split("-");
		const year = Number(yearStr);
		const monthIndex = Number(monthStr) - 1;

		const start = new Date(Date.UTC(year, monthIndex, 1));
		const end = new Date(Date.UTC(year, monthIndex + 1, 0));

		const [attendanceRows, assignments] = await Promise.all([
			prisma.attendance.findMany({
				where: {
					studentId,
					date: { gte: start, lte: end },
				},
				select: {
					date: true,
					messId: true,
					breakfast: true,
					lunch: true,
					dinner: true,
				},
			}),
			prisma.messAssignment.findMany({
				where: {
					studentId,
					startDate: { lte: end },
					OR: [{ endDate: null }, { endDate: { gte: start } }],
				},
				include: {
					mess: {
						select: { id: true, name: true },
					},
				},
				orderBy: { startDate: "asc" },
			}),
		]);

		const messIds = Array.from(
			new Set(assignments.map((assignment) => assignment.messId)),
		);
		const waivers =
			messIds.length > 0
				? await prisma.messDayWaiver.findMany({
						where: {
							messId: { in: messIds },
							date: { gte: start, lte: end },
						},
						select: { messId: true, date: true },
					})
				: [];

		const waiverKeys = new Set(
			waivers.map(
				(waiver) => `${waiver.messId}|${this.dateKey(waiver.date)}`,
			),
		);
		const attendanceByDate = new Map(
			attendanceRows.map((row) => [this.dateKey(row.date), row]),
		);

		const days: Array<{
			date: string;
			status: "PRESENT" | "ABSENT" | "WAIVED" | "NOT_MARKED";
			breakfast: boolean;
			lunch: boolean;
			dinner: boolean;
			messName: string | null;
		}> = [];

		for (
			let cursor = new Date(start.getTime());
			cursor <= end;
			cursor = new Date(
				Date.UTC(
					cursor.getUTCFullYear(),
					cursor.getUTCMonth(),
					cursor.getUTCDate() + 1,
				),
			)
		) {
			const key = this.dateKey(cursor);
			const activeAssignment = assignments.find(
				(assignment) =>
					assignment.startDate <= cursor &&
					(!assignment.endDate || assignment.endDate >= cursor),
			);

			const row = attendanceByDate.get(key);
			const waived =
				activeAssignment !== undefined &&
				waiverKeys.has(`${activeAssignment.messId}|${key}`);

			let status: "PRESENT" | "ABSENT" | "WAIVED" | "NOT_MARKED" =
				"NOT_MARKED";
			if (waived) {
				status = "WAIVED";
			} else if (row) {
				status =
					row.breakfast || row.lunch || row.dinner
						? "PRESENT"
						: "ABSENT";
			}

			days.push({
				date: key,
				status,
				breakfast: row?.breakfast ?? false,
				lunch: row?.lunch ?? false,
				dinner: row?.dinner ?? false,
				messName: activeAssignment?.mess.name ?? null,
			});
		}

		const summary = days.reduce(
			(acc, day) => {
				acc[day.status] += 1;
				return acc;
			},
			{ PRESENT: 0, ABSENT: 0, WAIVED: 0, NOT_MARKED: 0 },
		);

		return {
			month,
			summary,
			days,
		};
	}
}

export const attendanceService = new AttendanceService();
