import { BillStatus, PaymentStatus } from "../../../generated/prisma/enums.js";
import { redis } from "../../infrastructure/cache/redis.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { uploadPaymentScreenshot } from "../../infrastructure/storage/cloudinary.js";
import { AppError } from "../../shared/errors/AppError.js";
import type { SubmitPaymentInput } from "./payments.schema.js";

function toMinorUnits(value: string | number): number {
	const text = typeof value === "number" ? value.toFixed(2) : value;
	const [wholePart, fractionPart = ""] = text.replace(/^-/, "").split(".");
	const whole = Number(wholePart || "0");
	const fraction = Number((fractionPart + "00").slice(0, 2));
	const sign = text.startsWith("-") ? -1 : 1;
	return sign * (whole * 100 + fraction);
}

function fromMinorUnits(value: number): string {
	const sign = value < 0 ? "-" : "";
	const absolute = Math.abs(Math.round(value));
	const whole = Math.floor(absolute / 100);
	const fraction = String(absolute % 100).padStart(2, "0");
	return `${sign}${whole}.${fraction}`;
}

function getDetailCacheKey(billId: string) {
	return `bill-detail:${billId}`;
}

function getMonthBillCacheKey(studentId: string, monthKey: string) {
	return `bill:${studentId}:${monthKey}`;
}

function getMonthKey(date: Date) {
	return date.toISOString().slice(0, 10);
}

function mapPayment(payment: {
	id: string;
	studentId: string;
	billId: string | null;
	amount: unknown;
	paymentDate: Date;
	referenceNumber: string;
	screenshotUrl: string;
	status: PaymentStatus;
	verifiedById: string | null;
	verifiedAt: Date | null;
	rejectionReason: string | null;
	createdAt: Date;
	updatedAt: Date;
	student?: {
		rollNumber: string;
		user: { firstName: string; lastName: string; email: string };
	};
	bill?: {
		id: string;
		billingMonth: Date;
		totalAmount: unknown;
		amountPaid: unknown;
		balanceDue: unknown;
		status: BillStatus | null;
	} | null;
}) {
	return {
		id: payment.id,
		studentId: payment.studentId,
		billId: payment.billId,
		amount: Number(payment.amount as any).toFixed(2),
		paymentDate: payment.paymentDate.toISOString().slice(0, 10),
		referenceNumber: payment.referenceNumber,
		screenshotUrl: payment.screenshotUrl,
		status: payment.status,
		verifiedById: payment.verifiedById,
		verifiedAt: payment.verifiedAt?.toISOString() ?? null,
		rejectionReason: payment.rejectionReason,
		createdAt: payment.createdAt.toISOString(),
		updatedAt: payment.updatedAt.toISOString(),
		student: payment.student
			? {
					rollNumber: payment.student.rollNumber,
					firstName: payment.student.user.firstName,
					lastName: payment.student.user.lastName,
					email: payment.student.user.email,
				}
			: undefined,
		bill: payment.bill
			? {
					id: payment.bill.id,
					billingMonth: payment.bill.billingMonth
						.toISOString()
						.slice(0, 10),
					totalAmount: Number(
						payment.bill.totalAmount as any,
					).toFixed(2),
					amountPaid: Number(payment.bill.amountPaid as any).toFixed(
						2,
					),
					balanceDue: Number(
						(payment.bill.balanceDue as any) ?? 0,
					).toFixed(2),
					status: payment.bill.status,
				}
			: null,
	};
}

export class PaymentsService {
	private async ensureStudent(studentId: string) {
		const student = await prisma.student.findFirst({
			where: { id: studentId, deletedAt: null, isActive: true },
			select: { id: true },
		});
		if (!student) {
			throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
		}
	}

	async submitPaymentProof(
		studentId: string,
		actorUserId: string,
		input: SubmitPaymentInput,
		file: Express.Multer.File,
	) {
		await this.ensureStudent(studentId);

		let bill: {
			id: string;
			studentId: string;
			billingMonth: Date;
			totalAmount: unknown;
			amountPaid: unknown;
			balanceDue: unknown;
		} | null = null;

		if (input.billId) {
			bill = await prisma.bill.findUnique({
				where: { id: input.billId },
				select: {
					id: true,
					studentId: true,
					billingMonth: true,
					totalAmount: true,
					amountPaid: true,
					balanceDue: true,
				},
			});

			if (!bill || bill.studentId !== studentId) {
				throw new AppError("Bill not found", 404, "BILL_NOT_FOUND");
			}

			const balanceMinor = toMinorUnits(
				Number((bill.balanceDue as any) ?? 0).toFixed(2),
			);
			const amountMinor = toMinorUnits(input.amount);
			if (amountMinor > balanceMinor) {
				throw new AppError(
					"Payment amount cannot exceed bill balance due",
					422,
					"PAYMENT_EXCEEDS_BALANCE",
				);
			}
		}

		const uploadInput: {
			buffer: Buffer;
			mimeType: string;
			studentId: string;
			billId?: string;
		} = {
			buffer: file.buffer,
			mimeType: file.mimetype,
			studentId,
		};

		if (input.billId) {
			uploadInput.billId = input.billId;
		}

		const screenshotUrl = await uploadPaymentScreenshot(uploadInput);

		const payment = await prisma.$transaction(async (tx) => {
			const createData: {
				studentId: string;
				billId?: string;
				amount: string;
				paymentDate: Date;
				referenceNumber: string;
				screenshotUrl: string;
				status: PaymentStatus;
			} = {
				studentId,
				amount: input.amount,
				paymentDate: input.paymentDate,
				referenceNumber: input.referenceNumber,
				screenshotUrl,
				status: PaymentStatus.PENDING,
			};

			if (input.billId) {
				createData.billId = input.billId;
			}

			const created = await tx.payment.create({
				data: createData,
			});

			await tx.auditLog.create({
				data: {
					action: "PAYMENT_SUBMITTED",
					entityType: "payment",
					entityId: created.id,
					userId: actorUserId,
					newValue: {
						studentId,
						billId: input.billId ?? null,
						amount: input.amount,
						referenceNumber: input.referenceNumber,
						status: PaymentStatus.PENDING,
					},
				},
			});

			return created;
		});

		if (bill) {
			await redis.del(getDetailCacheKey(bill.id));
			await redis.del(
				getMonthBillCacheKey(studentId, getMonthKey(bill.billingMonth)),
			);
		}

		return mapPayment(payment);
	}

	async getPendingPayments() {
		const payments = await prisma.payment.findMany({
			where: { status: PaymentStatus.PENDING },
			include: {
				student: {
					select: {
						rollNumber: true,
						user: {
							select: {
								firstName: true,
								lastName: true,
								email: true,
							},
						},
					},
				},
				bill: {
					select: {
						id: true,
						billingMonth: true,
						totalAmount: true,
						amountPaid: true,
						balanceDue: true,
						status: true,
					},
				},
			},
			orderBy: [{ createdAt: "asc" }],
		});

		return {
			payments: payments.map((payment) => mapPayment(payment)),
			totalPending: payments.length,
		};
	}

	async verifyPayment(paymentId: string, verifierUserId: string) {
		const result = await prisma.$transaction(async (tx) => {
			const payment = await tx.payment.findUnique({
				where: { id: paymentId },
				include: {
					bill: {
						select: {
							id: true,
							studentId: true,
							billingMonth: true,
							totalAmount: true,
							amountPaid: true,
							balanceDue: true,
							status: true,
						},
					},
				},
			});

			if (!payment) {
				throw new AppError(
					"Payment not found",
					404,
					"PAYMENT_NOT_FOUND",
				);
			}

			if (payment.status !== PaymentStatus.PENDING) {
				throw new AppError(
					"Only pending payments can be verified",
					409,
					"PAYMENT_ALREADY_PROCESSED",
				);
			}

			let updatedBill: {
				id: string;
				studentId: string;
				billingMonth: Date;
			} | null = null;

			if (payment.bill) {
				const paidMinor =
					toMinorUnits(
						Number(payment.bill.amountPaid as any).toFixed(2),
					) + toMinorUnits(Number(payment.amount as any).toFixed(2));
				const totalMinor = toMinorUnits(
					Number(payment.bill.totalAmount as any).toFixed(2),
				);
				const balanceMinor = Math.max(totalMinor - paidMinor, 0);
				const billStatus =
					balanceMinor === 0
						? BillStatus.PAID
						: BillStatus.PARTIALLY_PAID;

				updatedBill = await tx.bill.update({
					where: { id: payment.bill.id },
					data: {
						amountPaid: fromMinorUnits(paidMinor),
						balanceDue: fromMinorUnits(balanceMinor),
						status: billStatus,
					},
					select: {
						id: true,
						studentId: true,
						billingMonth: true,
					},
				});
			}

			const verifiedPayment = await tx.payment.update({
				where: { id: paymentId },
				data: {
					status: PaymentStatus.VERIFIED,
					verifiedById: verifierUserId,
					verifiedAt: new Date(),
					rejectionReason: null,
				},
				include: {
					student: {
						select: {
							rollNumber: true,
							user: {
								select: {
									firstName: true,
									lastName: true,
									email: true,
								},
							},
						},
					},
					bill: {
						select: {
							id: true,
							billingMonth: true,
							totalAmount: true,
							amountPaid: true,
							balanceDue: true,
							status: true,
						},
					},
				},
			});

			await tx.auditLog.create({
				data: {
					action: "PAYMENT_VERIFIED",
					entityType: "payment",
					entityId: paymentId,
					userId: verifierUserId,
					oldValue: { status: PaymentStatus.PENDING },
					newValue: {
						status: PaymentStatus.VERIFIED,
						billId: payment.billId,
						amount: Number(payment.amount as any).toFixed(2),
					},
				},
			});

			return { payment: verifiedPayment, updatedBill };
		});

		if (result.updatedBill) {
			await redis.del(getDetailCacheKey(result.updatedBill.id));
			await redis.del(
				getMonthBillCacheKey(
					result.updatedBill.studentId,
					getMonthKey(result.updatedBill.billingMonth),
				),
			);
		}

		return mapPayment(result.payment);
	}

	async rejectPayment(
		paymentId: string,
		verifierUserId: string,
		rejectionReason: string,
	) {
		const payment = await prisma.$transaction(async (tx) => {
			const current = await tx.payment.findUnique({
				where: { id: paymentId },
			});
			if (!current) {
				throw new AppError(
					"Payment not found",
					404,
					"PAYMENT_NOT_FOUND",
				);
			}

			if (current.status !== PaymentStatus.PENDING) {
				throw new AppError(
					"Only pending payments can be rejected",
					409,
					"PAYMENT_ALREADY_PROCESSED",
				);
			}

			const rejected = await tx.payment.update({
				where: { id: paymentId },
				data: {
					status: PaymentStatus.REJECTED,
					verifiedById: verifierUserId,
					verifiedAt: new Date(),
					rejectionReason,
				},
			});

			await tx.auditLog.create({
				data: {
					action: "PAYMENT_REJECTED",
					entityType: "payment",
					entityId: paymentId,
					userId: verifierUserId,
					oldValue: { status: PaymentStatus.PENDING },
					newValue: {
						status: PaymentStatus.REJECTED,
						rejectionReason,
					},
				},
			});

			return rejected;
		});

		return mapPayment(payment);
	}
}

export const paymentsService = new PaymentsService();
