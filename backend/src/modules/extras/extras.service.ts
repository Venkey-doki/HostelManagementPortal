import { prisma } from "../../infrastructure/database/prisma.js";
import { AppError } from "../../shared/errors/AppError.js";

type MessExtraItemInput = {
	name: string;
	unit: string;
	price: number;
};

type StudentExtraInput = {
	studentId: string;
	extraItemId: string;
	date: Date;
	quantity: number;
};

function normalizeDate(date: Date): Date {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);
}

function dateKey(date: Date): string {
	return normalizeDate(date).toISOString().slice(0, 10);
}

function monthBounds(month: string) {
	const [yearText, monthText] = month.split("-");
	const year = Number(yearText);
	const monthIndex = Number(monthText) - 1;
	return {
		start: new Date(Date.UTC(year, monthIndex, 1)),
		end: new Date(Date.UTC(year, monthIndex + 1, 0)),
	};
}

export class ExtrasService {
	private async resolveActiveStudent(studentId: string) {
		const student = await prisma.student.findFirst({
			where: { id: studentId, deletedAt: null, isActive: true },
			select: { id: true, rollNumber: true },
		});

		if (!student) {
			throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
		}

		return student;
	}

	private async resolveStudentMessOnDate(studentId: string, date: Date) {
		const assignment = await prisma.messAssignment.findFirst({
			where: {
				studentId,
				isCurrent: true,
				startDate: { lte: date },
				OR: [{ endDate: null }, { endDate: { gte: date } }],
			},
			include: {
				mess: { select: { id: true, name: true } },
			},
		});

		if (!assignment) {
			throw new AppError(
				"Student is not assigned to a mess for the selected date",
				422,
				"STUDENT_MESS_ASSIGNMENT_MISSING",
			);
		}

		return assignment;
	}

	private async resolveInchargeMess(userId: string) {
		const assignment = await prisma.inchargeAssignment.findFirst({
			where: {
				userId,
				isCurrent: true,
			},
			select: {
				messId: true,
				mess: { select: { id: true, name: true } },
			},
		});

		if (!assignment) {
			throw new AppError(
				"No active mess assignment found for incharge",
				403,
				"INCHARGE_ASSIGNMENT_NOT_FOUND",
			);
		}

		return assignment;
	}

	private assertNotFuture(date: Date) {
		if (dateKey(date) > dateKey(new Date())) {
			throw new AppError(
				"Future dates are not allowed",
				422,
				"FUTURE_DATE_NOT_ALLOWED",
			);
		}
	}

	async listMessExtraItems(messId: string) {
		const mess = await prisma.mess.findFirst({
			where: { id: messId, deletedAt: null },
			select: { id: true, name: true, gender: true, isActive: true },
		});

		if (!mess) {
			throw new AppError("Mess not found", 404, "MESS_NOT_FOUND");
		}

		const items = await prisma.messExtraItem.findMany({
			where: { messId },
			orderBy: [{ isActive: "desc" }, { name: "asc" }],
		});

		return {
			mess,
			items: items.map((item) => ({
				...item,
				price: item.price.toString(),
			})),
		};
	}

	async createMessExtraItem(messId: string, input: MessExtraItemInput) {
		const mess = await prisma.mess.findFirst({
			where: { id: messId, deletedAt: null },
			select: { id: true },
		});

		if (!mess) {
			throw new AppError("Mess not found", 404, "MESS_NOT_FOUND");
		}

		const duplicate = await prisma.messExtraItem.findFirst({
			where: { messId, name: input.name },
		});

		if (duplicate) {
			throw new AppError(
				"Extra item already exists for this mess",
				409,
				"DUPLICATE_EXTRA_ITEM",
			);
		}

		const created = await prisma.messExtraItem.create({
			data: {
				messId,
				name: input.name,
				unit: input.unit,
				price: input.price.toFixed(2),
			},
		});

		return {
			...created,
			price: created.price.toString(),
		};
	}

	async addStudentExtra(actorUserId: string, input: StudentExtraInput) {
		const date = normalizeDate(input.date);
		this.assertNotFuture(date);

		const [student, extraItem] = await Promise.all([
			this.resolveActiveStudent(input.studentId),
			prisma.messExtraItem.findFirst({
				where: { id: input.extraItemId, isActive: true },
				include: { mess: { select: { id: true, name: true } } },
			}),
		]);

		if (!extraItem) {
			throw new AppError(
				"Extra item not found",
				404,
				"EXTRA_ITEM_NOT_FOUND",
			);
		}

		const assignment = await this.resolveStudentMessOnDate(
			student.id,
			date,
		);
		const inchargeAssignment = await this.resolveInchargeMess(actorUserId);

		if (
			assignment.messId !== extraItem.messId ||
			inchargeAssignment.messId !== extraItem.messId
		) {
			throw new AppError(
				"Extra item does not belong to the selected mess/date",
				422,
				"EXTRA_MESS_MISMATCH",
			);
		}

		const created = await prisma.$transaction(async (tx) => {
			const extra = await tx.studentExtra.create({
				data: {
					studentId: student.id,
					messId: extraItem.messId,
					extraItemId: extraItem.id,
					date,
					quantity: input.quantity.toFixed(2),
					unitPrice: extraItem.price,
					addedById: actorUserId,
				},
				include: {
					extraItem: { select: { id: true, name: true, unit: true } },
					student: { select: { id: true, rollNumber: true } },
					mess: { select: { id: true, name: true } },
				},
			});

			await tx.auditLog.create({
				data: {
					action: "STUDENT_EXTRA_ADDED",
					entityType: "student_extra",
					entityId: extra.id,
					userId: actorUserId,
					newValue: {
						studentId: student.id,
						extraItemId: extraItem.id,
						date: dateKey(date),
						quantity: input.quantity,
						unitPrice: extraItem.price.toString(),
					},
				},
			});

			return extra;
		});

		return {
			...created,
			quantity: created.quantity.toString(),
			unitPrice: created.unitPrice.toString(),
		};
	}

	async getStudentBillingPreview(studentId: string, month: string) {
		const student = await this.resolveActiveStudent(studentId);
		const { start, end } = monthBounds(month);

		const extras = await prisma.studentExtra.findMany({
			where: {
				studentId: student.id,
				date: { gte: start, lte: end },
			},
			include: {
				extraItem: { select: { id: true, name: true, unit: true } },
				mess: { select: { id: true, name: true } },
			},
			orderBy: [{ date: "asc" }, { createdAt: "asc" }],
		});

		const entries = extras.map((extra) => {
			const quantity = Number(extra.quantity);
			const unitPrice = Number(extra.unitPrice);
			return {
				id: extra.id,
				date: dateKey(extra.date),
				name: extra.extraItem.name,
				unit: extra.extraItem.unit,
				quantity,
				unitPrice,
				amount: quantity * unitPrice,
				messName: extra.mess.name,
			};
		});

		const summary = entries.reduce(
			(acc, entry) => {
				acc.totalAmount += entry.amount;
				acc.totalQuantity += entry.quantity;
				return acc;
			},
			{ totalAmount: 0, totalQuantity: 0 },
		);

		return {
			student: { id: student.id, rollNumber: student.rollNumber },
			month,
			entries,
			summary: {
				...summary,
				count: entries.length,
			},
		};
	}
}

export const extrasService = new ExtrasService();
