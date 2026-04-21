import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

type PendingPayment = {
	id: string; studentId: string; billId: string | null; amount: string;
	paymentDate: string; referenceNumber: string; screenshotUrl: string; status: "PENDING";
	student: { rollNumber: string; firstName: string; lastName: string; email: string };
	bill: { id: string; billingMonth: string; totalAmount: string; amountPaid: string; balanceDue: string; status: string | null } | null;
	createdAt: string;
};

function formatMoney(v: string) { return `₹${Number(v).toFixed(2)}`; }
function formatDate(v: string) {
	return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v));
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none";

export default function WardenPaymentsPage() {
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

	const { data, isLoading } = useQuery({
		queryKey: ["warden-pending-payments"],
		queryFn: async () => (await api.get("/payments/pending")).data.data as { payments: PendingPayment[]; totalPending: number },
	});

	const verifyMutation = useMutation({
		mutationFn: async (id: string) => (await api.patch(`/payments/${id}/verify`)).data.data,
		onSuccess: async () => { setSuccess("Payment verified and credited."); await queryClient.invalidateQueries({ queryKey: ["warden-pending-payments"] }); },
		onError: (err: any) => { setError(err.response?.data?.error?.message ?? "Failed to verify payment"); },
	});

	const rejectMutation = useMutation({
		mutationFn: async ({ paymentId, rejectionReason }: { paymentId: string; rejectionReason: string }) =>
			(await api.patch(`/payments/${paymentId}/reject`, { rejectionReason })).data.data,
		onSuccess: async (_, v) => {
			setSuccess("Payment rejected.");
			setRejectionReasons((c) => { const n = { ...c }; delete n[v.paymentId]; return n; });
			await queryClient.invalidateQueries({ queryKey: ["warden-pending-payments"] });
		},
		onError: (err: any) => { setError(err.response?.data?.error?.message ?? "Failed to reject payment"); },
	});

	const payments = data?.payments ?? [];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-bold text-slate-900">Payment Verification</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Review payment proofs, verify valid transfers, reject invalid submissions.
					</p>
				</div>
				<span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-sm font-semibold text-amber-700">
					{data?.totalPending ?? "—"} pending
				</span>
			</div>

			{error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
			{success && <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">{success}</div>}

			<div className="bg-white rounded-lg border border-slate-200">
				<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">Pending verification queue</h2>
					{isLoading && <span className="text-xs text-slate-400">Loading…</span>}
				</div>
				{!payments.length && !isLoading ? (
					<p className="text-center py-10 text-sm text-slate-400">No pending payments. Queue is clear!</p>
				) : (
					<div className="divide-y divide-slate-100">
						{payments.map((payment) => {
							const rejReason = rejectionReasons[payment.id] ?? "";
							return (
								<div key={payment.id} className="p-5">
									<div className="flex items-start justify-between gap-3 mb-3">
										<div>
											<p className="text-sm font-semibold text-slate-900">
												{payment.student.firstName} {payment.student.lastName}
												<span className="ml-2 text-slate-400 font-normal text-xs">· {payment.student.rollNumber}</span>
											</p>
											<p className="text-xs text-slate-500 mt-0.5">{payment.student.email}</p>
										</div>
										<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
											PENDING
										</span>
									</div>

									<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
										{/* Details */}
										<div className="space-y-1 text-sm">
											<div className="flex justify-between">
												<span className="text-slate-500">Amount</span>
												<span className="font-semibold text-slate-900">{formatMoney(payment.amount)}</span>
											</div>
											<div className="flex justify-between">
												<span className="text-slate-500">Payment date</span>
												<span className="text-slate-700">{formatDate(payment.paymentDate)}</span>
											</div>
											<div className="flex justify-between">
												<span className="text-slate-500">Reference</span>
												<span className="font-mono text-xs text-slate-600">{payment.referenceNumber}</span>
											</div>
											<div className="flex justify-between">
												<span className="text-slate-500">Submitted</span>
												<span className="text-slate-600">{formatDate(payment.createdAt)}</span>
											</div>
											{payment.bill ? (
												<div className="flex justify-between">
													<span className="text-slate-500">Bill balance before</span>
													<span className="font-semibold text-red-700">{formatMoney(payment.bill.balanceDue)}</span>
												</div>
											) : (
												<div className="text-xs text-slate-400 italic">Advance payment — not linked to a specific bill</div>
											)}
										</div>
										{/* Screenshot */}
										<div>
											<a href={payment.screenshotUrl} target="_blank" rel="noreferrer" className="block mb-2 text-xs font-medium text-blue-600 hover:underline">
												Open full image →
											</a>
											<img
												src={payment.screenshotUrl}
												alt="Payment proof"
												className="w-full h-40 object-cover rounded-lg border border-slate-200"
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label className="block text-xs font-medium text-slate-700 mb-1">
												Rejection reason (required if rejecting)
											</label>
											<textarea
												rows={2}
												value={rejReason}
												onChange={(e) => setRejectionReasons((c) => ({ ...c, [payment.id]: e.target.value }))}
												placeholder="Explain reason for rejection…"
												className={inputClass}
											/>
										</div>
										<div className="flex items-end gap-2">
											<button
												type="button"
												onClick={() => { setError(""); setSuccess(""); verifyMutation.mutate(payment.id); }}
												disabled={verifyMutation.isPending}
												className="flex-1 py-2 px-4 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors"
											>
												Verify &amp; Credit
											</button>
											<button
												type="button"
												onClick={() => { setError(""); setSuccess(""); rejectMutation.mutate({ paymentId: payment.id, rejectionReason: rejReason }); }}
												disabled={rejectMutation.isPending || !rejReason.trim()}
												className="flex-1 py-2 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 transition-colors"
											>
												Reject
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
