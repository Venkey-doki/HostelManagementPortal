import { prisma } from "../../infrastructure/database/prisma.js";
import { AppError } from "../../shared/errors/AppError.js";
import { billingService } from "../billing/billing.service.js";

interface ListStudentsInput {
	page: number;
	limit: number;
	search?: string;
	isActive?: boolean;
}

interface AssignHostelInput {
	hostelId: string;
	roomId: string;
	startDate: Date;
}

interface AssignMessInput {
	messId: string;
	startDate: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function addMonths(date: Date, months: number): Date {
	const next = new Date(date.getTime());
	next.setUTCMonth(next.getUTCMonth() + months);
	return next;
}

function toIsoDate(value: Date | null | undefined): string | null {
	return value ? value.toISOString().slice(0, 10) : null;
}

export class StudentsService {
	private async getActiveStudent(studentId: string) {
		const student = await prisma.student.findFirst({
			where: { id: studentId, deletedAt: null, isActive: true },
			include: {
				user: {
					select: {
						id: true,
						email: true,
						firstName: true,
						lastName: true,
						phone: true,
					},
				},
			},
		});

		if (!student) {
			throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
		}

		return student;
	}

	private async getCurrentAssignments(studentId: string) {
		const [hostelAssignment, messAssignment] = await Promise.all([
			prisma.hostelAssignment.findFirst({
				where: { studentId, isCurrent: true },
				include: {
					hostel: { select: { id: true, name: true, gender: true } },
					room: {
						select: { id: true, roomNumber: true, capacity: true },
					},
				},
				orderBy: { startDate: "desc" },
			}),
			prisma.messAssignment.findFirst({
				where: { studentId, isCurrent: true },
				include: {
					mess: {
						select: { id: true, name: true, perDayCharge: true },
					},
				},
				orderBy: { startDate: "desc" },
			}),
		]);

		return { hostelAssignment, messAssignment };
	}

	async getSelfProfile(studentId: string) {
		const student = await this.getActiveStudent(studentId);
		const [assignments, bills] = await Promise.all([
			this.getCurrentAssignments(studentId),
			billingService.getStudentBills(studentId),
		]);

		const balanceDue = bills.bills.reduce(
			(total: number, bill: { balanceDue: unknown }) =>
				total + Number(bill.balanceDue),
			0,
		);
		const currentBill = bills.bills[0] ?? null;
		const nextHostelChangeAt = assignments.hostelAssignment
			? addMonths(assignments.hostelAssignment.startDate, 6)
			: null;
		const canChangeHostel =
			!nextHostelChangeAt || new Date() >= nextHostelChangeAt;

		return {
			student: {
				id: student.id,
				rollNumber: student.rollNumber,
				gender: student.gender,
				department: student.department,
				academicYear: student.academicYear,
				batch: student.batch,
				isActive: student.isActive,
				user: student.user,
			},
			hostelAssignment: assignments.hostelAssignment
				? {
						id: assignments.hostelAssignment.id,
						hostel: assignments.hostelAssignment.hostel,
						room: assignments.hostelAssignment.room,
						startDate:
							assignments.hostelAssignment.startDate.toISOString(),
						endDate: toIsoDate(
							assignments.hostelAssignment.endDate,
						),
						nextEligibleChangeAt: toIsoDate(nextHostelChangeAt),
						canChangeHostel,
					}
				: null,
			messAssignment: assignments.messAssignment
				? {
						id: assignments.messAssignment.id,
						mess: assignments.messAssignment.mess,
						startDate:
							assignments.messAssignment.startDate.toISOString(),
					}
				: null,
			billing: {
				totalBills: bills.totalBills,
				balanceDue: balanceDue.toFixed(2),
				latestBill: currentBill,
			},
		};
	}

	async updateSelfProfile(
		studentId: string,
		input: {
			phone?: string | null | undefined;
			department?: string | null | undefined;
			batch?: string | null | undefined;
		},
	) {
		const student = await this.getActiveStudent(studentId);
		const user = await prisma.user.update({
			where: { id: student.userId },
			data: {
				...(input.phone !== undefined
					? { phone: input.phone || null }
					: {}),
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				phone: true,
			},
		});

		const updatedStudent = await prisma.student.update({
			where: { id: studentId },
			data: {
				...(input.department !== undefined
					? { department: input.department || null }
					: {}),
				...(input.batch !== undefined
					? { batch: input.batch || null }
					: {}),
			},
			select: {
				id: true,
				rollNumber: true,
				gender: true,
				department: true,
				academicYear: true,
				batch: true,
				isActive: true,
			},
		});

		return { student: updatedStudent, user };
	}
	async listStudents(input: ListStudentsInput) {
		const skip = (input.page - 1) * input.limit;

		const where = {
			deletedAt: null,
			...(input.isActive !== undefined
				? { isActive: input.isActive }
				: {}),
			...(input.search
				? {
						OR: [
							{
								rollNumber: {
									contains: input.search,
									mode: "insensitive" as const,
								},
							},
							{
								user: {
									firstName: {
										contains: input.search,
										mode: "insensitive" as const,
									},
								},
							},
							{
								user: {
									lastName: {
										contains: input.search,
										mode: "insensitive" as const,
									},
								},
							},
							{
								user: {
									email: {
										contains: input.search,
										mode: "insensitive" as const,
									},
								},
							},
						],
					}
				: {}),
		};

		const [total, students] = await Promise.all([
			prisma.student.count({ where }),
			prisma.student.findMany({
				where,
				skip,
				take: input.limit,
				orderBy: { createdAt: "desc" },
				include: {
					user: {
						select: {
							id: true,
							email: true,
							firstName: true,
							lastName: true,
							isActive: true,
						},
					},
					hostelAssignments: {
						where: { isCurrent: true },
						include: { hostel: true, room: true },
						take: 1,
					},
					messAssignments: {
						where: { isCurrent: true },
						include: { mess: true },
						take: 1,
					},
				},
			}),
		]);

		return {
			data: students,
			meta: {
				total,
				page: input.page,
				limit: input.limit,
				totalPages: Math.ceil(total / input.limit),
			},
		};
	}

	async assignHostel(
		studentId: string,
		input: AssignHostelInput,
		actorId: string,
	) {
		const student = await prisma.student.findFirst({
			where: { id: studentId, deletedAt: null, isActive: true },
		});
		if (!student) {
			throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
		}

		const [hostel, room] = await Promise.all([
			prisma.hostel.findFirst({
				where: { id: input.hostelId, deletedAt: null, isActive: true },
			}),
			prisma.room.findFirst({
				where: { id: input.roomId, deletedAt: null, isActive: true },
			}),
		]);

		if (!hostel) {
			throw new AppError("Hostel not found", 404, "HOSTEL_NOT_FOUND");
		}
		if (!room) {
			throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
		}
		if (room.hostelId !== hostel.id) {
			throw new AppError(
				"Room does not belong to the selected hostel",
				422,
				"ROOM_HOSTEL_MISMATCH",
			);
		}
		if (hostel.gender !== student.gender) {
			throw new AppError(
				"Student gender does not match hostel gender",
				422,
				"HOSTEL_GENDER_MISMATCH",
			);
		}

		const occupancy = await prisma.hostelAssignment.count({
			where: {
				roomId: room.id,
				isCurrent: true,
				student: {
					deletedAt: null,
					isActive: true,
				},
			},
		});

		if (occupancy >= room.capacity) {
			throw new AppError(
				"Room capacity is full",
				409,
				"ROOM_CAPACITY_FULL",
			);
		}

		const previous = await prisma.hostelAssignment.findFirst({
			where: { studentId, isCurrent: true },
			orderBy: { startDate: "desc" },
		});

		const assignment = await prisma.$transaction(async (tx: any) => {
			if (previous) {
				await tx.hostelAssignment.update({
					where: { id: previous.id },
					data: {
						isCurrent: false,
						endDate: new Date(input.startDate.getTime() - DAY_MS),
					},
				});
			}

			return tx.hostelAssignment.create({
				data: {
					studentId,
					hostelId: input.hostelId,
					roomId: input.roomId,
					startDate: input.startDate,
					isCurrent: true,
					createdById: actorId,
				},
				include: {
					hostel: true,
					room: true,
				},
			});
		});

		return assignment;
	}

	async assignMess(
		studentId: string,
		input: AssignMessInput,
		actorId: string,
	) {
		const student = await prisma.student.findFirst({
			where: { id: studentId, deletedAt: null, isActive: true },
		});
		if (!student) {
			throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
		}

		const mess = await prisma.mess.findFirst({
			where: { id: input.messId, deletedAt: null, isActive: true },
		});
		if (!mess) {
			throw new AppError("Mess not found", 404, "MESS_NOT_FOUND");
		}

		if (mess.gender !== student.gender) {
			throw new AppError(
				"Student gender does not match mess gender",
				422,
				"MESS_GENDER_MISMATCH",
			);
		}

		const previous = await prisma.messAssignment.findFirst({
			where: { studentId, isCurrent: true },
			orderBy: { startDate: "desc" },
		});

		const assignment = await prisma.$transaction(async (tx: any) => {
			if (previous) {
				await tx.messAssignment.update({
					where: { id: previous.id },
					data: {
						isCurrent: false,
						endDate: new Date(input.startDate.getTime() - DAY_MS),
					},
				});
			}

			return tx.messAssignment.create({
				data: {
					studentId,
					messId: input.messId,
					startDate: input.startDate,
					isCurrent: true,
					createdById: actorId,
				},
				include: {
					mess: true,
				},
			});
		});

		return assignment;
	}

	async listAssignmentHistory(studentId: string) {
		const student = await prisma.student.findFirst({
			where: { id: studentId, deletedAt: null },
		});
		if (!student) {
			throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
		}

		const [hostelHistory, messHistory] = await Promise.all([
			prisma.hostelAssignment.findMany({
				where: { studentId },
				orderBy: { startDate: "desc" },
				include: { hostel: true, room: true },
			}),
			prisma.messAssignment.findMany({
				where: { studentId },
				orderBy: { startDate: "desc" },
				include: { mess: true },
			}),
		]);

		return {
			hostelAssignments: hostelHistory,
			messAssignments: messHistory,
		};
	}

	async endCurrentHostelAssignment(studentId: string, endDate: Date) {
		const assignment = await prisma.hostelAssignment.findFirst({
			where: { studentId, isCurrent: true },
			orderBy: { startDate: "desc" },
		});

		if (!assignment) {
			throw new AppError(
				"No current hostel assignment found",
				404,
				"ASSIGNMENT_NOT_FOUND",
			);
		}
		if (endDate < assignment.startDate) {
			throw new AppError(
				"End date cannot be before assignment start date",
				422,
				"INVALID_END_DATE",
			);
		}

		return prisma.hostelAssignment.update({
			where: { id: assignment.id },
			data: {
				isCurrent: false,
				endDate,
			},
			include: {
				hostel: true,
				room: true,
			},
		});
	}

	async endCurrentMessAssignment(studentId: string, endDate: Date) {
		const assignment = await prisma.messAssignment.findFirst({
			where: { studentId, isCurrent: true },
			orderBy: { startDate: "desc" },
		});

		if (!assignment) {
			throw new AppError(
				"No current mess assignment found",
				404,
				"ASSIGNMENT_NOT_FOUND",
			);
		}
		if (endDate < assignment.startDate) {
			throw new AppError(
				"End date cannot be before assignment start date",
				422,
				"INVALID_END_DATE",
			);
		}

		return prisma.messAssignment.update({
			where: { id: assignment.id },
			data: {
				isCurrent: false,
				endDate,
			},
			include: {
				mess: true,
			},
		});
	}

	/**
	 * Student Self-Assignment Methods
	 */
	async getAvailableHostels(studentId: string) {
		// Get student info to match gender
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			select: { gender: true, isActive: true },
		});

		if (!student) {
			throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
		}

		if (!student.isActive) {
			throw new AppError(
				"Inactive students cannot self-assign",
				403,
				"STUDENT_INACTIVE",
			);
		}

		// Get all hostels matching student's gender with available rooms
		const hostels = await prisma.hostel.findMany({
			where: {
				gender: student.gender,
				isActive: true,
				deletedAt: null,
				messMapping: {
					isActive: true,
				},
			},
			select: {
				id: true,
				name: true,
				gender: true,
				messMapping: {
					select: {
						mess: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
			},
			orderBy: { name: "asc" },
		});

		// Enrich with room availability
		const enriched = await Promise.all(
			hostels.map(async (hostel: any) => {
				const rooms = await prisma.room.findMany({
					where: {
						hostelId: hostel.id,
						isActive: true,
					},
					select: { id: true },
				});

				const occupiedCount = await prisma.hostelAssignment.count({
					where: {
						hostelId: hostel.id,
						isCurrent: true,
					},
				});

				return {
					...hostel,
					availableRoomsCount: rooms.length,
					currentStudentsCount: occupiedCount,
					assignedMess: hostel.messMapping?.mess || null,
				};
			}),
		);

		return enriched.filter((h: any) => h.availableRoomsCount > 0);
	}

	async getHostelRooms(hostelId: string) {
		// Verify hostel exists and is active
		const hostel = await prisma.hostel.findUnique({
			where: { id: hostelId },
			select: {
				id: true,
				name: true,
				isActive: true,
				deletedAt: true,
			},
		});

		if (!hostel || !hostel.isActive || hostel.deletedAt) {
			throw new AppError(
				"Hostel not found or inactive",
				404,
				"HOSTEL_NOT_FOUND",
			);
		}

		// Get all active rooms with current occupancy
		const rooms = await prisma.room.findMany({
			where: {
				hostelId,
				isActive: true,
			},
			select: {
				id: true,
				roomNumber: true,
				capacity: true,
			},
			orderBy: { roomNumber: "asc" },
		});

		// Enrich with occupancy info
		const enriched = await Promise.all(
			rooms.map(async (room: any) => {
				const occupiedCount = await prisma.hostelAssignment.count({
					where: {
						roomId: room.id,
						isCurrent: true,
					},
				});

				return {
					...room,
					occupiedCount,
					availableSeats: room.capacity - occupiedCount,
					isFull: occupiedCount >= room.capacity,
				};
			}),
		);

		return enriched.filter((r: any) => !r.isFull);
	}

	async studentSelfAssignHostelRoom(
		studentId: string,
		actorUserId: string,
		hostelId: string,
		roomId: string,
		startDate: Date,
	) {
		// Verify student exists and is active
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			select: {
				id: true,
				gender: true,
				isActive: true,
				hostelAssignments: {
					where: { isCurrent: true },
				},
			},
		});

		if (!student) {
			throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
		}

		if (!student.isActive) {
			throw new AppError(
				"Inactive students cannot self-assign",
				403,
				"STUDENT_INACTIVE",
			);
		}

		if (student.hostelAssignments.length > 0) {
			throw new AppError(
				"Student already has an active hostel assignment",
				409,
				"ASSIGNMENT_ALREADY_EXISTS",
			);
		}

		// Verify hostel exists, is active, and matches gender
		const hostel = await prisma.hostel.findUnique({
			where: { id: hostelId },
			select: {
				id: true,
				name: true,
				gender: true,
				isActive: true,
				deletedAt: true,
				messMapping: {
					select: {
						messId: true,
						mess: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
			},
		});

		if (!hostel || !hostel.isActive || hostel.deletedAt) {
			throw new AppError(
				"Hostel not found or inactive",
				404,
				"HOSTEL_NOT_FOUND",
			);
		}

		if (hostel.gender !== student.gender) {
			throw new AppError(
				"Gender mismatch between student and hostel",
				422,
				"GENDER_MISMATCH",
			);
		}

		if (!hostel.messMapping) {
			throw new AppError(
				"Hostel does not have a mess assigned yet",
				422,
				"NO_MESS_ASSIGNED",
			);
		}

		// Verify room exists, is active, and belongs to hostel
		const room = await prisma.room.findUnique({
			where: { id: roomId },
			select: {
				id: true,
				hostelId: true,
				roomNumber: true,
				capacity: true,
				isActive: true,
			},
		});

		if (!room || !room.isActive) {
			throw new AppError(
				"Room not found or inactive",
				404,
				"ROOM_NOT_FOUND",
			);
		}

		if (room.hostelId !== hostelId) {
			throw new AppError(
				"Room does not belong to the selected hostel",
				422,
				"ROOM_HOSTEL_MISMATCH",
			);
		}

		// Check room capacity
		const occupiedCount = await prisma.hostelAssignment.count({
			where: {
				roomId,
				isCurrent: true,
			},
		});

		if (occupiedCount >= room.capacity) {
			throw new AppError("Room is full", 409, "ROOM_FULL");
		}

		// Assign hostel and room in transaction
		const hostelAssignment = await prisma.$transaction(async (tx: any) => {
			// Create hostel assignment
			const assignment = await tx.hostelAssignment.create({
				data: {
					studentId,
					hostelId,
					roomId,
					startDate,
					isCurrent: true,
					createdById: actorUserId,
				},
				include: {
					hostel: true,
					room: true,
				},
			});

			// Auto-assign mess from hostel mapping
			await tx.messAssignment.create({
				data: {
					studentId,
					messId: hostel.messMapping!.messId,
					startDate,
					isCurrent: true,
					createdById: actorUserId,
					autoAssigned: true,
				},
			});

			return assignment;
		});

		return {
			hostelAssignment,
			autoAssignedMess: hostel.messMapping.mess,
		};
	}

	async studentSelfChangeHostelRoom(
		studentId: string,
		actorUserId: string,
		hostelId: string,
		roomId: string,
		startDate: Date,
	) {
		const student = await prisma.student.findUnique({
			where: { id: studentId },
			select: {
				id: true,
				gender: true,
				isActive: true,
				hostelAssignments: {
					where: { isCurrent: true },
					orderBy: { startDate: "desc" },
					select: { id: true, startDate: true },
				},
				messAssignments: {
					where: { isCurrent: true },
					orderBy: { startDate: "desc" },
					select: { id: true },
				},
			},
		});

		if (!student) {
			throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
		}

		if (!student.isActive) {
			throw new AppError(
				"Inactive students cannot self-assign",
				403,
				"STUDENT_INACTIVE",
			);
		}

		const currentAssignment = student.hostelAssignments[0] ?? null;
		if (currentAssignment) {
			const nextEligibleDate = addMonths(currentAssignment.startDate, 6);
			if (new Date() < nextEligibleDate) {
				throw new AppError(
					"You can change hostel and room only once every 6 months. Please contact the warden for a manual change.",
					409,
					"HOSTEL_CHANGE_COOLDOWN_ACTIVE",
				);
			}
		}

		const hostel = await prisma.hostel.findUnique({
			where: { id: hostelId },
			select: {
				id: true,
				name: true,
				gender: true,
				isActive: true,
				deletedAt: true,
				messMapping: {
					select: {
						messId: true,
						mess: {
							select: {
								id: true,
								name: true,
								perDayCharge: true,
							},
						},
					},
				},
			},
		});

		if (!hostel || !hostel.isActive || hostel.deletedAt) {
			throw new AppError(
				"Hostel not found or inactive",
				404,
				"HOSTEL_NOT_FOUND",
			);
		}

		if (hostel.gender !== student.gender) {
			throw new AppError(
				"Gender mismatch between student and hostel",
				422,
				"GENDER_MISMATCH",
			);
		}

		if (!hostel.messMapping) {
			throw new AppError(
				"Hostel does not have a mess assigned yet",
				422,
				"NO_MESS_ASSIGNED",
			);
		}

		const room = await prisma.room.findUnique({
			where: { id: roomId },
			select: {
				id: true,
				hostelId: true,
				roomNumber: true,
				capacity: true,
				isActive: true,
			},
		});

		if (!room || !room.isActive) {
			throw new AppError(
				"Room not found or inactive",
				404,
				"ROOM_NOT_FOUND",
			);
		}

		if (room.hostelId !== hostelId) {
			throw new AppError(
				"Room does not belong to the selected hostel",
				422,
				"ROOM_HOSTEL_MISMATCH",
			);
		}

		const occupiedCount = await prisma.hostelAssignment.count({
			where: { roomId, isCurrent: true },
		});

		if (occupiedCount >= room.capacity) {
			throw new AppError("Room is full", 409, "ROOM_FULL");
		}

		const newStartDate = startDate;
		const previousEndDate = new Date(newStartDate.getTime() - DAY_MS);

		const assignment = await prisma.$transaction(async (tx: any) => {
			if (currentAssignment) {
				await tx.hostelAssignment.update({
					where: { id: currentAssignment.id },
					data: { isCurrent: false, endDate: previousEndDate },
				});
			}

			const currentMessAssignment = student.messAssignments[0] ?? null;
			if (currentMessAssignment) {
				await tx.messAssignment.update({
					where: { id: currentMessAssignment.id },
					data: { isCurrent: false, endDate: previousEndDate },
				});
			}

			const hostelAssignment = await tx.hostelAssignment.create({
				data: {
					studentId,
					hostelId,
					roomId,
					startDate: newStartDate,
					isCurrent: true,
					createdById: actorUserId,
				},
				include: {
					hostel: true,
					room: true,
				},
			});

			await tx.messAssignment.create({
				data: {
					studentId,
					messId: hostel.messMapping!.messId,
					startDate: newStartDate,
					isCurrent: true,
					createdById: actorUserId,
					autoAssigned: true,
				},
			});

			return hostelAssignment;
		});

		return {
			hostelAssignment: assignment,
			autoAssignedMess: hostel.messMapping!.mess,
		};
	}
}

export const studentsService = new StudentsService();
