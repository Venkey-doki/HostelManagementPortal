import { api } from "@/lib/api";
import { useEffect, useMemo, useState, type FormEvent } from "react";

interface AttendanceStudentRow {
	studentId: string;
	rollNumber: string;
	firstName: string;
	lastName: string;
	email: string;
}

interface InchargeRosterResponse {
	date: string;
	mess: { id: string; name: string; gender: "MALE" | "FEMALE" };
	waiver: { date: string; reason: string | null } | null;
	students: AttendanceStudentRow[];
}

interface ExtraItem {
	id: string;
	name: string;
	unit: string;
	price: string;
	isActive: boolean;
}

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
		setLoading(true);
		setError("");
		try {
			const rosterResponse = await api.get("/attendance/incharge", {
				params: { date },
			});
			const rosterData = rosterResponse.data
				.data as InchargeRosterResponse;
			setRoster(rosterData);
			setStudentId(
				(current) => current || rosterData.students[0]?.studentId || "",
			);
			if (rosterData.mess?.id) {
				const extrasResponse = await api.get(
					`/messes/${rosterData.mess.id}/extras`,
				);
				const extrasData = extrasResponse.data.data
					.items as ExtraItem[];
				setItems(extrasData);
				setExtraItemId((current) => current || extrasData[0]?.id || "");
			}
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to load extras context",
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, [date]);

	const totalRate = useMemo(
		() => items.reduce((sum, item) => sum + Number(item.price), 0),
		[items],
	);

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!studentId || !extraItemId) {
			setError("Select a student and extra item");
			return;
		}

		setSaving(true);
		setError("");
		setSuccess("");
		try {
			await api.post("/student-extras", {
				studentId,
				extraItemId,
				date,
				quantity: Number(quantity || 1),
			});
			setSuccess("Student extra added successfully.");
			setQuantity("1");
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to add student extra",
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Step 6</p>
					<h1>Student extras</h1>
					<p>
						Add chargeable extras per student per day from the
						current mess roster.
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
							<p className="portal-kicker">Date & roster</p>
							<h2>Select day</h2>
						</div>
						{loading ? (
							<span className="portal-pill">Loading</span>
						) : null}
					</div>
					<label className="portal-form-label">
						Date
						<input
							className="portal-input"
							type="date"
							value={date}
							onChange={(event) => setDate(event.target.value)}
						/>
					</label>
					{roster?.waiver ? (
						<p
							className="portal-helper"
							style={{ marginTop: "8px" }}
						>
							Waived on {roster.waiver.date}
							{roster.waiver.reason
								? ` · ${roster.waiver.reason}`
								: ""}
						</p>
					) : null}
				</div>

				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Preview</p>
							<h2>Current rate base</h2>
						</div>
					</div>
					<div className="portal-grid two">
						<div className="portal-stat">
							<p className="portal-stat-label">
								Configured items
							</p>
							<div className="portal-stat-value">
								{items.length}
							</div>
						</div>
						<div className="portal-stat">
							<p className="portal-stat-label">Base rate total</p>
							<div className="portal-stat-value">
								₹{totalRate.toFixed(2)}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Add charge</p>
						<h2>Per-student extra</h2>
					</div>
				</div>
				<form className="portal-grid two" onSubmit={onSubmit}>
					<label className="portal-form-label">
						Student
						<select
							className="portal-input"
							value={studentId}
							onChange={(event) =>
								setStudentId(event.target.value)
							}
						>
							{roster?.students.map((student) => (
								<option
									key={student.studentId}
									value={student.studentId}
								>
									{student.firstName} {student.lastName} ·{" "}
									{student.rollNumber}
								</option>
							))}
						</select>
					</label>
					<label className="portal-form-label">
						Extra item
						<select
							className="portal-input"
							value={extraItemId}
							onChange={(event) =>
								setExtraItemId(event.target.value)
							}
						>
							{items.map((item) => (
								<option key={item.id} value={item.id}>
									{item.name} · ₹
									{Number(item.price).toFixed(2)} /{" "}
									{item.unit}
								</option>
							))}
						</select>
					</label>
					<label className="portal-form-label">
						Quantity
						<input
							className="portal-input"
							type="number"
							min="0.01"
							step="0.01"
							value={quantity}
							onChange={(event) =>
								setQuantity(event.target.value)
							}
						/>
					</label>
					<div style={{ alignSelf: "end" }}>
						<button
							className="portal-button portal-button-primary"
							type="submit"
							disabled={saving || !roster?.students.length}
						>
							Add extra
						</button>
					</div>
				</form>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Rosters</p>
						<h2>Current students</h2>
					</div>
				</div>
				<div className="portal-table-wrap">
					<table className="portal-table">
						<thead>
							<tr>
								<th>Student</th>
								<th>Roll</th>
								<th>Email</th>
							</tr>
						</thead>
						<tbody>
							{roster?.students.map((student) => (
								<tr key={student.studentId}>
									<td>
										{student.firstName} {student.lastName}
									</td>
									<td>{student.rollNumber}</td>
									<td>{student.email}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
