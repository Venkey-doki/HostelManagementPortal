import { api } from "@/lib/api";
import { useEffect, useState } from "react";

interface PreviewEntry {
	id: string; date: string; name: string; unit: string;
	quantity: number; unitPrice: number; amount: number; messName: string;
}
interface PreviewResponse {
	student: { id: string; rollNumber: string };
	month: string;
	entries: PreviewEntry[];
	summary: { totalAmount: number; totalQuantity: number; count: number };
}

function toMonthValue(d: Date) { return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; }
function formatDate(s: string) {
	return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(s));
}

export default function StudentExtrasPage() {
	const [month, setMonth] = useState(toMonthValue(new Date()));
	const [data, setData] = useState<PreviewResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const load = async () => {
		setLoading(true); setError("");
		try {
			const res = await api.get("/student-extras/me/preview", { params: { month } });
			setData(res.data.data as PreviewResponse);
		} catch (err: any) {
			setError(err.response?.data?.error?.message ?? "Failed to load extras preview");
		} finally { setLoading(false); }
	};

	useEffect(() => { void load(); }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-bold text-slate-900">Extras Preview</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Monthly extras that will flow into billing — grouped by date and item.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
						className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<button type="button" onClick={() => void load()} disabled={loading}
						className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 transition-colors">
						Refresh
					</button>
				</div>
			</div>

			{error && (
				<div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
			)}

			{/* Summary cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				{[
					{ label: "Entries", value: data?.summary.count ?? 0, fmt: false },
					{ label: "Total quantity", value: data?.summary.totalQuantity ?? 0, fmt: false },
					{ label: "Preview total", value: data?.summary.totalAmount ?? 0, fmt: true },
				].map((s) => (
					<div key={s.label} className="bg-white rounded-lg border border-slate-200 p-4">
						<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
						<p className="mt-1 text-2xl font-bold text-slate-900">
							{s.fmt ? `₹${Number(s.value).toFixed(2)}` : s.value}
						</p>
					</div>
				))}
			</div>

			{/* Entries table */}
			<div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
				<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">Extras for {data?.month ?? month}</h2>
					{loading && <span className="text-xs text-slate-400">Loading…</span>}
				</div>
				{!data?.entries.length && !loading ? (
					<p className="text-center py-10 text-sm text-slate-400">No extras added for this month yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-slate-50 border-b border-slate-200">
								<tr>
									{["Date", "Item", "Mess", "Quantity", "Rate", "Amount"].map((h) => (
										<th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{data?.entries.map((entry) => (
									<tr key={entry.id} className="hover:bg-slate-50">
										<td className="px-4 py-3 whitespace-nowrap">{formatDate(entry.date)}</td>
										<td className="px-4 py-3 font-medium text-slate-900">{entry.name}</td>
										<td className="px-4 py-3 text-slate-500">{entry.messName}</td>
										<td className="px-4 py-3 text-slate-600">{entry.quantity} {entry.unit}</td>
										<td className="px-4 py-3 text-slate-600 whitespace-nowrap">₹{entry.unitPrice.toFixed(2)}</td>
										<td className="px-4 py-3 font-semibold whitespace-nowrap">₹{entry.amount.toFixed(2)}</td>
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
