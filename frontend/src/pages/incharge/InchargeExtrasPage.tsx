import { api } from "@/lib/api";
import { useEffect, useMemo, useState, type FormEvent } from "react";

interface AttendanceStudentRow {
	studentId: string; rollNumber: string; firstName: string; lastName: string; email: string;
}
interface InchargeRosterResponse {
	date: string;
	mess: { id: string; name: string; gender: "MALE" | "FEMALE" };
	waiver: { date: string; reason: string | null } | null;
	students: AttendanceStudentRow[];
}
interface ExtraItem { id: string; name: string; unit: string; price: string; isActive: boolean; }

const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function InchargeExtrasPage() {
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
	const [roster, setRoster] = useState<InchargeRosterResponse | null>(null);
	const [items, setItems] = useState<ExtraItem[]>([]);
	const [studentId, setStudentId] = useState("");
	const [extraItemId, setExtraItemId] = useState("");
	const [quantity, setQuantity] = useState("1");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const load = async () => {
		setLoading(true); setError("");
		try {
			const rosterRes = await api.get("/attendance/incharge", { params: { date } });
			const rosterData = rosterRes.data.data as InchargeRosterResponse;
			setRoster(rosterData);
			setStudentId((c) => c || rosterData.students[0]?.studentId || "");
			if (rosterData.mess?.id) {
				const extrasRes = await api.get(`/messes/${rosterData.mess.id}/extras`);
				const extrasData = extrasRes.data.data.items as ExtraItem[];
				setItems(extrasData);
				setExtraItemId((c) => c || extrasData[0]?.id || "");
			}
		} catch (err: any) { setError(err.response?.data?.error?.message ?? "Failed to load extras context"); }
		finally { setLoading(false); }
	};

	useEffect(() => { void load(); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

	const activeItems = useMemo(() => items.filter((i) => i.isActive), [items]);

	const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!studentId || !extraItemId) { setError("Select a student and extra item"); return; }
		setSaving(true); setError(""); setSuccess("");
		try {
			await api.post("/student-extras", { studentId, extraItemId, date, quantity: Number(quantity || 1) });
			setSuccess("Student extra added successfully.");
			setQuantity("1");
		} catch (err: any) { setError(err.response?.data?.error?.message ?? "Failed to add student extra"); }
		finally { setSaving(false); }
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-bold text-slate-900">Extras</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Add chargeable extras per student per day from the current mess roster.
					</p>
				</div>
				{roster?.mess.name && (
					<span className="text-xs px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 font-medium">{roster.mess.name}</span>
				)}
			</div>

			{error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
			{success && <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">{success}</div>}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Date and context */}
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-3">Date & Context</h2>
					{loading && <p className="text-xs text-slate-400 mb-2">Loading roster…</p>}
					<div className="mb-3">
						<label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
						<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectClass} />
					</div>
					{roster?.waiver && (
						<p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
							Waived on {roster.waiver.date}{roster.waiver.reason ? ` · ${roster.waiver.reason}` : ""}
						</p>
					)}
					<div className="mt-4 grid grid-cols-2 gap-3">
						<div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
							<p className="text-xs text-slate-500">Items configured</p>
							<p className="text-xl font-bold text-slate-900">{activeItems.length}</p>
						</div>
						<div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center">
							<p className="text-xs text-slate-500">Students in roster</p>
							<p className="text-xl font-bold text-slate-900">{roster?.students.length ?? 0}</p>
						</div>
					</div>
				</div>

				{/* Add extra form */}
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-4">Add Student Extra</h2>
					<form onSubmit={onSubmit} className="space-y-3">
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">Student</label>
							<select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={selectClass}>
								{roster?.students.map((s) => (
									<option key={s.studentId} value={s.studentId}>
										{s.firstName} {s.lastName} · {s.rollNumber}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">Extra item</label>
							<select value={extraItemId} onChange={(e) => setExtraItemId(e.target.value)} className={selectClass}>
								{activeItems.map((item) => (
									<option key={item.id} value={item.id}>
										{item.name} · ₹{Number(item.price).toFixed(2)} / {item.unit}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">Quantity</label>
							<input type="number" min="0.01" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={selectClass} />
						</div>
						<button type="submit" disabled={saving || !roster?.students.length}
							className="w-full py-2.5 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors">
							{saving ? "Adding…" : "Add extra"}
						</button>
					</form>
				</div>
			</div>

			{/* Roster table */}
			<div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
				<div className="px-5 py-4 border-b border-slate-100">
					<h2 className="text-sm font-semibold text-slate-900">Current Mess Roster</h2>
				</div>
				{!roster?.students.length && !loading ? (
					<p className="text-center py-10 text-sm text-slate-400">No students in this mess for the selected date.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-slate-50 border-b border-slate-200">
								<tr>
									{["Roll No.", "Name", "Email"].map((h) => (
										<th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{roster?.students.map((s) => (
									<tr key={s.studentId} className="hover:bg-slate-50">
										<td className="px-4 py-3 font-mono text-xs text-slate-600">{s.rollNumber}</td>
										<td className="px-4 py-3 font-medium text-slate-900">{s.firstName} {s.lastName}</td>
										<td className="px-4 py-3 text-slate-500 text-xs">{s.email}</td>
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
