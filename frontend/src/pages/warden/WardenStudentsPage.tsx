import { api } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

interface StudentRecord {
	id: string; rollNumber: string; gender: "MALE" | "FEMALE"; isActive: boolean;
	user: { id: string; email: string; firstName: string; lastName: string; isActive: boolean };
	hostelAssignments: Array<{ id: string; hostel: { id: string; name: string }; room: { id: string; roomNumber: string } }>;
	messAssignments: Array<{ id: string; mess: { id: string; name: string } }>;
}
interface ChoiceItem {
	id: string; name: string; isActive?: boolean;
	rooms?: Array<{ id: string; roomNumber: string; capacity: number; isActive?: boolean }>;
}
interface AssignmentHistoryResponse {
	hostelAssignments: Array<{ id: string; startDate: string; endDate: string | null; hostel: { id: string; name: string }; room: { id: string; roomNumber: string } }>;
	messAssignments: Array<{ id: string; startDate: string; endDate: string | null; mess: { id: string; name: string } }>;
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function WardenStudentsPage() {
	const [students, setStudents] = useState<StudentRecord[]>([]);
	const [hostels, setHostels] = useState<ChoiceItem[]>([]);
	const [messes, setMesses] = useState<ChoiceItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [search, setSearch] = useState("");
	const [selectedStudentId, setSelectedStudentId] = useState("");
	const [filters] = useState({ page: 1, limit: 20 });
	const [assignment, setAssignment] = useState({ hostelId: "", roomId: "", messId: "", startDate: new Date().toISOString().slice(0, 10) });
	const [history, setHistory] = useState<AssignmentHistoryResponse | null>(null);

	const selectedStudent = useMemo(() => students.find((s) => s.id === selectedStudentId) ?? null, [students, selectedStudentId]);

	const loadSupportingData = async () => {
		const [hr, mr] = await Promise.all([api.get("/warden/hostels"), api.get("/warden/messes")]);
		setHostels(hr.data.data); setMesses(mr.data.data);
	};

	const loadStudents = async () => {
		setLoading(true); setError("");
		try {
			const res = await api.get("/students", { params: { page: filters.page, limit: filters.limit, ...(search ? { search } : {}) } });
			setStudents(res.data.data);
			setSelectedStudentId((c) => c || res.data.data[0]?.id || "");
		} catch (err: any) { setError(err.response?.data?.error?.message ?? "Failed to load students"); }
		finally { setLoading(false); }
	};

	const refreshPage = async () => {
		try { await Promise.all([loadSupportingData(), loadStudents()]); }
		catch (err: any) { setError(err.response?.data?.error?.message ?? "Failed to load page data"); setLoading(false); }
	};

	useEffect(() => { void refreshPage(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (!selectedStudentId) { setHistory(null); return; }
		api.get(`/students/${selectedStudentId}/assignment-history`)
			.then((res) => setHistory(res.data.data))
			.catch(() => setHistory(null));
	}, [selectedStudentId]);

	const currentHostel = selectedStudent?.hostelAssignments[0];
	const currentMess = selectedStudent?.messAssignments[0];
	const currentHostelRooms = hostels.find((h) => h.id === assignment.hostelId)?.rooms ?? [];

	const sa = (key: keyof typeof assignment, val: string) => setAssignment((c) => ({ ...c, [key]: val }));

	const onAssignHostel = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedStudentId || !assignment.hostelId || !assignment.roomId) { setError("Select a student, hostel, and room."); return; }
		setError(""); setSuccess("");
		try {
			await api.post(`/students/${selectedStudentId}/hostel-assignment`, { hostelId: assignment.hostelId, roomId: assignment.roomId, startDate: new Date(assignment.startDate).toISOString() });
			setSuccess("Hostel assigned."); await loadStudents();
		} catch (err: any) { setError(err.response?.data?.error?.message ?? "Failed to assign hostel"); }
	};

	const onAssignMess = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedStudentId || !assignment.messId) { setError("Select a student and mess."); return; }
		setError(""); setSuccess("");
		try {
			await api.post(`/students/${selectedStudentId}/mess-assignment`, { messId: assignment.messId, startDate: new Date(assignment.startDate).toISOString() });
			setSuccess("Mess assigned."); await loadStudents();
		} catch (err: any) { setError(err.response?.data?.error?.message ?? "Failed to assign mess"); }
	};

	const onEndHostel = async () => {
		if (!selectedStudentId) return;
		setError(""); setSuccess("");
		try {
			await api.patch(`/students/${selectedStudentId}/hostel-assignment/end`, { endDate: new Date().toISOString() });
			setSuccess("Hostel assignment ended."); await loadStudents();
		} catch (err: any) { setError(err.response?.data?.error?.message ?? "Failed to end hostel assignment"); }
	};

	const onEndMess = async () => {
		if (!selectedStudentId) return;
		setError(""); setSuccess("");
		try {
			await api.patch(`/students/${selectedStudentId}/mess-assignment/end`, { endDate: new Date().toISOString() });
			setSuccess("Mess assignment ended."); await loadStudents();
		} catch (err: any) { setError(err.response?.data?.error?.message ?? "Failed to end mess assignment"); }
	};

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-bold text-slate-900">Students</h1>
					<p className="mt-0.5 text-sm text-slate-500">Search students and assign hostel or mess from one screen.</p>
				</div>
				<span className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium">{students.length} loaded</span>
			</div>

			{error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
			{success && <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">{success}</div>}

			{/* Search bar */}
			<div className="flex gap-2">
				<input type="text" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void loadStudents()}
					placeholder="Search by name, email, or roll number…" className={`flex-1 ${inputClass}`} />
				<button type="button" onClick={() => void loadStudents()} className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors">Search</button>
				<button type="button" onClick={() => { setSearch(""); void loadStudents(); }} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors">Reset</button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Student list */}
				<div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
					<div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
						<h2 className="text-sm font-semibold text-slate-900">Directory</h2>
						{loading && <span className="text-xs text-slate-400">Loading…</span>}
					</div>
					{!students.length && !loading ? (
						<p className="text-center py-8 text-sm text-slate-400">No students found.</p>
					) : (
						<div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
							{students.map((s) => (
								<button key={s.id} type="button" onClick={() => setSelectedStudentId(s.id)}
									className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selectedStudentId === s.id ? "bg-blue-50 border-l-2 border-blue-600" : ""}`}>
									<p className="text-sm font-medium text-slate-900">{s.user.firstName} {s.user.lastName}</p>
									<p className="text-xs text-slate-400 mt-0.5">{s.rollNumber} · {s.gender}</p>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Student snapshot + history */}
				<div className="lg:col-span-2 space-y-4">
					{selectedStudent && (
						<div className="bg-white rounded-lg border border-slate-200 p-5">
							<div className="flex items-start justify-between gap-3 mb-4">
								<div>
									<p className="text-sm font-bold text-slate-900">{selectedStudent.user.firstName} {selectedStudent.user.lastName}</p>
									<p className="text-xs text-slate-500">{selectedStudent.rollNumber} · {selectedStudent.user.email}</p>
								</div>
								<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${selectedStudent.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
									{selectedStudent.isActive ? "Active" : "Inactive"}
								</span>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-xs font-medium text-slate-500 mb-1">Current hostel</p>
									<p className="text-sm text-slate-900">{currentHostel ? `${currentHostel.hostel.name} · Room ${currentHostel.room.roomNumber}` : "Not assigned"}</p>
									{currentHostel && (
										<button type="button" onClick={() => void onEndHostel()} className="mt-1 text-xs text-red-600 hover:underline">
											End assignment →
										</button>
									)}
								</div>
								<div>
									<p className="text-xs font-medium text-slate-500 mb-1">Current mess</p>
									<p className="text-sm text-slate-900">{currentMess?.mess.name ?? "Not assigned"}</p>
									{currentMess && (
										<button type="button" onClick={() => void onEndMess()} className="mt-1 text-xs text-red-600 hover:underline">
											End assignment →
										</button>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Assign hostel */}
					<div className="bg-white rounded-lg border border-slate-200 p-5">
						<h2 className="text-sm font-semibold text-slate-900 mb-4">Assign Hostel</h2>
						<form onSubmit={onAssignHostel} className="space-y-3">
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">Student</label>
								<select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className={inputClass}>
									{students.map((s) => <option key={s.id} value={s.id}>{s.rollNumber} — {s.user.firstName} {s.user.lastName}</option>)}
								</select>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs font-medium text-slate-700 mb-1">Hostel</label>
									<select value={assignment.hostelId} onChange={(e) => { sa("hostelId", e.target.value); sa("roomId", ""); }} className={inputClass}>
										<option value="">Select hostel</option>
										{hostels.filter((h) => h.isActive).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
									</select>
								</div>
								<div>
									<label className="block text-xs font-medium text-slate-700 mb-1">Room</label>
									<select value={assignment.roomId} onChange={(e) => sa("roomId", e.target.value)} className={inputClass}>
										<option value="">Select room</option>
										{currentHostelRooms.filter((r) => r.isActive).map((r) => <option key={r.id} value={r.id}>{r.roomNumber} (cap {r.capacity})</option>)}
									</select>
								</div>
							</div>
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">Start date</label>
								<input type="date" value={assignment.startDate} onChange={(e) => sa("startDate", e.target.value)} className={inputClass} />
							</div>
							<button type="submit" className="w-full py-2 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors">
								Assign hostel
							</button>
						</form>
					</div>

					{/* Assign mess */}
					<div className="bg-white rounded-lg border border-slate-200 p-5">
						<h2 className="text-sm font-semibold text-slate-900 mb-4">Assign Mess</h2>
						<form onSubmit={onAssignMess} className="space-y-3">
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">Mess</label>
								<select value={assignment.messId} onChange={(e) => sa("messId", e.target.value)} className={inputClass}>
									<option value="">Select mess</option>
									{messes.filter((m) => m.isActive).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
								</select>
							</div>
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">Start date</label>
								<input type="date" value={assignment.startDate} onChange={(e) => sa("startDate", e.target.value)} className={inputClass} />
							</div>
							<button type="submit" className="w-full py-2 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
								Assign mess
							</button>
						</form>
					</div>

					{/* History */}
					{history && (
						<div className="bg-white rounded-lg border border-slate-200 p-5">
							<h2 className="text-sm font-semibold text-slate-900 mb-3">Assignment History</h2>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<p className="text-xs font-medium text-slate-500 mb-2">Hostel history</p>
									{!history.hostelAssignments.length ? (
										<p className="text-xs text-slate-400">None</p>
									) : history.hostelAssignments.map((h) => (
										<p key={h.id} className="text-xs text-slate-600 mb-1">
											{h.hostel.name} · Room {h.room.roomNumber} · {new Date(h.startDate).toLocaleDateString()} — {h.endDate ? new Date(h.endDate).toLocaleDateString() : "current"}
										</p>
									))}
								</div>
								<div>
									<p className="text-xs font-medium text-slate-500 mb-2">Mess history</p>
									{!history.messAssignments.length ? (
										<p className="text-xs text-slate-400">None</p>
									) : history.messAssignments.map((m) => (
										<p key={m.id} className="text-xs text-slate-600 mb-1">
											{m.mess.name} · {new Date(m.startDate).toLocaleDateString()} — {m.endDate ? new Date(m.endDate).toLocaleDateString() : "current"}
										</p>
									))}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
