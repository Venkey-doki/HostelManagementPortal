import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

type BillLineItem = {
	id: string;
	type: "HOSTEL_RENT" | "MESS_CHARGE" | "EXTRA" | "ADJUSTMENT";
	description: string;
	date: string | null;
	quantity: string;
	unitPrice: string;
	amount: string;
};
type Payment = { id: string; amount: string; paymentDate: string; referenceNumber: string; status: string };
type BillDetail = {
	id: string; billingMonth: string; hostelRent: string; messCharges: string; extrasTotal: string;
	totalAmount: string; amountPaid: string; balanceDue: string;
	status: "GENERATED" | "PARTIALLY_PAID" | "PAID"; chargeableDays: number; waivedDays: number; totalDays: number;
	student: { id: string; rollNumber: string; firstName: string; lastName: string };
	lineItems: BillLineItem[]; payments: Payment[];
};

function formatMonth(v: string) {
	return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(v));
}
function formatMoney(v: string) { return `₹${Number(v).toFixed(2)}`; }
function formatDate(v: string | null) {
	if (!v) return "—";
	return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v));
}

const TYPE_BADGE: Record<BillLineItem["type"], string> = {
	HOSTEL_RENT: "bg-blue-50 text-blue-700",
	MESS_CHARGE: "bg-green-50 text-green-700",
	EXTRA: "bg-amber-50 text-amber-700",
	ADJUSTMENT: "bg-slate-50 text-slate-600",
};
const STATUS_BADGE: Record<string, string> = {
	PAID: "bg-green-100 text-green-700",
	PARTIALLY_PAID: "bg-amber-100 text-amber-700",
	GENERATED: "bg-slate-100 text-slate-600",
	VERIFIED: "bg-green-100 text-green-700",
	PENDING: "bg-amber-100 text-amber-700",
	REJECTED: "bg-red-100 text-red-700",
};

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function StudentBillDetailPage() {
	const { billId } = useParams<{ billId: string }>();
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const [referenceNumber, setReferenceNumber] = useState("");
	const [amount, setAmount] = useState("");
	const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [screenshot, setScreenshot] = useState<File | null>(null);

	const { data, isLoading, error } = useQuery({
		queryKey: ["student-bill", billId],
		queryFn: async () => (await api.get(`/bills/me/${billId}`)).data.data as BillDetail,
		enabled: Boolean(billId),
	});

	useEffect(() => {
		if (!data) return;
		setAmount((c) => c.trim() ? c : Number(data.balanceDue).toFixed(2));
	}, [data]);

	const submitPaymentMutation = useMutation({
		mutationFn: async () => {
			if (!billId) throw new Error("Bill not found");
			if (!screenshot) throw new Error("Payment screenshot is required");
			const fd = new FormData();
			fd.append("billId", billId);
			fd.append("amount", amount);
			fd.append("paymentDate", paymentDate);
			fd.append("referenceNumber", referenceNumber);
			fd.append("screenshot", screenshot);
			return (await api.post("/payments", fd)).data.data;
		},
		onSuccess: async () => {
			setSuccessMessage("Payment proof submitted. Office verification is pending.");
			setReferenceNumber("");
			setScreenshot(null);
			await queryClient.invalidateQueries({ queryKey: ["student-bill", billId] });
			await queryClient.invalidateQueries({ queryKey: ["student-bills"] });
		},
		onError: (err: any) => {
			const code = err?.response?.data?.error?.code as string | undefined;
			setErrorMessage(
				err?.response?.status === 401 ? "Session expired. Please login again." :
				code === "SCREENSHOT_UPLOAD_UNAVAILABLE" ? "Screenshot upload temporarily unavailable. Try again." :
				err.response?.data?.error?.message ?? err.message ?? "Failed to submit payment proof"
			);
		},
	});

	if (!billId) return <p className="text-sm text-red-600">Bill not found.</p>;
	if (error) return <p className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">Failed to load bill details.</p>;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Billing detail</p>
					<h1 className="text-xl font-bold text-slate-900">
						{data ? formatMonth(data.billingMonth) : "Bill details"}
					</h1>
					<p className="mt-0.5 text-sm text-slate-500">Line-item breakdown of the frozen monthly invoice.</p>
				</div>
				<Link to="/student/billing" className="text-sm font-medium text-blue-700 hover:underline">
					← Back to bills
				</Link>
			</div>

			{errorMessage && (
				<div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{errorMessage}</div>
			)}
			{successMessage && (
				<div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">{successMessage}</div>
			)}

			{/* Summary stats */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				{[
					{ label: "Total", value: data ? formatMoney(data.totalAmount) : "—" },
					{ label: "Paid", value: data ? formatMoney(data.amountPaid) : "—" },
					{ label: "Balance due", value: data ? formatMoney(data.balanceDue) : "—", highlight: data ? Number(data.balanceDue) > 0 : false },
					{ label: "Status", value: data?.status?.replace("_", " ") ?? (isLoading ? "Loading…" : "—") },
				].map((s) => (
					<div key={s.label} className={cn("bg-white rounded-lg border p-4", s.highlight ? "border-red-200" : "border-slate-200")}>
						<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
						<p className={cn("mt-1 text-lg font-bold", s.highlight ? "text-red-700" : "text-slate-900")}>{s.value}</p>
					</div>
				))}
			</div>

			{/* Student info + charge breakdown side by side */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-3">Student Info</h2>
					<dl className="space-y-2 text-sm">
						{[
							["Name", data ? `${data.student.firstName} ${data.student.lastName}` : "—"],
							["Roll No.", data?.student.rollNumber ?? "—"],
							["Chargeable days", data?.chargeableDays ?? "—"],
							["Waived days", data?.waivedDays ?? "—"],
							["Total days", data?.totalDays ?? "—"],
						].map(([k, v]) => (
							<div key={String(k)} className="flex justify-between gap-2">
								<dt className="text-slate-500">{k}</dt>
								<dd className="font-medium text-slate-900 text-right">{String(v)}</dd>
							</div>
						))}
					</dl>
				</div>
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-3">Charge Breakdown</h2>
					<dl className="space-y-2 text-sm">
						{[
							["Hostel rent", data ? formatMoney(data.hostelRent) : "—"],
							["Mess charges", data ? formatMoney(data.messCharges) : "—"],
							["Extras", data ? formatMoney(data.extrasTotal) : "—"],
							["Total", data ? formatMoney(data.totalAmount) : "—"],
						].map(([k, v]) => (
							<div key={String(k)} className="flex justify-between gap-2">
								<dt className="text-slate-500">{k}</dt>
								<dd className="font-semibold text-slate-900">{String(v)}</dd>
							</div>
						))}
					</dl>
					<p className="mt-3 text-xs text-slate-400">Bill is frozen upon generation — line items cannot change.</p>
				</div>
			</div>

			{/* Submit payment proof */}
			{data && data.status !== "PAID" && (
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-4">Submit Payment Proof</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">Amount (₹)</label>
							<input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">Payment date</label>
							<input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputClass} />
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">Reference / UTR number</label>
							<input type="text" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="Transaction reference" className={inputClass} />
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">Payment screenshot</label>
							<input type="file" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)} className={inputClass} />
						</div>
					</div>
					<button
						type="button"
						onClick={() => { setErrorMessage(""); setSuccessMessage(""); submitPaymentMutation.mutate(); }}
						disabled={submitPaymentMutation.isPending || !amount.trim() || !referenceNumber.trim() || !screenshot}
						className="py-2 px-5 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors"
					>
						{submitPaymentMutation.isPending ? "Submitting…" : "Submit proof"}
					</button>
					<p className="mt-2 text-xs text-slate-400">Balance updates after office verification.</p>
				</div>
			)}

			{/* Line items */}
			<div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
				<div className="px-5 py-4 border-b border-slate-100">
					<h2 className="text-sm font-semibold text-slate-900">Line Items</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-slate-50 border-b border-slate-200">
							<tr>
								{["Type", "Description", "Date", "Qty", "Rate", "Amount"].map((h) => (
									<th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{data?.lineItems.map((item) => (
								<tr key={item.id} className="hover:bg-slate-50">
									<td className="px-4 py-3">
										<span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", TYPE_BADGE[item.type])}>
											{item.type.replace("_", " ")}
										</span>
									</td>
									<td className="px-4 py-3 text-slate-700">{item.description}</td>
									<td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(item.date)}</td>
									<td className="px-4 py-3 text-slate-600">{item.quantity}</td>
									<td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatMoney(item.unitPrice)}</td>
									<td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{formatMoney(item.amount)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Payments ledger */}
			<div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
				<div className="px-5 py-4 border-b border-slate-100">
					<h2 className="text-sm font-semibold text-slate-900">Payment History</h2>
				</div>
				{!data?.payments.length ? (
					<p className="text-center py-8 text-sm text-slate-400">No payments linked yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-slate-50 border-b border-slate-200">
								<tr>
									{["Date", "Reference", "Status", "Amount"].map((h) => (
										<th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{data.payments.map((p) => (
									<tr key={p.id} className="hover:bg-slate-50">
										<td className="px-4 py-3 whitespace-nowrap">{formatDate(p.paymentDate)}</td>
										<td className="px-4 py-3 font-mono text-xs text-slate-600">{p.referenceNumber}</td>
										<td className="px-4 py-3">
											<span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", STATUS_BADGE[p.status] ?? "bg-slate-100 text-slate-600")}>
												{p.status}
											</span>
										</td>
										<td className="px-4 py-3 font-semibold">{formatMoney(p.amount)}</td>
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
