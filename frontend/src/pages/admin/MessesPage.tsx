import { api } from "@/lib/api";
import { useEffect, useState } from "react";

interface Mess {
	id: string;
	name: string;
	gender: "MALE" | "FEMALE";
	perDayCharge: string;
}

export default function MessesPage() {
	const [messes, setMesses] = useState<Mess[]>([]);
	const [name, setName] = useState("");
	const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
	const [perDayCharge, setPerDayCharge] = useState("120");
	const [error, setError] = useState("");

	const load = async () => {
		const response = await api.get("/admin/messes");
		setMesses(response.data.data);
	};

	useEffect(() => {
		void load();
	}, []);

	const onCreateMess = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		try {
			await api.post("/admin/messes", {
				name,
				gender,
				perDayCharge: Number(perDayCharge),
			});
			setName("");
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to create mess",
			);
		}
	};

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-3xl font-bold">Messes</h1>

			<form
				onSubmit={onCreateMess}
				className="p-4 border rounded-md space-y-3 max-w-xl"
			>
				<h2 className="text-xl font-semibold">Create Mess</h2>
				{error && <p className="text-red-600 text-sm">{error}</p>}
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Mess name"
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
				<input
					value={perDayCharge}
					onChange={(e) => setPerDayCharge(e.target.value)}
					type="number"
					step="0.01"
					min="1"
					className="w-full border rounded px-3 py-2"
					required
				/>
				<button
					className="bg-black text-white rounded px-4 py-2"
					type="submit"
				>
					Create
				</button>
			</form>

			<div className="space-y-3">
				{messes.map((mess) => (
					<div
						key={mess.id}
						className="border rounded-md p-4 flex justify-between items-center"
					>
						<div>
							<h3 className="font-semibold">{mess.name}</h3>
							<p className="text-sm text-gray-600">
								{mess.gender}
							</p>
						</div>
						<p className="font-medium">
							INR {mess.perDayCharge}/day
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
