import { describe, expect, it } from "vitest";
import { calculateBillingDraft } from "../src/modules/billing/billing.engine.js";

function utcDate(value: string) {
	return new Date(`${value}T00:00:00.000Z`);
}

describe("calculateBillingDraft", () => {
	it("applies mess-day waivers before leave logic and computes totals precisely", () => {
		const draft = calculateBillingDraft({
			billingMonth: "2026-07",
			periodStart: utcDate("2026-07-01"),
			periodEnd: utcDate("2026-07-31"),
			student: {
				id: "student-1",
				rollNumber: "R001",
				firstName: "Asha",
				lastName: "K",
			},
			hostel: {
				hostelId: "hostel-1",
				hostelName: "Boys Hostel 1",
				amount: "18000.00",
				configId: "config-1",
			},
			mess: {
				messId: "mess-1",
				messName: "Boys Mess A",
				perDayCharge: "120.00",
			},
			waivers: [{ date: utcDate("2026-07-03"), reason: "cultural day" }],
			leaves: [
				{
					id: "leave-1",
					startDate: utcDate("2026-07-10"),
					endDate: utcDate("2026-07-14"),
					returnDate: null,
				},
				{
					id: "leave-2",
					startDate: utcDate("2026-07-20"),
					endDate: utcDate("2026-07-21"),
					returnDate: null,
				},
			],
			extras: [
				{
					id: "extra-1",
					date: utcDate("2026-07-05"),
					quantity: "2.00",
					unitPrice: "15.00",
					description: "Chicken Curry (plate)",
					referenceId: "item-1",
				},
			],
		});

		expect(draft.chargeableDays).toBe(25);
		expect(draft.waivedDays).toBe(6);
		expect(draft.waivedMessDays).toBe(1);
		expect(draft.waivedLeaveDays).toBe(5);
		expect(draft.hostelRent).toBe("18000.00");
		expect(draft.messCharges).toBe("3000.00");
		expect(draft.extrasTotal).toBe("30.00");
		expect(draft.totalAmount).toBe("21030.00");
		expect(draft.lineItems.map((item) => item.type)).toEqual([
			"HOSTEL_RENT",
			"MESS_CHARGE",
			"EXTRA",
		]);
	});

	it("treats a short leave as chargeable", () => {
		const draft = calculateBillingDraft({
			billingMonth: "2026-07",
			periodStart: utcDate("2026-07-01"),
			periodEnd: utcDate("2026-07-31"),
			student: {
				id: "student-2",
				rollNumber: "R002",
				firstName: "Ravi",
				lastName: "P",
			},
			hostel: null,
			mess: {
				messId: "mess-1",
				messName: "Boys Mess A",
				perDayCharge: "100.00",
			},
			waivers: [],
			leaves: [
				{
					id: "leave-1",
					startDate: utcDate("2026-07-10"),
					endDate: utcDate("2026-07-11"),
					returnDate: null,
				},
			],
			extras: [],
		});

		expect(draft.chargeableDays).toBe(31);
		expect(draft.waivedDays).toBe(0);
		expect(draft.messCharges).toBe("3100.00");
		expect(draft.totalAmount).toBe("3100.00");
	});

	it("uses early return to shorten the waived leave window", () => {
		const draft = calculateBillingDraft({
			billingMonth: "2026-07",
			periodStart: utcDate("2026-07-01"),
			periodEnd: utcDate("2026-07-31"),
			student: {
				id: "student-3",
				rollNumber: "R003",
				firstName: "Meena",
				lastName: "S",
			},
			hostel: null,
			mess: {
				messId: "mess-1",
				messName: "Girls Mess",
				perDayCharge: "100.00",
			},
			waivers: [],
			leaves: [
				{
					id: "leave-1",
					startDate: utcDate("2026-07-10"),
					endDate: utcDate("2026-07-14"),
					returnDate: utcDate("2026-07-13"),
				},
			],
			extras: [],
		});

		expect(draft.waivedDays).toBe(3);
		expect(draft.waivedLeaveDays).toBe(3);
		expect(draft.chargeableDays).toBe(28);
		expect(draft.messCharges).toBe("2800.00");
	});
});
