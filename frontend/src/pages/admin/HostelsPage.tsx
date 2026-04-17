import { api } from "@/lib/api";
import { useEffect, useState } from "react";

interface Hostel {
	id: string;
	name: string;
	gender: "MALE" | "FEMALE";
	rooms: Array<{ id: string; roomNumber: string; capacity: number }>;
}

export default function HostelsPage() {
	const [hostels, setHostels] = useState<Hostel[]>([]);
	const [name, setName] = useState("");
	const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
	const [error, setError] = useState("");

	const load = async () => {
		const response = await api.get("/admin/hostels");
		setHostels(response.data.data);
	};

	useEffect(() => {
		void load();
	}, []);

	const onCreateHostel = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		try {
			await api.post("/admin/hostels", { name, gender });
			setName("");
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to create hostel",
			);
		}
	};

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-3xl font-bold">Hostels</h1>

			<form
				onSubmit={onCreateHostel}
				className="p-4 border rounded-md space-y-3 max-w-xl"
			>
				<h2 className="text-xl font-semibold">Create Hostel</h2>
				{error && <p className="text-red-600 text-sm">{error}</p>}
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Hostel name"
					className="w-full border rounded px-3 py-2"
					required
				/>
				<select
					value={gender}
					onChange={(e) =>
						setGender(e.target.value as "MALE" | "FEMALE")
					}
					className="w-full border rounded px-3 py-2"
				>
					<option value="MALE">Male</option>
					<option value="FEMALE">Female</option>
				</select>
				<button
					className="bg-black text-white rounded px-4 py-2"
					type="submit"
				>
					Create
				</button>
			</form>

			<div className="space-y-3">
				{hostels.map((hostel) => (
					<div key={hostel.id} className="border rounded-md p-4">
						<div className="flex justify-between items-center">
							<h3 className="font-semibold">{hostel.name}</h3>
							<span className="text-sm text-gray-600">
								{hostel.gender}
							</span>
						</div>
						<p className="text-sm text-gray-600 mt-1">
							Rooms: {hostel.rooms.length}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
