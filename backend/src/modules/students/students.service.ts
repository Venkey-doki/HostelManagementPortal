import { prisma } from "../../infrastructure/database/prisma.js";
import { AppError } from "../../shared/errors/AppError.js";

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

export class StudentsService {
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

		const assignment = await prisma.$transaction(async (tx) => {
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

		const assignment = await prisma.$transaction(async (tx) => {
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
}

export const studentsService = new StudentsService();
