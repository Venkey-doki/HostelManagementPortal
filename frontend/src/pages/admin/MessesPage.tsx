import { api } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

interface Mess {
	id: string;
	name: string;
	gender: "MALE" | "FEMALE";
	perDayCharge: string;
	isActive: boolean;
}

interface InchargeAssignment {
	id: string;
	startDate: string;
	endDate: string | null;
	isCurrent: boolean;
	user: {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
	};
}

interface AdminUserResponse {
	data: {
		user: {
			id: string;
			email: string;
			firstName: string;
			lastName: string;
			role: string;
		};
		temporaryPassword: string;
	};
}

export default function MessesPage() {
	const [messes, setMesses] = useState<Mess[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [name, setName] = useState("");
	const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
	const [perDayCharge, setPerDayCharge] = useState("120");
	const [staffForm, setStaffForm] = useState({
		email: "",
		firstName: "",
		lastName: "",
		phone: "",
		password: "",
		role: "MESS_INCHARGE" as "MESS_INCHARGE" | "WARDEN",
		messId: "",
	});
	const [recentStaffId, setRecentStaffId] = useState("");
	const [inchargeHistory, setInchargeHistory] = useState<
		Record<string, InchargeAssignment[]>
	>({});

	const load = async () => {
		setLoading(true);
		setError("");
		try {
			const response = await api.get("/admin/messes");
			setMesses(response.data.data);
			setStaffForm((current) => ({
				...current,
				messId: current.messId || response.data.data[0]?.id || "",
			}));
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to load messes",
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, []);

	const totalCharge = useMemo(
		() => messes.reduce((sum, mess) => sum + Number(mess.perDayCharge), 0),
		[messes],
	);

	const onCreateMess = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccess("");
		try {
			await api.post("/admin/messes", {
				name,
				gender,
				perDayCharge: Number(perDayCharge),
			});
			setName("");
			setPerDayCharge("120");
			setSuccess("Mess created successfully.");
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to create mess",
			);
		}
	};

	const onCreateStaff = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccess("");
		try {
			const response = await api.post<AdminUserResponse>("/admin/users", {
				email: staffForm.email,
				role: staffForm.role,
				firstName: staffForm.firstName,
				lastName: staffForm.lastName,
				phone: staffForm.phone || undefined,
				password: staffForm.password || undefined,
			});

			setRecentStaffId(response.data.data.user.id);
			setStaffForm((current) => ({
				...current,
				email: "",
				firstName: "",
				lastName: "",
				phone: "",
				password: "",
			}));
			setSuccess(
				`Created ${response.data.data.user.role.toLowerCase()} account.`,
			);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to create staff account",
			);
		}
	};

	const onAssignIncharge = async () => {
		if (!staffForm.messId || !recentStaffId) {
			setError("Create a staff account first, then assign it to a mess.");
			return;
		}

		setError("");
		setSuccess("");
		try {
			await api.post(
				`/admin/messes/${staffForm.messId}/incharge-assignment`,
				{
					userId: recentStaffId,
					startDate: new Date().toISOString(),
				},
			);
			setSuccess("Mess incharge assigned successfully.");
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to assign incharge",
			);
		}
	};

	const onUpdateMess = async (mess: Mess) => {
		const nextName = window.prompt("Mess name", mess.name);
		if (!nextName) return;

		const chargeInput = window.prompt(
			"Per day charge",
			String(mess.perDayCharge),
		);
		if (!chargeInput) return;

		setError("");
		setSuccess("");
		try {
			await api.patch(`/admin/messes/${mess.id}`, {
				name: nextName.trim(),
				perDayCharge: Number(chargeInput),
			});
			setSuccess("Mess updated successfully.");
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to update mess",
			);
		}
	};

	const onToggleMess = async (mess: Mess) => {
		setError("");
		setSuccess("");
		try {
			await api.patch(`/admin/messes/${mess.id}`, {
				isActive: !mess.isActive,
			});
			setSuccess(
				mess.isActive
					? "Mess deactivated successfully."
					: "Mess reactivated successfully.",
			);
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to update mess status",
			);
		}
	};

	const onLoadInchargeHistory = async (messId: string) => {
		setError("");
		try {
			const response = await api.get(
				`/admin/messes/${messId}/incharge-assignment`,
			);
			setInchargeHistory((current) => ({
				...current,
				[messId]: response.data.data,
			}));
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to load incharge history",
			);
		}
	};

	const onEndInchargeAssignment = async (
		assignmentId: string,
		messId: string,
	) => {
		setError("");
		setSuccess("");
		try {
			await api.patch(`/admin/incharge-assignment/${assignmentId}/end`, {
				endDate: new Date().toISOString(),
			});
			setSuccess("Incharge assignment ended successfully.");
			await onLoadInchargeHistory(messId);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to end incharge assignment",
			);
		}
	};

	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Mess management</p>
					<h1>Messes</h1>
					<p>
						Create meal pricing and manage staff assignment workflow
						from one place.
					</p>
				</div>
				<div className="portal-actions">
					<span className="portal-pill accent">
						{messes.length} messes
					</span>
					<span className="portal-pill">
						Avg. INR{" "}
						{messes.length
							? Math.round(totalCharge / messes.length)
							: 0}
						/day
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
							<p className="portal-kicker">Add mess</p>
							<h2>Configure meal pricing</h2>
						</div>
					</div>

					<form className="portal-form-grid" onSubmit={onCreateMess}>
						<label className="portal-form-label">
							Mess name
							<input
								className="portal-input"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Boys Mess C"
								required
							/>
						</label>
						<label className="portal-form-label">
							Gender
							<select
								className="portal-select"
								value={gender}
								onChange={(e) =>
									setGender(
										e.target.value as "MALE" | "FEMALE",
									)
								}
							>
								<option value="MALE">Male</option>
								<option value="FEMALE">Female</option>
							</select>
						</label>
						<label className="portal-form-label">
							Per day charge
							<input
								className="portal-input"
								value={perDayCharge}
								onChange={(e) =>
									setPerDayCharge(e.target.value)
								}
								type="number"
								min="1"
								step="0.01"
								required
							/>
						</label>
						<button
							className="portal-button portal-button-primary"
							type="submit"
						>
							Create mess
						</button>
					</form>
				</div>

				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Staff workflow</p>
							<h2>Create and assign staff</h2>
						</div>
					</div>
					<form className="portal-form-grid" onSubmit={onCreateStaff}>
						<div className="portal-form-grid two">
							<label className="portal-form-label">
								Role
								<select
									className="portal-select"
									value={staffForm.role}
									onChange={(e) =>
										setStaffForm((current) => ({
											...current,
											role: e.target.value as
												| "MESS_INCHARGE"
												| "WARDEN",
										}))
									}
								>
									<option value="MESS_INCHARGE">
										Mess incharge
									</option>
									<option value="WARDEN">Warden</option>
								</select>
							</label>
							<label className="portal-form-label">
								Mess
								<select
									className="portal-select"
									value={staffForm.messId}
									onChange={(e) =>
										setStaffForm((current) => ({
											...current,
											messId: e.target.value,
										}))
									}
								>
									{messes.map((mess) => (
										<option key={mess.id} value={mess.id}>
											{mess.name}
										</option>
									))}
								</select>
							</label>
						</div>
						<div className="portal-form-grid two">
							<label className="portal-form-label">
								First name
								<input
									className="portal-input"
									value={staffForm.firstName}
									onChange={(e) =>
										setStaffForm((current) => ({
											...current,
											firstName: e.target.value,
										}))
									}
									required
								/>
							</label>
							<label className="portal-form-label">
								Last name
								<input
									className="portal-input"
									value={staffForm.lastName}
									onChange={(e) =>
										setStaffForm((current) => ({
											...current,
											lastName: e.target.value,
										}))
									}
									required
								/>
							</label>
						</div>
						<label className="portal-form-label">
							Email
							<input
								className="portal-input"
								value={staffForm.email}
								onChange={(e) =>
									setStaffForm((current) => ({
										...current,
										email: e.target.value,
									}))
								}
								type="email"
								required
							/>
						</label>
						<div className="portal-form-grid two">
							<label className="portal-form-label">
								Phone
								<input
									className="portal-input"
									value={staffForm.phone}
									onChange={(e) =>
										setStaffForm((current) => ({
											...current,
											phone: e.target.value,
										}))
									}
								/>
							</label>
							<label className="portal-form-label">
								Temporary password
								<input
									className="portal-input"
									value={staffForm.password}
									onChange={(e) =>
										setStaffForm((current) => ({
											...current,
											password: e.target.value,
										}))
									}
									placeholder="Leave blank to auto-generate"
								/>
							</label>
						</div>
						<button
							className="portal-button portal-button-secondary"
							type="submit"
						>
							Create staff account
						</button>
						<button
							className="portal-button portal-button-primary"
							type="button"
							onClick={() => void onAssignIncharge()}
						>
							Assign recent staff to mess
						</button>
					</form>
					{recentStaffId ? (
						<p
							className="portal-helper"
							style={{ marginTop: "12px" }}
						>
							Last created staff ID:{" "}
							<strong>{recentStaffId}</strong>
						</p>
					) : (
						<p
							className="portal-helper"
							style={{ marginTop: "12px" }}
						>
							Create a staff account first to get an ID for
							assignment.
						</p>
					)}
				</div>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Active messes</p>
						<h2>Configured mess list</h2>
					</div>
					{loading ? (
						<span className="portal-pill">Loading</span>
					) : null}
				</div>
				{!loading && messes.length === 0 ? (
					<div className="portal-empty">
						No messes configured yet.
					</div>
				) : null}
				<div className="portal-mini-grid">
					{messes.map((mess) => (
						<div key={mess.id} className="portal-mini-card">
							<p className="portal-kicker">
								{mess.gender} ·{" "}
								{mess.isActive ? "Active" : "Inactive"}
							</p>
							<h3>{mess.name}</h3>
							<p>INR {mess.perDayCharge} per day</p>
							<div
								className="portal-actions"
								style={{ marginTop: "8px" }}
							>
								<button
									className="portal-button portal-button-secondary"
									type="button"
									onClick={() => void onUpdateMess(mess)}
								>
									Edit
								</button>
								<button
									className={`portal-button ${mess.isActive ? "portal-button-danger" : "portal-button-primary"}`}
									type="button"
									onClick={() => void onToggleMess(mess)}
								>
									{mess.isActive
										? "Deactivate"
										: "Reactivate"}
								</button>
								<button
									className="portal-button portal-button-secondary"
									type="button"
									onClick={() =>
										void onLoadInchargeHistory(mess.id)
									}
								>
									Load incharge history
								</button>
							</div>
							{inchargeHistory[mess.id]?.length ? (
								<div style={{ marginTop: "12px" }}>
									{inchargeHistory[mess.id].map((item) => (
										<div
											key={item.id}
											className="portal-helper"
											style={{ marginTop: "6px" }}
										>
											{item.user.firstName}{" "}
											{item.user.lastName} ·
											{new Date(
												item.startDate,
											).toLocaleDateString()}{" "}
											-
											{item.endDate
												? new Date(
														item.endDate,
													).toLocaleDateString()
												: "current"}
											{item.isCurrent ? (
												<button
													type="button"
													className="portal-button portal-button-danger"
													style={{
														marginLeft: "8px",
													}}
													onClick={() =>
														void onEndInchargeAssignment(
															item.id,
															mess.id,
														)
													}
												>
													End assignment
												</button>
											) : null}
										</div>
									))}
								</div>
							) : null}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
