import { api } from "@/lib/api";
import { useMemo, useState } from "react";

type GenerateResult = {
	month: string; locked: boolean; message?: string;
	processedCount?: number; skippedCount?: number; failedCount?: number;
	processed?: Array<{ studentId: string; created: boolean; billId: string }>;
	skipped?: Array<{ studentId: string; reason: string }>;
	failed?: Array<{ studentId: string; reason: string }>;
};

function getDefaultMonth() {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function BillingPage() {
	const [month, setMonth] = useState(getDefaultMonth);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [result, setResult] = useState<GenerateResult | null>(null);

	const summary = useMemo(() => ({
		processed: result?.processedCount ?? 0,
		skipped: result?.skippedCount ?? 0,
		failed: result?.failedCount ?? 0,
	}), [result]);

	const onGenerate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(""); setSuccess(""); setResult(null); setIsSubmitting(true);
		try {
			const res = await api.post("/bills/generate", { month });
			const payload = res.data.data as GenerateResult;
			setResult(payload);
			if (payload.locked) {
				setSuccess(payload.message ?? "Billing generation is currently running.");
				return;
			}
			setSuccess(
				payload.failedCount
					? `Finished with issues: processed ${payload.processedCount}, skipped ${payload.skippedCount}, failed ${payload.failedCount}.`
					: `Completed: processed ${payload.processedCount}, skipped ${payload.skippedCount}.`
			);
		} catch (err: any) { setError(err.response?.data?.error?.message ?? "Failed to generate bills."); }
		finally { setIsSubmitting(false); }
	};

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-bold text-slate-900">Bill Generation</h1>
					<p className="mt-0.5 text-sm text-slate-500">Run month-wise billing for all active students using the billing engine.</p>
				</div>
				{result && !result.locked && (
					<div className="flex gap-2">
						<span className="inline-flex items-center px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-semibold">Processed: {summary.processed}</span>
						<span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">Skipped: {summary.skipped}</span>
						{summary.failed > 0 && <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-semibold">Failed: {summary.failed}</span>}
					</div>
				)}
			</div>

			{error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
			{success && <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">{success}</div>}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-4">Generate Bills</h2>
					<form onSubmit={onGenerate} className="space-y-4">
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">Billing month</label>
							<input type="month" required value={month} onChange={(e) => setMonth(e.target.value)}
								className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<button type="submit" disabled={isSubmitting || !month}
							className="w-full py-2.5 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors">
							{isSubmitting ? "Generating…" : "Generate bills"}
						</button>
					</form>
				</div>

				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-3">Notes</h2>
					<ul className="space-y-2">
						{[
							"Bills are generated for active students only.",
							"Existing monthly bills are skipped automatically.",
							"Failures usually mean missing hostel/mess assignments for that month.",
							"The billing engine is idempotent — safe to re-run.",
						].map((note) => (
							<li key={note} className="flex items-start gap-2 text-xs text-slate-500">
								<span className="text-slate-300 mt-0.5 shrink-0">•</span>
								{note}
							</li>
						))}
					</ul>
				</div>
			</div>

			{/* Generation results */}
			{result && !result.locked && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
						<div className="px-5 py-4 border-b border-slate-100">
							<h2 className="text-sm font-semibold text-slate-900">Generated Bills ({summary.processed})</h2>
						</div>
						{!result.processed?.length ? (
							<p className="text-center py-8 text-sm text-slate-400">No new bills generated.</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-xs">
									<thead className="bg-slate-50 border-b border-slate-200">
										<tr>
											<th className="px-4 py-2 text-left font-semibold text-slate-500">Student ID</th>
											<th className="px-4 py-2 text-left font-semibold text-slate-500">Bill ID</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-100">
										{result.processed.map((item) => (
											<tr key={item.billId} className="hover:bg-slate-50">
												<td className="px-4 py-2 font-mono text-slate-600">{item.studentId.slice(0, 12)}…</td>
												<td className="px-4 py-2 font-mono text-slate-600">{item.billId.slice(0, 12)}…</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>

					<div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
						<div className="px-5 py-4 border-b border-slate-100">
							<h2 className="text-sm font-semibold text-slate-900">
								Skipped ({summary.skipped}) · Failed ({summary.failed})
							</h2>
						</div>
						{!result.skipped?.length && !result.failed?.length ? (
							<p className="text-center py-8 text-sm text-slate-400">No issues reported.</p>
						) : (
							<div className="divide-y divide-slate-100">
								{result.skipped?.map((item) => (
									<div key={`${item.studentId}-s`} className="px-4 py-3">
										<p className="text-xs font-mono text-slate-600">{item.studentId.slice(0, 16)}…</p>
										<p className="text-xs text-slate-400 mt-0.5">Skipped: {item.reason}</p>
									</div>
								))}
								{result.failed?.map((item) => (
									<div key={`${item.studentId}-f`} className="px-4 py-3">
										<p className="text-xs font-mono text-red-600">{item.studentId.slice(0, 16)}…</p>
										<p className="text-xs text-red-400 mt-0.5">Failed: {item.reason}</p>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
