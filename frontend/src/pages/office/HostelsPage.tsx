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

const inputClass =
	"w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function HostelsPage() {
	const [hostels, setHostels] = useState<Hostel[]>([]);
	const [loading, setLoading] = useState(true);
	const [importing, setImporting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [name, setName] = useState("");
	const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
	const [importFile, setImportFile] = useState<File | null>(null);
	const [roomForm, setRoomForm] = useState<
		Record<string, { roomNumber: string; capacity: string }>
	>({});

	const load = async () => {
		setLoading(true);
		setError("");
		try {
			const res = await api.get("/office/hostels");
			setHostels(res.data.data);
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
		() => hostels.reduce((n, h) => n + h.rooms.length, 0),
		[hostels],
	);

	const onCreateHostel = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccess("");
		try {
			await api.post("/office/hostels", { name, gender });
			setName("");
			setGender("MALE");
			setSuccess("Hostel created.");
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
			await api.post(`/office/hostels/${hostelId}/rooms`, {
				roomNumber: state.roomNumber,
				capacity: Number(state.capacity || 2),
			});
			setRoomForm((c) => ({
				...c,
				[hostelId]: { roomNumber: "", capacity: "2" },
			}));
			setSuccess("Room added.");
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
			await api.patch(`/office/hostels/${hostel.id}`, {
				name: nextName.trim(),
			});
			setSuccess("Hostel updated.");
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
			await api.patch(`/office/hostels/${hostel.id}`, {
				isActive: !hostel.isActive,
			});
			setSuccess(
				hostel.isActive ? "Hostel deactivated." : "Hostel reactivated.",
			);
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to update hostel",
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
			await api.patch(`/office/rooms/${room.id}`, {
				roomNumber: roomNumber.trim(),
				capacity: Number(capacityInput),
			});
			setSuccess("Room updated.");
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
			await api.patch(`/office/rooms/${room.id}`, {
				isActive: !room.isActive,
			});
			setSuccess(
				room.isActive ? "Room deactivated." : "Room reactivated.",
			);
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to update room",
			);
		}
	};

	const onDownloadTemplate = () => {
		const csv = [
			"hostel_name,gender,room_number,capacity",
			"Boys Hostel 6,MALE,101,2",
			"Boys Hostel 6,MALE,102,2",
			"Girls Hostel 2,FEMALE,101,3",
		].join("\n");

		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "hostel-infrastructure-template.csv";
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
		URL.revokeObjectURL(url);
	};

	const onImportInfrastructure = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!importFile) {
			setError("Please select a CSV file");
			return;
		}

		setImporting(true);
		setError("");
		setSuccess("");

		try {
			const formData = new FormData();
			formData.append("file", importFile);

			const res = await api.post("/office/hostels/import", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});

			const data = res.data.data;
			setSuccess(
				`Infrastructure import complete: ${data.createdHostels} hostels created, ${data.createdRooms} rooms created, ${data.skippedRooms} rooms skipped.`,
			);
			setImportFile(null);
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Infrastructure import failed",
			);
		} finally {
			setImporting(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-bold text-slate-900">
						Hostels
					</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Create hostel blocks, add rooms, and manage capacities.
					</p>
				</div>
				<div className="flex gap-2">
					<span className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium">
						{hostels.length} hostels
					</span>
					<span className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium">
						{totalRooms} rooms
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

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-4">
						Manual Create
					</h2>
					<form
						onSubmit={onCreateHostel}
						className="flex flex-wrap gap-3 items-end"
					>
						<div className="flex-1 min-w-50">
							<label className="block text-xs font-medium text-slate-700 mb-1">
								Hostel name
							</label>
							<input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Boys Hostel 6"
								required
								className={inputClass}
							/>
						</div>
						<div className="w-36">
							<label className="block text-xs font-medium text-slate-700 mb-1">
								Gender
							</label>
							<select
								value={gender}
								onChange={(e) =>
									setGender(
										e.target.value as "MALE" | "FEMALE",
									)
								}
								className={inputClass}
							>
								<option value="MALE">Male</option>
								<option value="FEMALE">Female</option>
							</select>
						</div>
						<button
							type="submit"
							className="py-2 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors"
						>
							Create hostel
						</button>
					</form>
				</div>

				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<div className="flex items-center justify-between gap-3 mb-4">
						<h2 className="text-sm font-semibold text-slate-900">
							Bulk Import
						</h2>
						<button
							type="button"
							onClick={onDownloadTemplate}
							className="text-xs font-medium text-blue-700 hover:text-blue-800"
						>
							Download Template
						</button>
					</div>
					<form
						onSubmit={onImportInfrastructure}
						className="space-y-3"
					>
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">
								Infrastructure CSV
							</label>
							<input
								type="file"
								accept=".csv"
								onChange={(e) =>
									setImportFile(e.target.files?.[0] ?? null)
								}
								className={inputClass}
							/>
						</div>
						<p className="text-xs text-slate-500">
							Required headers: hostel_name, gender, room_number,
							capacity
						</p>
						<button
							type="submit"
							disabled={importing || !importFile}
							className="py-2 px-4 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-60 transition-colors"
						>
							{importing
								? "Importing..."
								: "Import infrastructure"}
						</button>
					</form>
				</div>
			</div>

			{/* Hostel list */}
			<div className="bg-white rounded-lg border border-slate-200">
				<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">
						Hostel Blocks
					</h2>
					{loading && (
						<span className="text-xs text-slate-400">Loading…</span>
					)}
				</div>
				{!hostels.length && !loading ? (
					<p className="text-center py-10 text-sm text-slate-400">
						No hostels added yet.
					</p>
				) : (
					<div className="divide-y divide-slate-100">
						{hostels.map((hostel) => (
							<div key={hostel.id} className="p-5">
								{/* Hostel header */}
								<div className="flex items-start justify-between gap-3 mb-3">
									<div>
										<p className="text-sm font-bold text-slate-900">
											{hostel.name}
										</p>
										<p className="text-xs text-slate-500">
											{hostel.gender} ·{" "}
											{hostel.rooms.length} rooms
										</p>
									</div>
									<div className="flex gap-1.5">
										<span
											className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${hostel.gender === "MALE" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"}`}
										>
											{hostel.gender}
										</span>
										<span
											className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${hostel.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}
										>
											{hostel.isActive
												? "Active"
												: "Inactive"}
										</span>
									</div>
								</div>

								{/* Hostel actions */}
								<div className="flex gap-2 mb-4">
									<button
										type="button"
										onClick={() =>
											void onUpdateHostel(hostel)
										}
										className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
									>
										Edit name
									</button>
									<button
										type="button"
										onClick={() =>
											void onToggleHostel(hostel)
										}
										className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${hostel.isActive ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
									>
										{hostel.isActive
											? "Deactivate"
											: "Reactivate"}
									</button>
								</div>

								{/* Rooms grid */}
								{hostel.rooms.length > 0 && (
									<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
										{hostel.rooms.map((room) => (
											<div
												key={room.id}
												className={`rounded-lg border p-2.5 text-xs ${room.isActive ? "border-slate-200 bg-slate-50" : "border-slate-100 bg-slate-50 opacity-60"}`}
											>
												<p className="font-bold text-slate-900">
													Room {room.roomNumber}
												</p>
												<p className="text-slate-500">
													Cap: {room.capacity}
												</p>
												<div className="flex gap-1 mt-1.5">
													<button
														type="button"
														onClick={() =>
															void onUpdateRoom(
																room,
															)
														}
														className="flex-1 py-0.5 rounded text-xs border border-slate-300 hover:bg-white transition-colors"
													>
														Edit
													</button>
													<button
														type="button"
														onClick={() =>
															void onToggleRoom(
																room,
															)
														}
														className={`flex-1 py-0.5 rounded text-xs border transition-colors ${room.isActive ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600"}`}
													>
														{room.isActive
															? "Off"
															: "On"}
													</button>
												</div>
											</div>
										))}
									</div>
								)}

								{/* Add room inline form */}
								<div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
									<p className="text-xs font-semibold text-slate-700 mb-2">
										Add room to {hostel.name}
									</p>
									<div className="flex gap-2 flex-wrap">
										<input
											placeholder="Room No. (e.g. 101)"
											value={
												roomForm[hostel.id]
													?.roomNumber ?? ""
											}
											onChange={(e) =>
												setRoomForm((c) => ({
													...c,
													[hostel.id]: {
														roomNumber:
															e.target.value,
														capacity:
															c[hostel.id]
																?.capacity ??
															"2",
													},
												}))
											}
											className="flex-1 min-w-30 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
										/>
										<input
											type="number"
											min="1"
											max="10"
											placeholder="Capacity"
											value={
												roomForm[hostel.id]?.capacity ??
												"2"
											}
											onChange={(e) =>
												setRoomForm((c) => ({
													...c,
													[hostel.id]: {
														roomNumber:
															c[hostel.id]
																?.roomNumber ??
															"",
														capacity:
															e.target.value,
													},
												}))
											}
											className="w-24 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
										/>
										<button
											type="button"
											onClick={() =>
												void onCreateRoom(hostel.id)
											}
											className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-colors"
										>
											Add room
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
