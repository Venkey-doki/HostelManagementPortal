import { api } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

interface InchargeStudentRow {
	studentId: string;
	rollNumber: string;
	firstName: string;
	lastName: string;
	email: string;
	attendance: {
		breakfast: boolean;
		lunch: boolean;
		dinner: boolean;
	};
}

interface InchargeRosterResponse {
	date: string;
	mess: {
		id: string;
		name: string;
		gender: "MALE" | "FEMALE";
	};
	waiver: {
		date: string;
		reason: string | null;
	} | null;
	students: InchargeStudentRow[];
}

type AttendanceDraft = Record<
	string,
	{ breakfast: boolean; lunch: boolean; dinner: boolean }
>;

export default function InchargeAttendancePage() {
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
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
			const response = await api.get("/attendance/incharge", {
				params: { date },
			});
			const data = response.data.data as InchargeRosterResponse;
			setRoster(data);
			setDraft(
				Object.fromEntries(
					data.students.map((student) => [
						student.studentId,
						{ ...student.attendance },
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [date]);

	const totals = useMemo(() => {
		const rows = Object.values(draft);
		return {
			breakfast: rows.filter((row) => row.breakfast).length,
			lunch: rows.filter((row) => row.lunch).length,
			dinner: rows.filter((row) => row.dinner).length,
		};
	}, [draft]);

	const updateMeal = (
		studentId: string,
		meal: "breakfast" | "lunch" | "dinner",
		value: boolean,
	) => {
		setDraft((current) => ({
			...current,
			[studentId]: {
				...(current[studentId] ?? {
					breakfast: false,
					lunch: false,
					dinner: false,
				}),
				[meal]: value,
			},
		}));
	};

	const saveSingle = async (studentId: string) => {
		setSaving(true);
		setError("");
		setSuccess("");
		try {
			const row = draft[studentId];
			if (!row) return;

			await api.patch("/attendance/incharge/mark", {
				studentId,
				date,
				breakfast: row.breakfast,
				lunch: row.lunch,
				dinner: row.dinner,
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
		if (!roster || roster.students.length === 0) return;

		setSaving(true);
		setError("");
		setSuccess("");
		try {
			await api.patch("/attendance/incharge/bulk", {
				date,
				rows: roster.students.map((student) => ({
					studentId: student.studentId,
					breakfast: draft[student.studentId]?.breakfast ?? false,
					lunch: draft[student.studentId]?.lunch ?? false,
					dinner: draft[student.studentId]?.dinner ?? false,
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
				date,
				reason: waiverReason || undefined,
			});
			setSuccess("Mess-day waiver set.");
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

	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Step 4</p>
					<h1>Attendance marking</h1>
					<p>
						Mark attendance meal-wise, support backdates, and
						control mess-day waivers from one screen.
					</p>
				</div>
				<div className="portal-actions">
					<span className="portal-pill accent">
						{roster?.mess.name ?? "Mess"}
					</span>
					<span className="portal-pill">
						{roster?.students.length ?? 0} students
					</span>
				</div>
			</section>

			{error ? <div className="portal-alert error">{error}</div> : null}
			{success ? (
				<div className="portal-alert success">{success}</div>
			) : null}

			<div className="portal-grid two">
				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Date controls</p>
							<h2>Select attendance date</h2>
						</div>
					</div>
					<label className="portal-form-label">
						Attendance date
						<input
							className="portal-input"
							type="date"
							max={new Date().toISOString().slice(0, 10)}
							value={date}
							onChange={(event) => setDate(event.target.value)}
						/>
					</label>
					<p className="portal-helper" style={{ marginTop: "8px" }}>
						Backdating is allowed for past days. Future dates are
						blocked.
					</p>
				</div>

				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Waiver control</p>
							<h2>Mess-day waiver</h2>
						</div>
					</div>
					<label className="portal-form-label">
						Waiver reason (optional)
						<input
							className="portal-input"
							value={waiverReason}
							onChange={(event) =>
								setWaiverReason(event.target.value)
							}
							placeholder="Special event / holiday"
						/>
					</label>
					<div
						className="portal-actions"
						style={{ marginTop: "12px" }}
					>
						<button
							className="portal-button portal-button-primary"
							type="button"
							onClick={() => void setWaiver()}
							disabled={saving}
						>
							Set waiver
						</button>
						<button
							className="portal-button portal-button-danger"
							type="button"
							onClick={() => void clearWaiver()}
							disabled={saving || !roster?.waiver}
						>
							Remove waiver
						</button>
					</div>
					{roster?.waiver ? (
						<p
							className="portal-helper"
							style={{ marginTop: "10px" }}
						>
							Waived for {roster.waiver.date}
							{roster.waiver.reason
								? ` · ${roster.waiver.reason}`
								: ""}
						</p>
					) : null}
				</div>
			</div>

			<div className="portal-grid three">
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Breakfast marked</p>
					<div className="portal-stat-value">{totals.breakfast}</div>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Lunch marked</p>
					<div className="portal-stat-value">{totals.lunch}</div>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Dinner marked</p>
					<div className="portal-stat-value">{totals.dinner}</div>
				</div>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Daily roster</p>
						<h2>Per-meal toggles</h2>
					</div>
					<div className="portal-actions">
						{loading ? (
							<span className="portal-pill">Loading</span>
						) : null}
						<button
							className="portal-button portal-button-secondary"
							type="button"
							onClick={() => void loadRoster()}
							disabled={loading || saving}
						>
							Refresh
						</button>
						<button
							className="portal-button portal-button-primary"
							type="button"
							onClick={() => void saveBulk()}
							disabled={loading || saving || !!roster?.waiver}
						>
							Save all
						</button>
					</div>
				</div>

				{!loading && !roster?.students.length ? (
					<div className="portal-empty">
						No students assigned to this mess/date.
					</div>
				) : null}

				<div className="portal-table-wrap">
					<table className="portal-table">
						<thead>
							<tr>
								<th>Student</th>
								<th>Roll</th>
								<th>Breakfast</th>
								<th>Lunch</th>
								<th>Dinner</th>
								<th>Action</th>
							</tr>
						</thead>
						<tbody>
							{(roster?.students ?? []).map((student) => (
								<tr key={student.studentId}>
									<td>
										{student.firstName} {student.lastName}
										<div className="portal-helper">
											{student.email}
										</div>
									</td>
									<td>{student.rollNumber}</td>
									<td>
										<input
											type="checkbox"
											checked={
												draft[student.studentId]
													?.breakfast ?? false
											}
											onChange={(event) =>
												updateMeal(
													student.studentId,
													"breakfast",
													event.target.checked,
												)
											}
											disabled={
												!!roster?.waiver || saving
											}
										/>
									</td>
									<td>
										<input
											type="checkbox"
											checked={
												draft[student.studentId]
													?.lunch ?? false
											}
											onChange={(event) =>
												updateMeal(
													student.studentId,
													"lunch",
													event.target.checked,
												)
											}
											disabled={
												!!roster?.waiver || saving
											}
										/>
									</td>
									<td>
										<input
											type="checkbox"
											checked={
												draft[student.studentId]
													?.dinner ?? false
											}
											onChange={(event) =>
												updateMeal(
													student.studentId,
													"dinner",
													event.target.checked,
												)
											}
											disabled={
												!!roster?.waiver || saving
											}
										/>
									</td>
									<td>
										<button
											className="portal-button portal-button-secondary"
											type="button"
											onClick={() =>
												void saveSingle(
													student.studentId,
												)
											}
											disabled={
												!!roster?.waiver || saving
											}
										>
											Save
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
