import {
	BillLineItemType,
	BillStatus,
	LeaveStatus,
} from "../../../generated/prisma/enums.js";
import { redis } from "../../infrastructure/cache/redis.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { AppError } from "../../shared/errors/AppError.js";
import {
	calculateBillingDraft,
	getAcademicYearForDate,
	getBillingMonthKey,
	getBillingPeriod,
	type BillingContext,
	type BillingDraft,
	type BillingStudent,
} from "./billing.engine.js";

type GenerateBillingOptions = {
	month: string;
	studentId?: string;
	actorUserId?: string | null;
};

type BillListEntry = {
	id: string;
	billingMonth: string;
	hostelRent: string;
	messCharges: string;
	extrasTotal: string;
	totalAmount: string;
	amountPaid: string;
	balanceDue: string;
	status: BillStatus;
	chargeableDays: number;
	waivedDays: number;
	totalDays: number;
	generatedAt: string | null;
	createdAt: string;
};

type BillDetail = BillListEntry & {
	student: BillingStudent;
	lineItems: Array<{
		id: string;
		type: BillLineItemType;
		description: string;
		date: string | null;
		quantity: string;
		unitPrice: string;
		amount: string;
		referenceId: string | null;
	}>;
	payments: Array<{
		id: string;
		amount: string;
		paymentDate: string;
		referenceNumber: string;
		status: string;
	}>;
};

function normalizeDate(date: Date): Date {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);
}

function dateKey(date: Date): string {
	return normalizeDate(date).toISOString().slice(0, 10);
}

function parseMonth(month: string) {
	return getBillingPeriod(month);
}

function toDecimalString(value: number | string | null | undefined): string {
	if (value === null || value === undefined) {
		return "0.00";
	}

	if (typeof value === "string") {
		return Number(value).toFixed(2);
	}

	return value.toFixed(2);
}

function getCacheKey(studentId: string, month: string) {
	return `bill:${studentId}:${month}`;
}

function getDetailCacheKey(billId: string) {
	return `bill-detail:${billId}`;
}

function getLockKey(month: string) {
	return `lock:billing:${month}`;
}

function mapBillListEntry(bill: {
	id: string;
	billingMonth: Date;
	hostelRent: unknown;
	messCharges: unknown;
	extrasTotal: unknown;
	totalAmount: unknown;
	amountPaid: unknown;
	balanceDue: unknown;
	status: BillStatus | null;
	chargeableDays: number | null;
	waivedDays: number | null;
	totalDays: number | null;
	generatedAt: Date | null;
	createdAt: Date;
}): BillListEntry {
	const totalAmount = Number(bill.totalAmount as any);
	const amountPaid = Number(bill.amountPaid as any);
	const balanceDue = Number(bill.balanceDue ?? totalAmount - amountPaid);

	return {
		id: bill.id,
		billingMonth: dateKey(bill.billingMonth),
		hostelRent: toDecimalString(bill.hostelRent as any),
		messCharges: toDecimalString(bill.messCharges as any),
		extrasTotal: toDecimalString(bill.extrasTotal as any),
		totalAmount: toDecimalString(totalAmount),
		amountPaid: toDecimalString(amountPaid),
		balanceDue: toDecimalString(balanceDue),
		status: bill.status ?? BillStatus.GENERATED,
		chargeableDays: bill.chargeableDays ?? 0,
		waivedDays: bill.waivedDays ?? 0,
		totalDays: bill.totalDays ?? 0,
		generatedAt: bill.generatedAt ? bill.generatedAt.toISOString() : null,
		createdAt: bill.createdAt.toISOString(),
	};
}

export class BillingService {
	private async ensureStudent(studentId: string) {
		const student = await prisma.student.findFirst({
			where: { id: studentId, deletedAt: null, isActive: true },
			select: { id: true },
		});

		if (!student) {
			throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
		}
	}

	private async resolveBillContext(
		studentId: string,
		month: string,
	): Promise<BillingContext> {
		const { periodStart, periodEnd } = parseMonth(month);
		const [student, hostelAssignment, messAssignment] = await Promise.all([
			prisma.student.findFirst({
				where: { id: studentId, deletedAt: null, isActive: true },
				select: {
					id: true,
					rollNumber: true,
					user: { select: { firstName: true, lastName: true } },
				},
			}),
			prisma.hostelAssignment.findFirst({
				where: {
					studentId,
					isCurrent: true,
					startDate: { lte: periodEnd },
					OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
				},
				include: {
					hostel: { select: { id: true, name: true } },
				},
				orderBy: [{ startDate: "desc" }],
			}),
			prisma.messAssignment.findFirst({
				where: {
					studentId,
					isCurrent: true,
					startDate: { lte: periodEnd },
					OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
				},
				include: {
					mess: {
						select: { id: true, name: true, perDayCharge: true },
					},
				},
				orderBy: [{ startDate: "desc" }],
			}),
		]);

		if (!student) {
			throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
		}

		if (!hostelAssignment) {
			throw new AppError(
				"Student has no active hostel assignment for the billing month",
				422,
				"HOSTEL_ASSIGNMENT_MISSING",
			);
		}

		if (!messAssignment) {
			throw new AppError(
				"Student has no active mess assignment for the billing month",
				422,
				"MESS_ASSIGNMENT_MISSING",
			);
		}

		const { academicYear, semester } = getAcademicYearForDate(periodStart);
		const hostelRentConfig = await prisma.hostelRentConfig.findFirst({
			where: {
				hostelId: hostelAssignment.hostelId,
				academicYear,
				semester,
				dueMonth: periodStart.getUTCMonth() + 1,
			},
			select: { id: true, amount: true },
		});

		const [waivers, leaves, extras] = await Promise.all([
			prisma.messDayWaiver.findMany({
				where: {
					messId: messAssignment.messId,
					date: { gte: periodStart, lte: periodEnd },
				},
				select: { date: true, reason: true },
				orderBy: [{ date: "asc" }],
			}),
			prisma.leave.findMany({
				where: {
					studentId,
					status: {
						in: [LeaveStatus.APPROVED, LeaveStatus.AUTO_APPROVED],
					},
					startDate: { lte: periodEnd },
					endDate: { gte: periodStart },
				},
				select: {
					id: true,
					startDate: true,
					endDate: true,
					returnDate: true,
				},
				orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
			}),
			prisma.studentExtra.findMany({
				where: {
					studentId,
					date: { gte: periodStart, lte: periodEnd },
				},
				include: {
					extraItem: { select: { name: true, unit: true } },
				},
				orderBy: [{ date: "asc" }, { createdAt: "asc" }],
			}),
		]);

		return {
			billingMonth: month,
			periodStart,
			periodEnd,
			student: {
				id: student.id,
				rollNumber: student.rollNumber,
				firstName: student.user.firstName,
				lastName: student.user.lastName,
			},
			hostel: hostelRentConfig
				? {
						hostelId: hostelAssignment.hostelId,
						hostelName: hostelAssignment.hostel.name,
						amount: hostelRentConfig.amount.toString(),
						configId: hostelRentConfig.id,
					}
				: null,
			mess: {
				messId: messAssignment.messId,
				messName: messAssignment.mess.name,
				perDayCharge: messAssignment.mess.perDayCharge.toString(),
			},
			waivers: waivers.map((waiver) => ({
				date: waiver.date,
				reason: waiver.reason,
			})),
			leaves: leaves.map((leave) => ({
				id: leave.id,
				startDate: leave.startDate,
				endDate: leave.endDate,
				returnDate: leave.returnDate,
			})),
			extras: extras.map((extra) => ({
				id: extra.id,
				date: extra.date,
				quantity: extra.quantity.toString(),
				unitPrice: extra.unitPrice.toString(),
				description: `${extra.extraItem.name} (${extra.extraItem.unit})`,
				referenceId: extra.extraItemId,
			})),
		};
	}

	private async persistBillingDraft(
		context: BillingContext,
		draft: BillingDraft,
		actorUserId: string | null,
	) {
		return prisma.$transaction(async (tx) => {
			const existingBill = await tx.bill.findUnique({
				where: {
					studentId_billingMonth: {
						studentId: context.student.id,
						billingMonth: context.periodStart,
					},
				},
				include: { lineItems: true },
			});

			if (existingBill) {
				return { bill: existingBill, created: false as const };
			}

			const bill = await tx.bill.create({
				data: {
					studentId: context.student.id,
					billingMonth: context.periodStart,
					hostelRent: draft.hostelRent,
					messCharges: draft.messCharges,
					extrasTotal: draft.extrasTotal,
					totalAmount: draft.totalAmount,
					amountPaid: "0.00",
					balanceDue: draft.totalAmount,
					chargeableDays: draft.chargeableDays,
					waivedDays: draft.waivedDays,
					totalDays: draft.totalDays,
					status: BillStatus.GENERATED,
					isFrozen: true,
					generatedAt: new Date(),
				},
			});

			await tx.billLineItem.createMany({
				data: draft.lineItems.map((item) => ({
					billId: bill.id,
					type: item.type,
					description: item.description,
					date: item.date,
					quantity: item.quantity,
					unitPrice: item.unitPrice,
					amount: item.amount,
					referenceId: item.referenceId,
				})),
			});

			await tx.auditLog.create({
				data: {
					action: "BILL_GENERATED",
					entityType: "bill",
					entityId: bill.id,
					userId: actorUserId,
					newValue: {
						studentId: context.student.id,
						billingMonth: context.billingMonth,
						totalAmount: draft.totalAmount,
						chargeableDays: draft.chargeableDays,
						waivedDays: draft.waivedDays,
					},
				},
			});

			return { bill, created: true as const };
		});
	}

	private async buildBillDetail(billId: string) {
		const bill = await prisma.bill.findUnique({
			where: { id: billId },
			include: {
				student: {
					include: {
						user: { select: { firstName: true, lastName: true } },
					},
				},
				lineItems: { orderBy: [{ date: "asc" }, { id: "asc" }] },
				payments: { orderBy: [{ createdAt: "desc" }] },
			},
		});

		if (!bill) {
			throw new AppError("Bill not found", 404, "BILL_NOT_FOUND");
		}

		return bill;
	}

	private async mapBillDetail(billId: string): Promise<BillDetail> {
		const bill = await this.buildBillDetail(billId);
		return {
			...mapBillListEntry(bill),
			student: {
				id: bill.studentId,
				rollNumber: bill.student.rollNumber,
				firstName: bill.student.user.firstName,
				lastName: bill.student.user.lastName,
			},
			lineItems: bill.lineItems.map((item) => ({
				id: item.id,
				type: item.type,
				description: item.description,
				date: item.date ? item.date.toISOString().slice(0, 10) : null,
				quantity: item.quantity.toString(),
				unitPrice: item.unitPrice.toString(),
				amount: item.amount.toString(),
				referenceId: item.referenceId,
			})),
			payments: bill.payments.map((payment) => ({
				id: payment.id,
				amount: payment.amount.toString(),
				paymentDate: payment.paymentDate.toISOString().slice(0, 10),
				referenceNumber: payment.referenceNumber,
				status: payment.status,
			})),
		};
	}

	async generateBillForStudent(
		studentId: string,
		month: string,
		actorUserId: string | null,
	) {
		await this.ensureStudent(studentId);
		const context = await this.resolveBillContext(studentId, month);
		const draft = calculateBillingDraft(context);
		const result = await this.persistBillingDraft(
			context,
			draft,
			actorUserId,
		);
		const detail = await this.mapBillDetail(result.bill.id);

		await redis.setEx(
			getCacheKey(studentId, month),
			24 * 60 * 60,
			JSON.stringify(detail),
		);
		await redis.setEx(
			getDetailCacheKey(result.bill.id),
			24 * 60 * 60,
			JSON.stringify(detail),
		);

		return { created: result.created, bill: detail };
	}

	async generateBillsForMonth(options: GenerateBillingOptions) {
		const students = options.studentId
			? await prisma.student.findMany({
					where: {
						id: options.studentId,
						deletedAt: null,
						isActive: true,
					},
					select: { id: true },
				})
			: await prisma.student.findMany({
					where: { deletedAt: null, isActive: true },
					select: { id: true },
					orderBy: [{ rollNumber: "asc" }],
				});

		const processed: Array<{
			studentId: string;
			created: boolean;
			billId: string;
		}> = [];
		const skipped: Array<{ studentId: string; reason: string }> = [];
		const failed: Array<{ studentId: string; reason: string }> = [];

		for (const student of students) {
			try {
				const result = await this.generateBillForStudent(
					student.id,
					options.month,
					options.actorUserId ?? null,
				);
				if (result.created) {
					processed.push({
						studentId: student.id,
						created: true,
						billId: result.bill.id,
					});
				} else {
					skipped.push({
						studentId: student.id,
						reason: "BILL_ALREADY_EXISTS",
					});
				}
			} catch (error) {
				failed.push({
					studentId: student.id,
					reason:
						error instanceof Error
							? error.message
							: "Unknown billing error",
				});
			}
		}

		return {
			month: options.month,
			processedCount: processed.length,
			skippedCount: skipped.length,
			failedCount: failed.length,
			processed,
			skipped,
			failed,
		};
	}

	async getStudentBills(studentId: string, month?: string) {
		await this.ensureStudent(studentId);
		const bills = await prisma.bill.findMany({
			where: {
				studentId,
				...(month
					? { billingMonth: parseMonth(month).periodStart }
					: {}),
			},
			orderBy: [{ billingMonth: "desc" }],
		});

		return {
			studentId,
			bills: bills.map((bill) => mapBillListEntry(bill)),
			totalBills: bills.length,
		};
	}

	async getStudentBill(studentId: string, billId: string) {
		await this.ensureStudent(studentId);
		const cacheKey = getDetailCacheKey(billId);
		const cached = await redis.get(cacheKey);
		if (cached) {
			const parsed = JSON.parse(cached) as BillDetail;
			if ((parsed as any).student?.id === studentId) {
				return parsed;
			}
		}

		const bill = await this.buildBillDetail(billId);
		if (bill.studentId !== studentId) {
			throw new AppError("Bill not found", 404, "BILL_NOT_FOUND");
		}

		const payload = await this.mapBillDetail(billId);
		await redis.setEx(cacheKey, 24 * 60 * 60, JSON.stringify(payload));
		await redis.setEx(
			getCacheKey(studentId, getBillingMonthKey(bill.billingMonth)),
			24 * 60 * 60,
			JSON.stringify(payload),
		);
		return payload;
	}

	async getStudentBillForAdmin(studentId: string, billId?: string) {
		if (billId) {
			return this.getStudentBill(studentId, billId);
		}

		return this.getStudentBills(studentId);
	}

	async generateMonthWithLock(
		month: string,
		actorUserId: string | null,
		studentId?: string,
	) {
		const lockKey = getLockKey(month);
		const acquired = await redis.set(lockKey, "1", {
			NX: true,
			EX: 30 * 60,
		});
		if (!acquired) {
			return {
				month,
				locked: true,
				message: "Billing generation is already running",
			};
		}

		try {
			const options: GenerateBillingOptions = {
				month,
				actorUserId,
			};
			if (studentId) {
				options.studentId = studentId;
			}

			const result = await this.generateBillsForMonth(options);
			return { ...result, locked: false };
		} finally {
			await redis.del(lockKey);
		}
	}

	async generatePreviousMonthBills(now = new Date()) {
		const current = normalizeDate(now);
		const previousMonth = new Date(
			Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1),
		);
		previousMonth.setUTCMonth(previousMonth.getUTCMonth() - 1);
		const month = getBillingMonthKey(previousMonth);
		return this.generateMonthWithLock(month, null);
	}
}

export const billingService = new BillingService();
