import { api } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

interface Room {
	id: string;
	roomNumber: string;
	capacity: number;
	isActive: boolean;
}

interface Hostel {
	id: string;
	name: string;
	gender: "MALE" | "FEMALE";
	isActive: boolean;
	rooms: Room[];
}

export default function HostelsPage() {
	const [hostels, setHostels] = useState<Hostel[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [name, setName] = useState("");
	const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
	const [roomForm, setRoomForm] = useState<
		Record<string, { roomNumber: string; capacity: string }>
	>({});

	const load = async () => {
		setLoading(true);
		setError("");
		try {
			const response = await api.get("/admin/hostels");
			setHostels(response.data.data);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to load hostels",
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, []);

	const totalRooms = useMemo(
		() => hostels.reduce((count, hostel) => count + hostel.rooms.length, 0),
		[hostels],
	);

	const onCreateHostel = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccess("");
		try {
			await api.post("/admin/hostels", { name, gender });
			setName("");
			setGender("MALE");
			setSuccess("Hostel created successfully.");
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to create hostel",
			);
		}
	};

	const onCreateRoom = async (hostelId: string) => {
		const state = roomForm[hostelId];
		if (!state?.roomNumber) {
			setError("Room number is required");
			return;
		}

		setError("");
		setSuccess("");
		try {
			await api.post(`/admin/hostels/${hostelId}/rooms`, {
				roomNumber: state.roomNumber,
				capacity: Number(state.capacity || 2),
			});
			setRoomForm((current) => ({
				...current,
				[hostelId]: { roomNumber: "", capacity: "2" },
			}));
			setSuccess("Room added successfully.");
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to create room",
			);
		}
	};

	const onUpdateHostel = async (hostel: Hostel) => {
		const nextName = window.prompt("Hostel name", hostel.name);
		if (!nextName || nextName.trim() === hostel.name) return;

		setError("");
		setSuccess("");
		try {
			await api.patch(`/admin/hostels/${hostel.id}`, {
				name: nextName.trim(),
			});
			setSuccess("Hostel updated successfully.");
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to update hostel",
			);
		}
	};

	const onToggleHostel = async (hostel: Hostel) => {
		setError("");
		setSuccess("");
		try {
			await api.patch(`/admin/hostels/${hostel.id}`, {
				isActive: !hostel.isActive,
			});
			setSuccess(
				hostel.isActive
					? "Hostel deactivated successfully."
					: "Hostel reactivated successfully.",
			);
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to update hostel status",
			);
		}
	};

	const onUpdateRoom = async (room: Room) => {
		const roomNumber = window.prompt("Room number", room.roomNumber);
		if (!roomNumber) return;

		const capacityInput = window.prompt(
			"Room capacity",
			String(room.capacity),
		);
		if (!capacityInput) return;

		setError("");
		setSuccess("");
		try {
			await api.patch(`/admin/rooms/${room.id}`, {
				roomNumber: roomNumber.trim(),
				capacity: Number(capacityInput),
			});
			setSuccess("Room updated successfully.");
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to update room",
			);
		}
	};

	const onToggleRoom = async (room: Room) => {
		setError("");
		setSuccess("");
		try {
			await api.patch(`/admin/rooms/${room.id}`, {
				isActive: !room.isActive,
			});
			setSuccess(
				room.isActive
					? "Room deactivated successfully."
					: "Room reactivated successfully.",
			);
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to update room status",
			);
		}
	};

	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Campus structure</p>
					<h1>Hostels</h1>
					<p>
						Create hostels, define room capacity, and keep the room
						inventory in sync.
					</p>
				</div>
				<div className="portal-actions">
					<span className="portal-pill accent">
						{hostels.length} hostels
					</span>
					<span className="portal-pill">{totalRooms} rooms</span>
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
							<p className="portal-kicker">Add hostel</p>
							<h2>Create a new block</h2>
						</div>
					</div>

					<form
						className="portal-form-grid"
						onSubmit={onCreateHostel}
					>
						<label className="portal-form-label">
							Hostel name
							<input
								className="portal-input"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Boys Hostel 6"
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
						<button
							className="portal-button portal-button-primary"
							type="submit"
						>
							Create hostel
						</button>
					</form>
				</div>

				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Current status</p>
							<h2>Inventory overview</h2>
						</div>
					</div>
					<div className="portal-mini-grid">
						<div className="portal-mini-card">
							<h3>{hostels.length}</h3>
							<p>Active hostels configured for both genders.</p>
						</div>
						<div className="portal-mini-card">
							<h3>{totalRooms}</h3>
							<p>
								Total rooms across the current hostel structure.
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Structure list</p>
						<h2>Hostel blocks and rooms</h2>
					</div>
					{loading ? (
						<span className="portal-pill">Loading</span>
					) : null}
				</div>

				{!loading && hostels.length === 0 ? (
					<div className="portal-empty">
						No hostels have been added yet.
					</div>
				) : null}

				<div className="portal-list">
					{hostels.map((hostel) => (
						<article key={hostel.id} className="portal-list-item">
							<div className="portal-list-item-header">
								<div>
									<h3>{hostel.name}</h3>
									<p className="portal-helper">
										{hostel.gender} hostel ·{" "}
										{hostel.rooms.length} rooms
									</p>
								</div>
								<div className="portal-actions">
									<span className="portal-pill">
										{hostel.gender}
									</span>
									<span className="portal-pill">
										{hostel.isActive
											? "Active"
											: "Inactive"}
									</span>
								</div>
							</div>

							<div
								className="portal-actions"
								style={{ marginBottom: "12px" }}
							>
								<button
									className="portal-button portal-button-secondary"
									type="button"
									onClick={() => void onUpdateHostel(hostel)}
								>
									Edit hostel
								</button>
								<button
									className={`portal-button ${hostel.isActive ? "portal-button-danger" : "portal-button-primary"}`}
									type="button"
									onClick={() => void onToggleHostel(hostel)}
								>
									{hostel.isActive
										? "Deactivate hostel"
										: "Reactivate hostel"}
								</button>
							</div>

							{hostel.rooms.length > 0 ? (
								<div className="portal-mini-grid">
									{hostel.rooms.map((room) => (
										<div
											key={room.id}
											className="portal-mini-card"
										>
											<h3>Room {room.roomNumber}</h3>
											<p>
												Capacity: {room.capacity} ·{" "}
												{room.isActive
													? "Active"
													: "Inactive"}
											</p>
											<div
												className="portal-actions"
												style={{ marginTop: "8px" }}
											>
												<button
													className="portal-button portal-button-secondary"
													type="button"
													onClick={() =>
														void onUpdateRoom(room)
													}
												>
													Edit
												</button>
												<button
													className={`portal-button ${room.isActive ? "portal-button-danger" : "portal-button-primary"}`}
													type="button"
													onClick={() =>
														void onToggleRoom(room)
													}
												>
													{room.isActive
														? "Deactivate"
														: "Reactivate"}
												</button>
											</div>
										</div>
									))}
								</div>
							) : (
								<div className="portal-empty">
									No rooms added yet.
								</div>
							)}

							<div className="portal-card soft">
								<div className="portal-card-header">
									<div>
										<p className="portal-kicker">
											Add room
										</p>
										<h3>New room for {hostel.name}</h3>
									</div>
								</div>
								<div className="portal-form-grid two">
									<label className="portal-form-label">
										Room number
										<input
											className="portal-input"
											value={
												roomForm[hostel.id]
													?.roomNumber ?? ""
											}
											onChange={(e) =>
												setRoomForm((current) => ({
													...current,
													[hostel.id]: {
														roomNumber:
															e.target.value,
														capacity:
															current[hostel.id]
																?.capacity ??
															"2",
													},
												}))
											}
											placeholder="101"
										/>
									</label>
									<label className="portal-form-label">
										Capacity
										<input
											className="portal-input"
											type="number"
											min="1"
											max="10"
											value={
												roomForm[hostel.id]?.capacity ??
												"2"
											}
											onChange={(e) =>
												setRoomForm((current) => ({
													...current,
													[hostel.id]: {
														roomNumber:
															current[hostel.id]
																?.roomNumber ??
															"",
														capacity:
															e.target.value,
													},
												}))
											}
										/>
									</label>
								</div>
								<div
									className="portal-actions"
									style={{ marginTop: "12px" }}
								>
									<button
										className="portal-button portal-button-primary"
										type="button"
										onClick={() =>
											void onCreateRoom(hostel.id)
										}
									>
										Add room
									</button>
								</div>
							</div>
						</article>
					))}
				</div>
			</div>
		</div>
	);
}
