import { BillLineItemType, Semester } from "../../../generated/prisma/enums.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export type BillingMonth = `${number}-${string}`;

export type BillingLeave = {
	id: string;
	startDate: Date;
	endDate: Date;
	returnDate: Date | null;
};

export type BillingWaiver = {
	date: Date;
	reason: string | null;
};

export type BillingExtra = {
	id: string;
	date: Date;
	quantity: string;
	unitPrice: string;
	description: string;
	referenceId: string | null;
};

export type BillingHostelCharge = {
	hostelId: string;
	hostelName: string;
	amount: string;
	configId: string | null;
};

export type BillingMessCharge = {
	messId: string;
	messName: string;
	perDayCharge: string;
};

export type BillingStudent = {
	id: string;
	rollNumber: string;
	firstName: string;
	lastName: string;
};

export type BillingContext = {
	billingMonth: string;
	periodStart: Date;
	periodEnd: Date;
	student: BillingStudent;
	hostel: BillingHostelCharge | null;
	mess: BillingMessCharge;
	waivers: BillingWaiver[];
	leaves: BillingLeave[];
	extras: BillingExtra[];
};

export type BillingLineItemDraft = {
	type: BillLineItemType;
	description: string;
	date: Date | null;
	quantity: string;
	unitPrice: string;
	amount: string;
	referenceId: string | null;
};

export type BillingDraft = {
	billingMonth: string;
	student: BillingStudent;
	hostelRent: string;
	messCharges: string;
	extrasTotal: string;
	totalAmount: string;
	chargeableDays: number;
	waivedDays: number;
	totalDays: number;
	waivedMessDays: number;
	waivedLeaveDays: number;
	lineItems: BillingLineItemDraft[];
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

function monthBounds(month: string) {
	const [yearText, monthText] = month.split("-");
	const year = Number(yearText);
	const monthIndex = Number(monthText) - 1;
	const periodStart = new Date(Date.UTC(year, monthIndex, 1));
	const periodEnd = new Date(Date.UTC(year, monthIndex + 1, 0));
	return { periodStart, periodEnd };
}

function differenceInDaysInclusive(start: Date, end: Date): number {
	return (
		Math.floor(
			(normalizeDate(end).getTime() - normalizeDate(start).getTime()) /
				DAY_MS,
		) + 1
	);
}

function getAcademicYearAndSemester(date: Date): {
	academicYear: string;
	semester: Semester;
} {
	const normalized = normalizeDate(date);
	const monthIndex = normalized.getUTCMonth();
	if (monthIndex >= 6) {
		const year = normalized.getUTCFullYear();
		return {
			academicYear: `${year}-${String(year + 1).slice(-2)}`,
			semester: Semester.FIRST,
		};
	}

	const year = normalized.getUTCFullYear() - 1;
	return {
		academicYear: `${year}-${String(year + 1).slice(-2)}`,
		semester: Semester.SECOND,
	};
}

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

function formatExtraAmount(quantity: string, unitPrice: string): number {
	const quantityMinor = Math.round(Number(quantity) * 100);
	const priceMinor = toMinorUnits(unitPrice);
	return Math.round((quantityMinor * priceMinor) / 100);
}

function leaveEffectiveEnd(leave: BillingLeave): Date {
	const end = normalizeDate(leave.endDate);
	if (!leave.returnDate) {
		return end;
	}

	return new Date(
		Math.min(
			end.getTime(),
			addDays(normalizeDate(leave.returnDate), -1).getTime(),
		),
	);
}

function isLeaveWaivedForDay(leave: BillingLeave, day: Date): boolean {
	const normalizedDay = normalizeDate(day);
	const start = normalizeDate(leave.startDate);
	const end = leaveEffectiveEnd(leave);
	if (end < start) {
		return false;
	}

	const effectiveDuration = differenceInDaysInclusive(start, end);
	return (
		effectiveDuration > 2 && normalizedDay >= start && normalizedDay <= end
	);
}

export function calculateBillingDraft(context: BillingContext): BillingDraft {
	const totalDays = differenceInDaysInclusive(
		context.periodStart,
		context.periodEnd,
	);
	const waiverKeys = new Set(
		context.waivers.map((waiver) => dateKey(waiver.date)),
	);

	let chargeableDays = 0;
	let waivedDays = 0;
	let waivedLeaveDays = 0;

	for (
		let cursor = new Date(context.periodStart.getTime());
		cursor <= context.periodEnd;
		cursor = addDays(cursor, 1)
	) {
		const key = dateKey(cursor);
		if (waiverKeys.has(key)) {
			waivedDays += 1;
			continue;
		}

		const leave = context.leaves.find((entry) => {
			const start = normalizeDate(entry.startDate);
			const end = leaveEffectiveEnd(entry);
			return start <= cursor && cursor <= end;
		});

		if (leave && isLeaveWaivedForDay(leave, cursor)) {
			waivedDays += 1;
			waivedLeaveDays += 1;
			continue;
		}

		chargeableDays += 1;
	}

	const hostelRentMinor = context.hostel
		? toMinorUnits(context.hostel.amount)
		: 0;
	const messChargesMinor = Math.round(
		chargeableDays * toMinorUnits(context.mess.perDayCharge),
	);

	const hostelLineItems = context.hostel
		? [
				{
					type: BillLineItemType.HOSTEL_RENT,
					description: `Hostel rent for ${context.hostel.hostelName}`,
					date: null,
					quantity: "1.00",
					unitPrice: context.hostel.amount,
					amount: fromMinorUnits(hostelRentMinor),
					referenceId: context.hostel.configId,
				},
			]
		: [];

	const messLineItems = [
		{
			type: BillLineItemType.MESS_CHARGE,
			description: `Mess charges for ${context.mess.messName} (${chargeableDays} chargeable days)`,
			date: null,
			quantity: String(chargeableDays),
			unitPrice: context.mess.perDayCharge,
			amount: fromMinorUnits(messChargesMinor),
			referenceId: context.mess.messId,
		},
	];

	const extraLineItems = context.extras.map((extra) => {
		const amountMinor = formatExtraAmount(extra.quantity, extra.unitPrice);
		return {
			type: BillLineItemType.EXTRA,
			description: extra.description,
			date: extra.date,
			quantity: extra.quantity,
			unitPrice: extra.unitPrice,
			amount: fromMinorUnits(amountMinor),
			referenceId: extra.referenceId,
		};
	});

	const extrasTotalMinor = extraLineItems.reduce(
		(total, entry) => total + toMinorUnits(entry.amount),
		0,
	);
	const totalAmountMinor =
		hostelRentMinor + messChargesMinor + extrasTotalMinor;

	return {
		billingMonth: context.billingMonth,
		student: context.student,
		hostelRent: fromMinorUnits(hostelRentMinor),
		messCharges: fromMinorUnits(messChargesMinor),
		extrasTotal: fromMinorUnits(extrasTotalMinor),
		totalAmount: fromMinorUnits(totalAmountMinor),
		chargeableDays,
		waivedDays,
		totalDays,
		waivedMessDays: waivedDays - waivedLeaveDays,
		waivedLeaveDays,
		lineItems: [...hostelLineItems, ...messLineItems, ...extraLineItems],
	};
}

export function getBillingPeriod(month: string) {
	return monthBounds(month);
}

export function getBillingMonthKey(date: Date): string {
	const normalized = normalizeDate(date);
	return `${normalized.getUTCFullYear()}-${String(normalized.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getAcademicYearForDate(date: Date) {
	return getAcademicYearAndSemester(date);
}
