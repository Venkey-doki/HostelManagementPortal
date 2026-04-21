import { api } from "@/lib/api";
import { useEffect, useMemo, useState, type FormEvent } from "react";

interface Mess { id: string; name: string; gender: "MALE" | "FEMALE"; perDayCharge: string; isActive: boolean; }
interface ExtraItem { id: string; name: string; unit: string; price: string; isActive: boolean; }

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function AdminExtrasPage() {
	const [messes, setMesses] = useState<Mess[]>([]);
	const [selectedMessId, setSelectedMessId] = useState("");
	const [items, setItems] = useState<ExtraItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [itemsLoading, setItemsLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [form, setForm] = useState({ name: "", unit: "cup", price: "0" });

	const loadMesses = async () => {
		setLoading(true); setError("");
		try {
			const res = await api.get("/warden/messes");
			setMesses(res.data.data);
			setSelectedMessId((c) => c || res.data.data[0]?.id || "");
		} catch (err: any) { setError(err.response?.data?.error?.message ?? "Failed to load messes"); }
		finally { setLoading(false); }
	};

	const loadItems = async (messId: string) => {
		if (!messId) { setItems([]); return; }
		setItemsLoading(true); setError("");
		try {
			const res = await api.get(`/messes/${messId}/extras`);
			setItems(res.data.data.items);
		} catch (err: any) { setError(err.response?.data?.error?.message ?? "Failed to load extras"); }
		finally { setItemsLoading(false); }
	};

	useEffect(() => { void loadMesses(); }, []);
	useEffect(() => { if (selectedMessId) void loadItems(selectedMessId); }, [selectedMessId]);

	const selectedMess = useMemo(() => messes.find((m) => m.id === selectedMessId) ?? null, [messes, selectedMessId]);
	const totalPrice = useMemo(() => items.reduce((s, i) => s + Number(i.price), 0), [items]);

	const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!selectedMessId) { setError("Select a mess first"); return; }
		setError(""); setSuccess("");
		try {
			await api.post(`/messes/${selectedMessId}/extras`, { name: form.name, unit: form.unit, price: Number(form.price) });
			setForm({ name: "", unit: "cup", price: "0" });
			setSuccess("Extra item created successfully.");
			await loadItems(selectedMessId);
		} catch (err: any) { setError(err.response?.data?.error?.message ?? "Failed to create extra item"); }
	};

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-bold text-slate-900">Extras Configuration</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Configure mess-level chargeable extras before incharge staff add them to student bills.
					</p>
				</div>
				<div className="flex gap-2">
					<span className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium">{messes.length} messes</span>
					<span className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium">{items.length} items</span>
				</div>
			</div>

			{error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
			{success && <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">{success}</div>}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Mess selector */}
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-3">Select Mess</h2>
					{loading && <p className="text-xs text-slate-400 mb-2">Loading messes…</p>}
					<select value={selectedMessId} onChange={(e) => setSelectedMessId(e.target.value)} className={inputClass}>
						{messes.map((m) => (
							<option key={m.id} value={m.id}>{m.name} ({m.gender})</option>
						))}
					</select>
					{selectedMess && (
						<p className="mt-2 text-xs text-slate-500">
							Base charge: ₹{Number(selectedMess.perDayCharge).toFixed(2)}/day · Total extras base: ₹{totalPrice.toFixed(2)}
						</p>
					)}
				</div>

				{/* Add extra form */}
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-4">New Extra Item</h2>
					<form onSubmit={onSubmit} className="space-y-3">
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">Item name</label>
								<input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. Chicken curry" className={inputClass} />
							</div>
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
								<input value={form.unit} onChange={(e) => setForm((c) => ({ ...c, unit: e.target.value }))} placeholder="cup, plate, glass…" className={inputClass} />
							</div>
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">Price (₹)</label>
							<input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((c) => ({ ...c, price: e.target.value }))} className={inputClass} />
						</div>
						<button type="submit" disabled={loading || !selectedMessId}
							className="w-full py-2.5 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors">
							Create extra
						</button>
					</form>
				</div>
			</div>

			{/* Items table */}
			<div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
				<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">
						{selectedMess?.name ?? "Mess"} — configured extras
					</h2>
					{itemsLoading && <span className="text-xs text-slate-400">Loading…</span>}
				</div>
				{!items.length && !itemsLoading ? (
					<p className="text-center py-10 text-sm text-slate-400">No extras configured for this mess yet.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-slate-50 border-b border-slate-200">
								<tr>
									{["Name", "Unit", "Price", "Status"].map((h) => (
										<th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{items.map((item) => (
									<tr key={item.id} className="hover:bg-slate-50">
										<td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
										<td className="px-4 py-3 text-slate-500">{item.unit}</td>
										<td className="px-4 py-3 font-semibold">₹{Number(item.price).toFixed(2)}</td>
										<td className="px-4 py-3">
											<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
												{item.isActive ? "Active" : "Inactive"}
											</span>
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
