import * as bcrypt from "bcrypt";
import { prisma } from "../../infrastructure/database/prisma.js";
import { AppError } from "../../shared/errors/AppError.js";

/**
 * Admin Service - handles admin operations like CSV import
 */

export class WardenService {
	async getDashboardStats() {
		const [totalStudents, totalHostels, totalMesses, activeComplaints] =
			await Promise.all([
				prisma.student.count({
					where: { deletedAt: null, isActive: true },
				}),
				prisma.hostel.count({
					where: { deletedAt: null, isActive: true },
				}),
				prisma.mess.count({
					where: { deletedAt: null, isActive: true },
				}),
				prisma.complaint.count({ where: { status: "OPEN" } }),
			]);
		return {
			totalStudents,
			totalHostels,
			totalMesses,
			activeComplaints,
		};
	}

	async createHostel(input: { name: string; gender: "MALE" | "FEMALE" }) {
		const existing = await prisma.hostel.findUnique({
			where: { name: input.name },
		});
		if (existing) {
			throw new AppError(
				"Hostel name already exists",
				409,
				"DUPLICATE_HOSTEL",
			);
		}

		return prisma.hostel.create({
			data: {
				name: input.name,
				gender: input.gender,
			},
		});
	}

	async listHostels() {
		return prisma.hostel.findMany({
			where: { deletedAt: null },
			orderBy: { name: "asc" },
			include: {
				rooms: {
					where: { deletedAt: null },
					orderBy: { roomNumber: "asc" },
				},
			},
		});
	}

	async updateHostel(
		hostelId: string,
		input: {
			name?: string | undefined;
			gender?: "MALE" | "FEMALE" | undefined;
			isActive?: boolean | undefined;
		},
	) {
		const hostel = await prisma.hostel.findFirst({
			where: { id: hostelId, deletedAt: null },
		});
		if (!hostel) {
			throw new AppError("Hostel not found", 404, "HOSTEL_NOT_FOUND");
		}

		if (input.name && input.name !== hostel.name) {
			const duplicate = await prisma.hostel.findFirst({
				where: {
					name: input.name,
					deletedAt: null,
					id: { not: hostelId },
				},
			});
			if (duplicate) {
				throw new AppError(
					"Hostel name already exists",
					409,
					"DUPLICATE_HOSTEL",
				);
			}
		}

		if (input.gender && input.gender !== hostel.gender) {
			const activeAssignments = await prisma.hostelAssignment.count({
				where: { hostelId, isCurrent: true },
			});
			if (activeAssignments > 0) {
				throw new AppError(
					"Cannot change hostel gender while current assignments exist",
					409,
					"HOSTEL_HAS_ACTIVE_ASSIGNMENTS",
				);
			}
		}

		const nextActive = input.isActive ?? hostel.isActive;
		return prisma.hostel.update({
			where: { id: hostelId },
			data: {
				...(input.name ? { name: input.name } : {}),
				...(input.gender ? { gender: input.gender } : {}),
				isActive: nextActive,
				deletedAt: nextActive ? null : new Date(),
			},
		});
	}

	async createRoom(
		hostelId: string,
		input: { roomNumber: string; capacity: number },
	) {
		const hostel = await prisma.hostel.findFirst({
			where: { id: hostelId, deletedAt: null },
		});
		if (!hostel) {
			throw new AppError("Hostel not found", 404, "HOSTEL_NOT_FOUND");
		}

		const existing = await prisma.room.findFirst({
			where: {
				hostelId,
				roomNumber: input.roomNumber,
				deletedAt: null,
			},
		});
		if (existing) {
			throw new AppError(
				"Room already exists in this hostel",
				409,
				"DUPLICATE_ROOM",
			);
		}

		return prisma.room.create({
			data: {
				hostelId,
				roomNumber: input.roomNumber,
				capacity: input.capacity,
			},
		});
	}

	async updateRoom(
		roomId: string,
		input: {
			roomNumber?: string | undefined;
			capacity?: number | undefined;
			isActive?: boolean | undefined;
		},
	) {
		const room = await prisma.room.findFirst({
			where: { id: roomId, deletedAt: null },
		});
		if (!room) {
			throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
		}

		if (input.roomNumber && input.roomNumber !== room.roomNumber) {
			const duplicate = await prisma.room.findFirst({
				where: {
					hostelId: room.hostelId,
					roomNumber: input.roomNumber,
					deletedAt: null,
					id: { not: roomId },
				},
			});
			if (duplicate) {
				throw new AppError(
					"Room already exists in this hostel",
					409,
					"DUPLICATE_ROOM",
				);
			}
		}

		if (input.capacity) {
			const occupancy = await prisma.hostelAssignment.count({
				where: { roomId, isCurrent: true },
			});
			if (input.capacity < occupancy) {
				throw new AppError(
					"Room capacity cannot be less than current occupancy",
					409,
					"INVALID_ROOM_CAPACITY",
				);
			}
		}

		const nextActive = input.isActive ?? room.isActive;
		return prisma.room.update({
			where: { id: roomId },
			data: {
				...(input.roomNumber ? { roomNumber: input.roomNumber } : {}),
				...(input.capacity ? { capacity: input.capacity } : {}),
				isActive: nextActive,
				deletedAt: nextActive ? null : new Date(),
			},
		});
	}

	async createMess(input: {
		name: string;
		gender: "MALE" | "FEMALE";
		perDayCharge: number;
	}) {
		const existing = await prisma.mess.findUnique({
			where: { name: input.name },
		});
		if (existing) {
			throw new AppError(
				"Mess name already exists",
				409,
				"DUPLICATE_MESS",
			);
		}

		return prisma.mess.create({
			data: {
				name: input.name,
				gender: input.gender,
				perDayCharge: input.perDayCharge.toFixed(2),
			},
		});
	}

	async listMesses() {
		return prisma.mess.findMany({
			where: { deletedAt: null },
			orderBy: { name: "asc" },
		});
	}

	async updateMess(
		messId: string,
		input: {
			name?: string | undefined;
			gender?: "MALE" | "FEMALE" | undefined;
			perDayCharge?: number | undefined;
			isActive?: boolean | undefined;
		},
	) {
		const mess = await prisma.mess.findFirst({
			where: { id: messId, deletedAt: null },
		});
		if (!mess) {
			throw new AppError("Mess not found", 404, "MESS_NOT_FOUND");
		}

		if (input.name && input.name !== mess.name) {
			const duplicate = await prisma.mess.findFirst({
				where: {
					name: input.name,
					deletedAt: null,
					id: { not: messId },
				},
			});
			if (duplicate) {
				throw new AppError(
					"Mess name already exists",
					409,
					"DUPLICATE_MESS",
				);
			}
		}

		if (input.gender && input.gender !== mess.gender) {
			const activeAssignments = await prisma.messAssignment.count({
				where: { messId, isCurrent: true },
			});
			if (activeAssignments > 0) {
				throw new AppError(
					"Cannot change mess gender while current assignments exist",
					409,
					"MESS_HAS_ACTIVE_ASSIGNMENTS",
				);
			}
		}

		const nextActive = input.isActive ?? mess.isActive;
		return prisma.mess.update({
			where: { id: messId },
			data: {
				...(input.name ? { name: input.name } : {}),
				...(input.gender ? { gender: input.gender } : {}),
				...(input.perDayCharge !== undefined
					? { perDayCharge: input.perDayCharge.toFixed(2) }
					: {}),
				isActive: nextActive,
				deletedAt: nextActive ? null : new Date(),
			},
		});
	}

	async createHostelRentConfig(
		input: {
			hostelId: string;
			academicYear: string;
			semester: "FIRST" | "SECOND";
			amount: number;
			dueMonth: number;
		},
		createdById: string,
	) {
		const hostel = await prisma.hostel.findFirst({
			where: { id: input.hostelId, deletedAt: null },
		});
		if (!hostel) {
			throw new AppError("Hostel not found", 404, "HOSTEL_NOT_FOUND");
		}

		return prisma.hostelRentConfig.upsert({
			where: {
				hostelId_academicYear_semester: {
					hostelId: input.hostelId,
					academicYear: input.academicYear,
					semester: input.semester,
				},
			},
			update: {
				amount: input.amount.toFixed(2),
				dueMonth: input.dueMonth,
				createdById,
			},
			create: {
				hostelId: input.hostelId,
				academicYear: input.academicYear,
				semester: input.semester,
				amount: input.amount.toFixed(2),
				dueMonth: input.dueMonth,
				createdById,
			},
		});
	}

	async createWardenUser(input: {
		email: string;
		role: "WARDEN" | "MESS_INCHARGE";
		firstName: string;
		lastName: string;
		phone?: string | undefined;
		password?: string | undefined;
	}) {
		const existing = await prisma.user.findUnique({
			where: { email: input.email.toLowerCase() },
		});
		if (existing) {
			throw new AppError("Email already exists", 409, "DUPLICATE_EMAIL");
		}

		const plainPassword = input.password ?? `${input.firstName}@12345`;
		const passwordHash = await bcrypt.hash(plainPassword, 12);

		const user = await prisma.user.create({
			data: {
				email: input.email.toLowerCase(),
				passwordHash,
				role: input.role,
				firstName: input.firstName,
				lastName: input.lastName,
				...(input.phone ? { phone: input.phone } : {}),
				mustChangePwd: true,
				isActive: true,
			},
			select: {
				id: true,
				email: true,
				role: true,
				firstName: true,
				lastName: true,
				mustChangePwd: true,
			},
		});

		return {
			user,
			temporaryPassword: plainPassword,
		};
	}

	async assignInchargeToMess(input: {
		userId: string;
		messId: string;
		startDate: Date;
	}) {
		const [user, mess] = await Promise.all([
			prisma.user.findFirst({
				where: {
					id: input.userId,
					deletedAt: null,
					role: "MESS_INCHARGE",
					isActive: true,
				},
			}),
			prisma.mess.findFirst({
				where: { id: input.messId, deletedAt: null },
			}),
		]);

		if (!user) {
			throw new AppError(
				"Mess incharge user not found",
				404,
				"INCHARGE_NOT_FOUND",
			);
		}
		if (!mess) {
			throw new AppError("Mess not found", 404, "MESS_NOT_FOUND");
		}

		const previousAssignment = await prisma.inchargeAssignment.findFirst({
			where: { messId: input.messId, isCurrent: true },
			orderBy: { startDate: "desc" },
		});

		return prisma.$transaction(async (tx) => {
			if (previousAssignment) {
				await tx.inchargeAssignment.update({
					where: { id: previousAssignment.id },
					data: {
						isCurrent: false,
						endDate: new Date(
							input.startDate.getTime() - 24 * 60 * 60 * 1000,
						),
					},
				});
			}

			return tx.inchargeAssignment.create({
				data: {
					userId: input.userId,
					messId: input.messId,
					startDate: input.startDate,
					isCurrent: true,
				},
			});
		});
	}

	async listInchargeAssignments(messId: string) {
		return prisma.inchargeAssignment.findMany({
			where: { messId },
			orderBy: { startDate: "desc" },
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
		});
	}

	async endInchargeAssignment(assignmentId: string, endDate: Date) {
		const assignment = await prisma.inchargeAssignment.findUnique({
			where: { id: assignmentId },
		});
		if (!assignment) {
			throw new AppError(
				"Incharge assignment not found",
				404,
				"ASSIGNMENT_NOT_FOUND",
			);
		}

		if (!assignment.isCurrent) {
			throw new AppError(
				"Assignment already ended",
				409,
				"ASSIGNMENT_ALREADY_ENDED",
			);
		}

		if (endDate < assignment.startDate) {
			throw new AppError(
				"End date cannot be before assignment start date",
				422,
				"INVALID_END_DATE",
			);
		}

		return prisma.inchargeAssignment.update({
			where: { id: assignmentId },
			data: {
				isCurrent: false,
				endDate,
			},
		});
	}

	async importHostelsAndRooms(
		rows: Array<{
			hostel_name: string;
			gender: "MALE" | "FEMALE";
			room_number: string;
			capacity: number;
		}>,
	) {
		const seenRoomKey = new Set<string>();

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i]!;
			const duplicateRoomKey = `${row.hostel_name}::${row.room_number}`;

			if (seenRoomKey.has(duplicateRoomKey)) {
				throw new AppError(
					`Duplicate room mapping found in CSV at row ${i + 1}`,
					422,
					"CSV_VALIDATION_ERROR",
				);
			}

			seenRoomKey.add(duplicateRoomKey);
		}

		const result = await prisma.$transaction(async (tx) => {
			const hostelCache = new Map<
				string,
				{ id: string; name: string; gender: "MALE" | "FEMALE" }
			>();

			let createdHostels = 0;
			let createdRooms = 0;
			let skippedRooms = 0;

			for (const row of rows) {
				const hostelName = row.hostel_name.trim();
				const roomNumber = row.room_number.trim();

				let hostel = hostelCache.get(hostelName);

				if (!hostel) {
					const existing = await tx.hostel.findUnique({
						where: { name: hostelName },
						select: { id: true, name: true, gender: true },
					});

					if (existing) {
						if (existing.gender !== row.gender) {
							throw new AppError(
								`Gender mismatch for existing hostel '${hostelName}'`,
								422,
								"HOSTEL_GENDER_MISMATCH",
							);
						}

						hostel = {
							id: existing.id,
							name: existing.name,
							gender: existing.gender,
						};
					} else {
						const created = await tx.hostel.create({
							data: {
								name: hostelName,
								gender: row.gender,
							},
							select: { id: true, name: true, gender: true },
						});

						hostel = {
							id: created.id,
							name: created.name,
							gender: created.gender,
						};
						createdHostels++;
					}

					hostelCache.set(hostelName, hostel);
				}

				const existingRoom = await tx.room.findUnique({
					where: {
						hostelId_roomNumber: {
							hostelId: hostel.id,
							roomNumber,
						},
					},
					select: { id: true },
				});

				if (existingRoom) {
					skippedRooms++;
					continue;
				}

				await tx.room.create({
					data: {
						hostelId: hostel.id,
						roomNumber,
						capacity: row.capacity,
					},
				});

				createdRooms++;
			}

			return {
				importedRows: rows.length,
				createdHostels,
				createdRooms,
				skippedRooms,
			};
		});

		return {
			success: true,
			...result,
		};
	}

	/**
	 * Import students from CSV - bulk create users and students
	 */
	async importStudents(
		rows: Array<{
			roll_number: string;
			first_name: string;
			last_name: string;
			email: string;
			gender: "MALE" | "FEMALE";
			department?: string | undefined;
			academic_year: number;
			batch?: string | undefined;
		}>,
	) {
		const errors: Array<{ rowIndex: number; error: string }> = [];
		let successCount = 0;

		// Validate all rows first to give user complete feedback
		const emailSet = new Set<string>();
		const rollSet = new Set<string>();

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i]!;

			// Check for duplicates within the import
			if (emailSet.has(row.email.toLowerCase())) {
				errors.push({
					rowIndex: i + 1,
					error: "Duplicate email in import",
				});
				continue;
			}
			if (rollSet.has(row.roll_number)) {
				errors.push({
					rowIndex: i + 1,
					error: "Duplicate roll number in import",
				});
				continue;
			}

			emailSet.add(row.email.toLowerCase());
			rollSet.add(row.roll_number);

			// Check database for duplicates
			const existingEmail = await prisma.user.findUnique({
				where: { email: row.email.toLowerCase() },
			});
			if (existingEmail) {
				errors.push({
					rowIndex: i + 1,
					error: "Email already exists in system",
				});
				continue;
			}

			const existingStudent = await prisma.student.findUnique({
				where: { rollNumber: row.roll_number },
			});
			if (existingStudent) {
				errors.push({
					rowIndex: i + 1,
					error: "Roll number already exists in system",
				});
				continue;
			}
		}

		// If there are validation errors, return them before creating anything
		if (errors.length > 0) {
			throw new AppError(
				`Validation failed for ${errors.length} row(s)`,
				422,
				"IMPORT_VALIDATION_FAILED",
			);
		}

		// Bulk create: transaction ensures all-or-nothing
		try {
			await prisma.$transaction(async (tx) => {
				for (const row of rows) {
					const hashedPassword = await bcrypt.hash(
						row.roll_number,
						12,
					);

					const user = await tx.user.create({
						data: {
							email: row.email.toLowerCase(),
							passwordHash: hashedPassword,
							role: "STUDENT",
							firstName: row.first_name,
							lastName: row.last_name,
							isActive: true,
							mustChangePwd: true,
						},
					});

					await tx.student.create({
						data: {
							userId: user.id,
							rollNumber: row.roll_number,
							gender: row.gender,
							department: row.department ?? null,
							academicYear: row.academic_year,
							batch: row.batch ?? null,
							isActive: true,
						},
					});

					successCount++;
				}
			});
		} catch (error) {
			throw new AppError(
				"Bulk import failed. No records were committed.",
				500,
				"BULK_IMPORT_ERROR",
				true,
			);
		}

		return {
			success: true,
			imported: successCount,
			errors: errors.length > 0 ? errors : undefined,
		};
	}
}

export const wardenService = new WardenService();
