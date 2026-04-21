import { api } from "@/lib/api";
import { useEffect, useState } from "react";

interface StudentRecord {
	id: string;
	rollNumber: string;
	gender: "MALE" | "FEMALE";
	isActive: boolean;
	user: { id: string; email: string; firstName: string; lastName: string };
	hostelAssignments: Array<{ id: string; hostel: { id: string; name: string }; room: { id: string; roomNumber: string } }>;
	messAssignments: Array<{ id: string; mess: { id: string; name: string } }>;
}

export default function WardenStudentsListPage() {
	const [students, setStudents] = useState<StudentRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [search, setSearch] = useState("");

	const load = async () => {
		setLoading(true); setError("");
		try {
			const res = await api.get("/students", { params: { page: 1, limit: 50, ...(search ? { search } : {}) } });
			setStudents(res.data.data as StudentRecord[]);
		} catch (err: any) {
			setError(err.response?.data?.error?.message ?? "Failed to load students");
		} finally { setLoading(false); }
	};

	useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-bold text-slate-900">Students</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Student directory with current hostel and mess assignments.
					</p>
				</div>
				<span className="text-xs font-medium text-slate-400">{students.length} loaded</span>
			</div>

			{error && (
				<div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
			)}

			{/* Search */}
			<div className="flex gap-2">
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && void load()}
					placeholder="Search by name, email, or roll number…"
					className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<button type="button" onClick={() => void load()} disabled={loading}
					className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-60 transition-colors">
					Search
				</button>
				<button type="button" onClick={() => { setSearch(""); void load(); }}
					className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors">
					Reset
				</button>
			</div>

			{/* Table */}
			<div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
				<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">Student Directory</h2>
					{loading && <span className="text-xs text-slate-400">Loading…</span>}
				</div>
				{!students.length && !loading ? (
					<p className="text-center py-10 text-sm text-slate-400">No students found.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-slate-50 border-b border-slate-200">
								<tr>
									{["Roll No.", "Name", "Email", "Gender", "Hostel / Room", "Mess", "Status"].map((h) => (
										<th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{students.map((s) => {
									const hostel = s.hostelAssignments[0];
									const mess = s.messAssignments[0];
									return (
										<tr key={s.id} className="hover:bg-slate-50">
											<td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">{s.rollNumber}</td>
											<td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
												{s.user.firstName} {s.user.lastName}
											</td>
											<td className="px-4 py-3 text-slate-500 text-xs">{s.user.email}</td>
											<td className="px-4 py-3">
												<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.gender === "MALE" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"}`}>
													{s.gender}
												</span>
											</td>
											<td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
												{hostel ? `${hostel.hostel.name} · ${hostel.room.roomNumber}` : "—"}
											</td>
											<td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
												{mess?.mess.name ?? "—"}
											</td>
											<td className="px-4 py-3">
												<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
													{s.isActive ? "Active" : "Inactive"}
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
