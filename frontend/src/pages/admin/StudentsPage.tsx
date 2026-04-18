import { api } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

interface StudentRecord {
	id: string;
	rollNumber: string;
	gender: "MALE" | "FEMALE";
	isActive: boolean;
	user: {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		isActive: boolean;
	};
	hostelAssignments: Array<{
		id: string;
		hostel: { id: string; name: string };
		room: { id: string; roomNumber: string };
	}>;
	messAssignments: Array<{
		id: string;
		mess: { id: string; name: string };
	}>;
}

interface ChoiceItem {
	id: string;
	name: string;
	isActive?: boolean;
	gender?: "MALE" | "FEMALE";
	rooms?: Array<{
		id: string;
		roomNumber: string;
		capacity: number;
		isActive?: boolean;
	}>;
}

interface AssignmentHistoryResponse {
	hostelAssignments: Array<{
		id: string;
		startDate: string;
		endDate: string | null;
		hostel: { id: string; name: string };
		room: { id: string; roomNumber: string };
	}>;
	messAssignments: Array<{
		id: string;
		startDate: string;
		endDate: string | null;
		mess: { id: string; name: string };
	}>;
}

export default function StudentsPage() {
	const [students, setStudents] = useState<StudentRecord[]>([]);
	const [hostels, setHostels] = useState<ChoiceItem[]>([]);
	const [messes, setMesses] = useState<ChoiceItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [search, setSearch] = useState("");
	const [selectedStudentId, setSelectedStudentId] = useState("");
	const [filters] = useState({ page: 1, limit: 20 });
	const [assignment, setAssignment] = useState({
		hostelId: "",
		roomId: "",
		messId: "",
		startDate: new Date().toISOString().slice(0, 10),
	});
	const [history, setHistory] = useState<AssignmentHistoryResponse | null>(
		null,
	);

	const selectedStudent = useMemo(
		() =>
			students.find((student) => student.id === selectedStudentId) ??
			null,
		[students, selectedStudentId],
	);

	const loadSupportingData = async () => {
		const [hostelsResponse, messesResponse] = await Promise.all([
			api.get("/admin/hostels"),
			api.get("/admin/messes"),
		]);

		setHostels(hostelsResponse.data.data);
		setMesses(messesResponse.data.data);
	};

	const loadStudents = async () => {
		setLoading(true);
		setError("");
		try {
			const response = await api.get("/students", {
				params: {
					page: filters.page,
					limit: filters.limit,
					...(search ? { search } : {}),
				},
			});
			setStudents(response.data.data);
			setSelectedStudentId(
				(current) => current || response.data.data[0]?.id || "",
			);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to load students",
			);
		} finally {
			setLoading(false);
		}
	};

	const refreshPage = async () => {
		try {
			await Promise.all([loadSupportingData(), loadStudents()]);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to load page data",
			);
			setLoading(false);
		}
	};

	useEffect(() => {
		void refreshPage();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!selectedStudentId) {
			setHistory(null);
			return;
		}

		const loadHistory = async () => {
			try {
				const response = await api.get(
					`/students/${selectedStudentId}/assignment-history`,
				);
				setHistory(response.data.data);
			} catch {
				setHistory(null);
			}
		};

		void loadHistory();
	}, [selectedStudentId]);

	const currentHostel = selectedStudent?.hostelAssignments[0];
	const currentMess = selectedStudent?.messAssignments[0];

	const onAssignHostel = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedStudentId || !assignment.hostelId || !assignment.roomId) {
			setError(
				"Select a student, hostel, and room before assigning hostel.",
			);
			return;
		}

		setError("");
		setSuccess("");
		try {
			await api.post(`/students/${selectedStudentId}/hostel-assignment`, {
				hostelId: assignment.hostelId,
				roomId: assignment.roomId,
				startDate: new Date(assignment.startDate).toISOString(),
			});
			setSuccess("Hostel assigned successfully.");
			await loadStudents();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to assign hostel",
			);
		}
	};

	const onAssignMess = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedStudentId || !assignment.messId) {
			setError("Select a student and mess before assigning mess.");
			return;
		}

		setError("");
		setSuccess("");
		try {
			await api.post(`/students/${selectedStudentId}/mess-assignment`, {
				messId: assignment.messId,
				startDate: new Date(assignment.startDate).toISOString(),
			});
			setSuccess("Mess assigned successfully.");
			await loadStudents();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to assign mess",
			);
		}
	};

	const onEndCurrentHostelAssignment = async () => {
		if (!selectedStudentId) return;

		setError("");
		setSuccess("");
		try {
			await api.patch(
				`/students/${selectedStudentId}/hostel-assignment/end`,
				{
					endDate: new Date().toISOString(),
				},
			);
			setSuccess("Current hostel assignment ended.");
			await loadStudents();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to end current hostel assignment",
			);
		}
	};

	const onEndCurrentMessAssignment = async () => {
		if (!selectedStudentId) return;

		setError("");
		setSuccess("");
		try {
			await api.patch(
				`/students/${selectedStudentId}/mess-assignment/end`,
				{
					endDate: new Date().toISOString(),
				},
			);
			setSuccess("Current mess assignment ended.");
			await loadStudents();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to end current mess assignment",
			);
		}
	};

	const currentHostelRooms =
		hostels.find((hostel) => hostel.id === assignment.hostelId)?.rooms ??
		[];

	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Student directory</p>
					<h1>Students</h1>
					<p>
						Search students and attach hostel or mess assignments
						with the new assignment endpoints.
					</p>
				</div>
				<div className="portal-actions">
					<span className="portal-pill accent">
						{students.length} visible
					</span>
					<span className="portal-pill">
						{selectedStudent
							? `${selectedStudent.user.firstName} ${selectedStudent.user.lastName}`
							: "No student selected"}
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
							<p className="portal-kicker">Search</p>
							<h2>Directory filters</h2>
						</div>
					</div>
					<div className="portal-form-grid">
						<label className="portal-form-label">
							Search by name, email, or roll number
							<input
								className="portal-input"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search students"
							/>
						</label>
						<div className="portal-actions">
							<button
								className="portal-button portal-button-primary"
								type="button"
								onClick={() => void loadStudents()}
							>
								Search
							</button>
							<button
								className="portal-button portal-button-secondary"
								type="button"
								onClick={() => {
									setSearch("");
									void loadStudents();
								}}
							>
								Reset
							</button>
						</div>
					</div>
				</div>

				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Current selection</p>
							<h2>Student snapshot</h2>
						</div>
					</div>
					{selectedStudent ? (
						<div className="portal-mini-grid">
							<div className="portal-mini-card">
								<h3>
									{selectedStudent.user.firstName}{" "}
									{selectedStudent.user.lastName}
								</h3>
								<p>{selectedStudent.rollNumber}</p>
							</div>
							<div className="portal-mini-card">
								<h3>Hostel</h3>
								<p>
									{currentHostel
										? `${currentHostel.hostel.name} · Room ${currentHostel.room.roomNumber}`
										: "Not assigned"}
								</p>
								{currentHostel ? (
									<button
										type="button"
										className="portal-button portal-button-danger"
										onClick={() =>
											void onEndCurrentHostelAssignment()
										}
									>
										End current hostel assignment
									</button>
								) : null}
							</div>
							<div className="portal-mini-card">
								<h3>Mess</h3>
								<p>
									{currentMess
										? currentMess.mess.name
										: "Not assigned"}
								</p>
								{currentMess ? (
									<button
										type="button"
										className="portal-button portal-button-danger"
										onClick={() =>
											void onEndCurrentMessAssignment()
										}
									>
										End current mess assignment
									</button>
								) : null}
							</div>
							<div className="portal-mini-card">
								<h3>Status</h3>
								<p>
									{selectedStudent.isActive
										? "Active"
										: "Inactive"}
								</p>
							</div>
						</div>
					) : (
						<div className="portal-empty">
							Select a student from the list to assign hostel or
							mess.
						</div>
					)}
				</div>
			</div>

			<div className="portal-grid two">
				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Assign hostel</p>
							<h2>Hostel and room allocation</h2>
						</div>
					</div>
					<form
						className="portal-form-grid"
						onSubmit={onAssignHostel}
					>
						<label className="portal-form-label">
							Student
							<select
								className="portal-select"
								value={selectedStudentId}
								onChange={(e) =>
									setSelectedStudentId(e.target.value)
								}
							>
								{students.map((student) => (
									<option key={student.id} value={student.id}>
										{student.rollNumber} -{" "}
										{student.user.firstName}{" "}
										{student.user.lastName}
									</option>
								))}
							</select>
						</label>
						<div className="portal-form-grid two">
							<label className="portal-form-label">
								Hostel
								<select
									className="portal-select"
									value={assignment.hostelId}
									onChange={(e) =>
										setAssignment((current) => ({
											...current,
											hostelId: e.target.value,
											roomId: "",
										}))
									}
								>
									<option value="">Select hostel</option>
									{hostels.map((hostel) =>
										!hostel.isActive ? null : (
											<option
												key={hostel.id}
												value={hostel.id}
											>
												{hostel.name}
											</option>
										),
									)}
								</select>
							</label>
							<label className="portal-form-label">
								Room
								<select
									className="portal-select"
									value={assignment.roomId}
									onChange={(e) =>
										setAssignment((current) => ({
											...current,
											roomId: e.target.value,
										}))
									}
								>
									<option value="">Select room</option>
									{currentHostelRooms.map((room) =>
										!room.isActive ? null : (
											<option
												key={room.id}
												value={room.id}
											>
												{room.roomNumber} · cap{" "}
												{room.capacity}
											</option>
										),
									)}
								</select>
							</label>
						</div>
						<label className="portal-form-label">
							Start date
							<input
								className="portal-input"
								type="date"
								value={assignment.startDate}
								onChange={(e) =>
									setAssignment((current) => ({
										...current,
										startDate: e.target.value,
									}))
								}
							/>
						</label>
						<button
							className="portal-button portal-button-primary"
							type="submit"
						>
							Assign hostel
						</button>
					</form>
				</div>

				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Assign mess</p>
							<h2>Mess allocation</h2>
						</div>
					</div>
					<form className="portal-form-grid" onSubmit={onAssignMess}>
						<label className="portal-form-label">
							Mess
							<select
								className="portal-select"
								value={assignment.messId}
								onChange={(e) =>
									setAssignment((current) => ({
										...current,
										messId: e.target.value,
									}))
								}
							>
								<option value="">Select mess</option>
								{messes.map((mess) =>
									!mess.isActive ? null : (
										<option key={mess.id} value={mess.id}>
											{mess.name}
										</option>
									),
								)}
							</select>
						</label>
						<label className="portal-form-label">
							Start date
							<input
								className="portal-input"
								type="date"
								value={assignment.startDate}
								onChange={(e) =>
									setAssignment((current) => ({
										...current,
										startDate: e.target.value,
									}))
								}
							/>
						</label>
						<button
							className="portal-button portal-button-secondary"
							type="submit"
						>
							Assign mess
						</button>
					</form>
				</div>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Directory</p>
						<h2>Loaded students</h2>
					</div>
					{loading ? (
						<span className="portal-pill">Loading</span>
					) : null}
				</div>
				{!loading && students.length === 0 ? (
					<div className="portal-empty">
						No students found for the current filter.
					</div>
				) : null}
				<div className="portal-list">
					{students.map((student) => (
						<button
							key={student.id}
							type="button"
							className={`portal-list-item ${selectedStudentId === student.id ? "active" : ""}`}
							onClick={() => setSelectedStudentId(student.id)}
						>
							<div className="portal-list-item-header">
								<div>
									<h3>
										{student.user.firstName}{" "}
										{student.user.lastName}
									</h3>
									<p className="portal-helper">
										{student.rollNumber} ·{" "}
										{student.user.email}
									</p>
								</div>
								<span className="portal-pill">
									{student.gender}
								</span>
							</div>
						</button>
					))}
				</div>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">History</p>
						<h2>Assignment history</h2>
					</div>
				</div>
				{!history ? (
					<div className="portal-empty">No history loaded.</div>
				) : (
					<div className="portal-grid two">
						<div className="portal-mini-card">
							<h3>Hostel assignments</h3>
							{history.hostelAssignments.length === 0 ? (
								<p>None</p>
							) : (
								history.hostelAssignments.map((item) => (
									<p key={item.id} className="portal-helper">
										{item.hostel.name} · Room{" "}
										{item.room.roomNumber} ·
										{new Date(
											item.startDate,
										).toLocaleDateString()}{" "}
										-{" "}
										{item.endDate
											? new Date(
													item.endDate,
												).toLocaleDateString()
											: "current"}
									</p>
								))
							)}
						</div>
						<div className="portal-mini-card">
							<h3>Mess assignments</h3>
							{history.messAssignments.length === 0 ? (
								<p>None</p>
							) : (
								history.messAssignments.map((item) => (
									<p key={item.id} className="portal-helper">
										{item.mess.name} ·{" "}
										{new Date(
											item.startDate,
										).toLocaleDateString()}{" "}
										-{" "}
										{item.endDate
											? new Date(
													item.endDate,
												).toLocaleDateString()
											: "current"}
									</p>
								))
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
