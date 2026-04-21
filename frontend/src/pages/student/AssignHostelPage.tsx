import { api } from "@/lib/api";
import clsx from "clsx";
import { useEffect, useState } from "react";

interface Hostel {
	id: string;
	name: string;
	gender: "MALE" | "FEMALE";
	availableRoomsCount: number;
	currentStudentsCount: number;
	assignedMess: {
		id: string;
		name: string;
	} | null;
}

interface Room {
	id: string;
	roomNumber: string;
	capacity: number;
	occupiedCount: number;
	availableSeats: number;
	isFull: boolean;
}

const buttonClass =
	"px-4 py-2 text-sm font-medium rounded-lg transition-colors";
const buttonPrimary = clsx(
	buttonClass,
	"bg-blue-600 text-white hover:bg-blue-700",
);
const buttonSecondary = clsx(
	buttonClass,
	"bg-slate-200 text-slate-900 hover:bg-slate-300",
);

type Step = "hostels" | "rooms" | "confirm";

export default function StudentAssignHostelPage() {
	const [step, setStep] = useState<Step>("hostels");
	const [hostels, setHostels] = useState<Hostel[]>([]);
	const [rooms, setRooms] = useState<Room[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
	const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
	const [assigning, setAssigning] = useState(false);

	const loadHostels = async () => {
		setLoading(true);
		setError("");
		try {
			const res = await api.get("/students/self/available-hostels");
			setHostels(res.data.data || []);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to load available hostels",
			);
		} finally {
			setLoading(false);
		}
	};

	const loadRooms = async (hostelId: string) => {
		setLoading(true);
		setError("");
		try {
			const res = await api.get(
				`/students/self/hostels/${hostelId}/rooms`,
			);
			setRooms(res.data.data || []);
			setStep("rooms");
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to load rooms",
			);
		} finally {
			setLoading(false);
		}
	};

	const handleSelectHostel = (hostel: Hostel) => {
		setSelectedHostel(hostel);
		setSelectedRoom(null);
		void loadRooms(hostel.id);
	};

	const handleSelectRoom = (room: Room) => {
		setSelectedRoom(room);
		setStep("confirm");
	};

	const handleAssign = async () => {
		if (!selectedHostel || !selectedRoom) {
			setError("Please select both hostel and room");
			return;
		}

		try {
			setAssigning(true);
			setError("");
			const res = await api.post("/students/self/assign-hostel-room", {
				hostelId: selectedHostel.id,
				roomId: selectedRoom.id,
			});

			setSuccess(
				`Successfully assigned to ${selectedHostel.name}, Room ${selectedRoom.roomNumber}. Mess: ${res.data.data.autoAssignedMess.name}`,
			);

			// Redirect after delay
			setTimeout(() => {
				// Redirect to student dashboard or refresh
				window.location.href = "/student/dashboard";
			}, 2000);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to assign hostel",
			);
		} finally {
			setAssigning(false);
		}
	};

	useEffect(() => {
		void loadHostels();
	}, []);

	if (step === "hostels") {
		return (
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-slate-900">
						Select Your Hostel
					</h1>
					<p className="text-slate-600 mt-2">
						Choose a hostel to view available rooms
					</p>
				</div>

				{/* Error Messages */}
				{error && (
					<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-6">
						{error}
					</div>
				)}

				{/* Hostels Grid */}
				{loading ? (
					<div className="text-center py-12">
						<p className="text-slate-600">Loading hostels...</p>
					</div>
				) : hostels.length === 0 ? (
					<div className="text-center py-12 bg-slate-50 rounded-lg">
						<p className="text-slate-600">
							No hostels available for your gender at the moment
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{hostels.map((hostel) => (
							<div
								key={hostel.id}
								className="bg-white border border-slate-200 rounded-lg p-6 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer"
								onClick={() => handleSelectHostel(hostel)}
							>
								<div className="flex items-start justify-between mb-4">
									<div>
										<h3 className="text-lg font-semibold text-slate-900">
											{hostel.name}
										</h3>
										<span
											className={clsx(
												"inline-block mt-1 px-2 py-1 rounded text-xs font-semibold",
												hostel.gender === "MALE"
													? "bg-blue-100 text-blue-700"
													: "bg-pink-100 text-pink-700",
											)}
										>
											{hostel.gender}
										</span>
									</div>
								</div>

								<div className="space-y-2 mb-4">
									<div className="flex justify-between text-sm">
										<span className="text-slate-600">
											Available Rooms:
										</span>
										<span className="font-semibold text-slate-900">
											{hostel.availableRoomsCount}
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-slate-600">
											Current Students:
										</span>
										<span className="font-semibold text-slate-900">
											{hostel.currentStudentsCount}
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-slate-600">
											Assigned Mess:
										</span>
										<span className="font-semibold text-slate-900">
											{hostel.assignedMess?.name ||
												"Not assigned"}
										</span>
									</div>
								</div>

								<button className={buttonPrimary}>
									View Rooms
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	if (step === "rooms") {
		return (
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<button
						onClick={() => {
							setStep("hostels");
							setSelectedHostel(null);
							setSelectedRoom(null);
						}}
						className={clsx(buttonSecondary, "mb-4")}
					>
						← Back to Hostels
					</button>
					<h1 className="text-3xl font-bold text-slate-900">
						Select a Room in {selectedHostel?.name}
					</h1>
					<p className="text-slate-600 mt-2">
						Choose an available room
					</p>
				</div>

				{/* Error Messages */}
				{error && (
					<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-6">
						{error}
					</div>
				)}

				{/* Rooms List */}
				{loading ? (
					<div className="text-center py-12">
						<p className="text-slate-600">Loading rooms...</p>
					</div>
				) : rooms.length === 0 ? (
					<div className="text-center py-12 bg-slate-50 rounded-lg">
						<p className="text-slate-600">
							No available rooms in this hostel
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{rooms.map((room) => (
							<button
								key={room.id}
								onClick={() => handleSelectRoom(room)}
								className={clsx(
									"w-full p-4 rounded-lg border-2 text-left transition-all",
									selectedRoom?.id === room.id
										? "border-blue-500 bg-blue-50"
										: "border-slate-200 bg-white hover:border-blue-300",
								)}
							>
								<div className="flex items-center justify-between">
									<div>
										<h3 className="font-semibold text-slate-900">
											Room {room.roomNumber}
										</h3>
										<p className="text-sm text-slate-600">
											Capacity: {room.capacity} |
											Available: {room.availableSeats}
										</p>
									</div>
									<div className="text-right">
										<span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded">
											{room.availableSeats}/
											{room.capacity}
										</span>
									</div>
								</div>
							</button>
						))}
					</div>
				)}
			</div>
		);
	}

	// Confirm step
	return (
		<div className="max-w-2xl mx-auto">
			{/* Header */}
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-slate-900">
					Confirm Your Assignment
				</h1>
				<p className="text-slate-600 mt-2">
					Review your hostel and room assignment
				</p>
			</div>

			{/* Error and Success Messages */}
			{error && (
				<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-6">
					{error}
				</div>
			)}
			{success && (
				<div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 mb-6">
					{success}
				</div>
			)}

			{/* Assignment Summary */}
			<div className="bg-white border border-slate-200 rounded-lg p-8 space-y-6">
				<div>
					<label className="block text-sm font-semibold text-slate-700 mb-2">
						Hostel
					</label>
					<p className="text-xl font-semibold text-slate-900">
						{selectedHostel?.name}
					</p>
					<p className="text-slate-600">
						Gender: {selectedHostel?.gender}
					</p>
				</div>

				<div>
					<label className="block text-sm font-semibold text-slate-700 mb-2">
						Room
					</label>
					<p className="text-xl font-semibold text-slate-900">
						Room {selectedRoom?.roomNumber}
					</p>
					<p className="text-slate-600">
						Capacity: {selectedRoom?.capacity}
					</p>
				</div>

				<div>
					<label className="block text-sm font-semibold text-slate-700 mb-2">
						Assigned Mess
					</label>
					<p className="text-xl font-semibold text-slate-900">
						{selectedHostel?.assignedMess?.name ||
							"Not yet assigned"}
					</p>
				</div>

				<div className="pt-4 flex gap-4">
					<button
						onClick={() => setStep("rooms")}
						disabled={assigning}
						className={buttonSecondary}
					>
						Back
					</button>
					<button
						onClick={() => void handleAssign()}
						disabled={assigning}
						className={clsx(buttonPrimary, {
							"opacity-50 cursor-not-allowed": assigning,
						})}
					>
						{assigning ? "Assigning..." : "Confirm Assignment"}
					</button>
				</div>
			</div>
		</div>
	);
}
