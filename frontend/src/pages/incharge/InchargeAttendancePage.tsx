import { api } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

interface InchargeStudentRow {
	studentId: string;
	rollNumber: string;
	firstName: string;
	lastName: string;
	email: string;
	attendance: { breakfast: boolean; lunch: boolean; dinner: boolean };
}
interface InchargeRosterResponse {
	date: string;
	mess: { id: string; name: string; gender: "MALE" | "FEMALE" };
	waiver: { date: string; reason: string | null } | null;
	students: InchargeStudentRow[];
}
type AttendanceDraft = Record<
	string,
	{ breakfast: boolean; lunch: boolean; dinner: boolean }
>;

const inputClass =
	"w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function InchargeAttendancePage() {
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
	const [waiverStartDate, setWaiverStartDate] = useState(
		new Date().toISOString().slice(0, 10),
	);
	const [waiverEndDate, setWaiverEndDate] = useState(
		new Date().toISOString().slice(0, 10),
	);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [waiverReason, setWaiverReason] = useState("");
	const [roster, setRoster] = useState<InchargeRosterResponse | null>(null);
	const [draft, setDraft] = useState<AttendanceDraft>({});

	const loadRoster = async () => {
		setLoading(true);
		setError("");
		try {
			const res = await api.get("/attendance/incharge", {
				params: { date },
			});
			const data = res.data.data as InchargeRosterResponse;
			setRoster(data);
			setDraft(
				Object.fromEntries(
					data.students.map((s) => [
						s.studentId,
						{ ...s.attendance },
					]),
				),
			);
			setWaiverReason(data.waiver?.reason ?? "");
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to load attendance roster",
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadRoster();
	}, [date]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		setWaiverStartDate(date);
		setWaiverEndDate(date);
	}, [date]);

	const totals = useMemo(() => {
		const rows = Object.values(draft);
		return {
			breakfast: rows.filter((r) => r.breakfast).length,
			lunch: rows.filter((r) => r.lunch).length,
			dinner: rows.filter((r) => r.dinner).length,
		};
	}, [draft]);

	const updateMeal = (
		sid: string,
		meal: "breakfast" | "lunch" | "dinner",
		val: boolean,
	) => {
		setDraft((c) => ({
			...c,
			[sid]: {
				...(c[sid] ?? {
					breakfast: false,
					lunch: false,
					dinner: false,
				}),
				[meal]: val,
			},
		}));
	};

	const saveSingle = async (sid: string) => {
		setSaving(true);
		setError("");
		setSuccess("");
		try {
			const row = draft[sid];
			if (!row) return;
			await api.patch("/attendance/incharge/mark", {
				studentId: sid,
				date,
				...row,
			});
			setSuccess("Attendance updated.");
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to update attendance",
			);
		} finally {
			setSaving(false);
		}
	};

	const saveBulk = async () => {
		if (!roster || !roster.students.length) return;
		setSaving(true);
		setError("");
		setSuccess("");
		try {
			await api.patch("/attendance/incharge/bulk", {
				date,
				rows: roster.students.map((s) => ({
					studentId: s.studentId,
					...(draft[s.studentId] ?? {
						breakfast: false,
						lunch: false,
						dinner: false,
					}),
				})),
			});
			setSuccess("Bulk attendance saved.");
			await loadRoster();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to bulk save attendance",
			);
		} finally {
			setSaving(false);
		}
	};

	const setWaiver = async () => {
		setSaving(true);
		setError("");
		setSuccess("");
		try {
			await api.post("/attendance/incharge/waivers", {
				startDate: waiverStartDate,
				endDate: waiverEndDate,
				reason: waiverReason || undefined,
			});
			setSuccess(
				waiverStartDate === waiverEndDate
					? "Mess-day waiver set."
					: `Mess holiday range set from ${waiverStartDate} to ${waiverEndDate}.`,
			);
			await loadRoster();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to set waiver",
			);
		} finally {
			setSaving(false);
		}
	};

	const clearWaiver = async () => {
		setSaving(true);
		setError("");
		setSuccess("");
		try {
			await api.delete("/attendance/incharge/waivers", {
				params: { date },
			});
			setSuccess("Mess-day waiver removed.");
			await loadRoster();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to remove waiver",
			);
		} finally {
			setSaving(false);
		}
	};

	const isWaived = !!roster?.waiver;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-bold text-slate-900">
						Mark Attendance
					</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Mark attendance meal-wise. Backdating is allowed. Set a
						waiver for mess holidays.
					</p>
				</div>
				<div className="flex gap-2 items-center">
					{roster?.mess.name && (
						<span className="text-xs px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 font-medium">
							{roster.mess.name}
						</span>
					)}
					<span className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium">
						{roster?.students.length ?? 0} students
					</span>
				</div>
			</div>

			{error && (
				<div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
					{error}
				</div>
			)}
			{success && (
				<div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
					{success}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Date selector */}
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-3">
						Select Date
					</h2>
					<input
						type="date"
						max={new Date().toISOString().slice(0, 10)}
						value={date}
						onChange={(e) => setDate(e.target.value)}
						className={inputClass}
					/>
					<p className="mt-2 text-xs text-slate-400">
						Future dates are not allowed. Backdating to past days is
						permitted.
					</p>
				</div>

				{/* Waiver control */}
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-3">
						Mess-Day Waiver
						{isWaived && (
							<span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
								WAIVED
							</span>
						)}
					</h2>
					{isWaived && (
						<p className="text-xs text-amber-700 mb-3">
							Waived for {roster?.waiver?.date}
							{roster?.waiver?.reason
								? ` · ${roster.waiver.reason}`
								: ""}
						</p>
					)}
					<div className="grid grid-cols-2 gap-2 mb-3">
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">
								From
							</label>
							<input
								type="date"
								max={new Date().toISOString().slice(0, 10)}
								value={waiverStartDate}
								onChange={(e) =>
									setWaiverStartDate(e.target.value)
								}
								className={inputClass}
							/>
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">
								To
							</label>
							<input
								type="date"
								max={new Date().toISOString().slice(0, 10)}
								value={waiverEndDate}
								onChange={(e) =>
									setWaiverEndDate(e.target.value)
								}
								className={inputClass}
							/>
						</div>
					</div>
					<input
						type="text"
						value={waiverReason}
						onChange={(e) => setWaiverReason(e.target.value)}
						placeholder="Waiver reason (holiday / event)…"
						className={inputClass}
					/>
					<div className="flex gap-2 mt-3">
						<button
							type="button"
							onClick={() => void setWaiver()}
							disabled={saving}
							className="flex-1 py-2 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors"
						>
							Set waiver
						</button>
						<button
							type="button"
							onClick={() => void clearWaiver()}
							disabled={saving || !isWaived}
							className="flex-1 py-2 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-60 transition-colors"
						>
							Remove waiver
						</button>
					</div>
				</div>
			</div>

			{/* Totals */}
			<div className="grid grid-cols-3 gap-4">
				{[
					{ label: "Breakfast", value: totals.breakfast },
					{ label: "Lunch", value: totals.lunch },
					{ label: "Dinner", value: totals.dinner },
				].map((s) => (
					<div
						key={s.label}
						className="bg-white rounded-lg border border-slate-200 p-4 text-center"
					>
						<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
							{s.label} marked
						</p>
						<p className="mt-1 text-2xl font-bold text-slate-900">
							{s.value}
						</p>
					</div>
				))}
			</div>

			{/* Roster table */}
			<div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
				<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
					<h2 className="text-sm font-semibold text-slate-900">
						Daily Roster
					</h2>
					<div className="flex gap-2">
						{loading && (
							<span className="text-xs text-slate-400">
								Loading…
							</span>
						)}
						<button
							type="button"
							onClick={() => void loadRoster()}
							disabled={loading || saving}
							className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-60 transition-colors"
						>
							Refresh
						</button>
						<button
							type="button"
							onClick={() => void saveBulk()}
							disabled={loading || saving || isWaived}
							className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-60 transition-colors"
						>
							Save all
						</button>
					</div>
				</div>
				{!loading && !roster?.students.length ? (
					<p className="text-center py-10 text-sm text-slate-400">
						No students assigned to this mess for the selected date.
					</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="bg-slate-50 border-b border-slate-200">
								<tr>
									{[
										"Student",
										"Roll No.",
										"Breakfast",
										"Lunch",
										"Dinner",
										"",
									].map((h) => (
										<th
											key={h}
											className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{(roster?.students ?? []).map((s) => (
									<tr
										key={s.studentId}
										className="hover:bg-slate-50"
									>
										<td className="px-4 py-3">
											<p className="font-medium text-slate-900">
												{s.firstName} {s.lastName}
											</p>
											<p className="text-xs text-slate-400">
												{s.email}
											</p>
										</td>
										<td className="px-4 py-3 font-mono text-xs text-slate-600">
											{s.rollNumber}
										</td>
										{(
											[
												"breakfast",
												"lunch",
												"dinner",
											] as const
										).map((meal) => (
											<td
												key={meal}
												className="px-4 py-3"
											>
												<input
													type="checkbox"
													checked={
														draft[s.studentId]?.[
															meal
														] ?? false
													}
													onChange={(e) =>
														updateMeal(
															s.studentId,
															meal,
															e.target.checked,
														)
													}
													disabled={
														isWaived || saving
													}
													className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
												/>
											</td>
										))}
										<td className="px-4 py-3">
											<button
												type="button"
												onClick={() =>
													void saveSingle(s.studentId)
												}
												disabled={isWaived || saving}
												className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-60 transition-colors"
											>
												Save
											</button>
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
