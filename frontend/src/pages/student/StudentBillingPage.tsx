import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

type BillSummary = {
	id: string;
	billingMonth: string;
	hostelRent: string;
	messCharges: string;
	extrasTotal: string;
	totalAmount: string;
	amountPaid: string;
	balanceDue: string;
	status: "GENERATED" | "PARTIALLY_PAID" | "PAID";
	chargeableDays: number;
	waivedDays: number;
	totalDays: number;
	generatedAt: string | null;
	createdAt: string;
};

function formatMonth(v: string) {
	return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", calendar: "gregory" }).format(new Date(v));
}
function formatMoney(v: string) { return `₹${Number(v).toFixed(2)}`; }

const STATUS_BADGE: Record<BillSummary["status"], string> = {
	PAID: "bg-green-100 text-green-700",
	PARTIALLY_PAID: "bg-amber-100 text-amber-700",
	GENERATED: "bg-slate-100 text-slate-600",
};

export default function StudentBillingPage() {
	const { data, isLoading, error } = useQuery({
		queryKey: ["student-bills"],
		queryFn: async () => (await api.get("/bills/me")).data.data as { studentId: string; bills: BillSummary[]; totalBills: number },
	});

	const bills = data?.bills ?? [];
	const totalBilled = bills.reduce((s, b) => s + Number(b.totalAmount), 0);
	const totalPaid = bills.reduce((s, b) => s + Number(b.amountPaid), 0);
	const totalDue = bills.reduce((s, b) => s + Number(b.balanceDue), 0);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-xl font-bold text-slate-900">Monthly Bills</h1>
				<p className="mt-0.5 text-sm text-slate-500">
					Frozen bills — hostel rent, mess charges, and extras. Each bill is immutable once generated.
				</p>
			</div>

			{error && (
				<div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
					Failed to load billing data.
				</div>
			)}

			{/* Summary cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				{[
					{ label: "Total billed", value: formatMoney(String(totalBilled)) },
					{ label: "Amount paid", value: formatMoney(String(totalPaid)) },
					{ label: "Balance due", value: formatMoney(String(totalDue)), highlight: totalDue > 0 },
				].map((s) => (
					<div key={s.label} className={cn("bg-white rounded-lg border p-4", s.highlight ? "border-red-200" : "border-slate-200")}>
						<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
						<p className={cn("mt-1 text-2xl font-bold", s.highlight ? "text-red-700" : "text-slate-900")}>{s.value}</p>
					</div>
				))}
			</div>

			{/* Bills table */}
			<div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
				<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">Generated Invoices</h2>
					<span className="text-xs text-slate-400">
						{isLoading ? "Loading…" : `${data?.totalBills ?? 0} bills`}
					</span>
				</div>
				{!bills.length && !isLoading ? (
					<p className="text-center py-10 text-sm text-slate-400">No bills generated yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-slate-50 border-b border-slate-200">
								<tr>
									{["Month", "Hostel rent", "Mess charges", "Extras", "Total", "Balance", "Status", ""].map((h) => (
										<th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{bills.map((bill) => (
									<tr key={bill.id} className="hover:bg-slate-50">
										<td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{formatMonth(bill.billingMonth)}</td>
										<td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatMoney(bill.hostelRent)}</td>
										<td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatMoney(bill.messCharges)}</td>
										<td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatMoney(bill.extrasTotal)}</td>
										<td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{formatMoney(bill.totalAmount)}</td>
										<td className={cn("px-4 py-3 font-semibold whitespace-nowrap", Number(bill.balanceDue) > 0 ? "text-red-700" : "text-green-700")}>
											{formatMoney(bill.balanceDue)}
										</td>
										<td className="px-4 py-3">
											<span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold", STATUS_BADGE[bill.status])}>
												{bill.status.replace("_", " ")}
											</span>
										</td>
										<td className="px-4 py-3">
											<Link
												to={`/student/billing/${bill.id}`}
												className="text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline"
											>
												View →
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
