import { api } from "@/lib/api";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

type Hostel = {
	id: string;
	name: string;
	gender: "MALE" | "FEMALE";
	isActive: boolean;
	roomCount: number;
	studentCount: number;
	messMapping: {
		messId: string;
		isActive: boolean;
		mess: { id: string; name: string };
	} | null;
};

type Mess = {
	id: string;
	name: string;
	gender: "MALE" | "FEMALE";
	perDayCharge: number;
	isActive: boolean;
};

const buttonBase =
	"inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors";
const primaryButton = clsx(
	buttonBase,
	"bg-blue-700 text-white hover:bg-blue-800",
);
const secondaryButton = clsx(
	buttonBase,
	"border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
);
const dangerButton = clsx(buttonBase, "bg-red-600 text-white hover:bg-red-700");

export default function HostelMessMappingPage() {
	const [hostels, setHostels] = useState<Hostel[]>([]);
	const [messes, setMesses] = useState<Mess[]>([]);
	const [selectedHostelId, setSelectedHostelId] = useState("");
	const [selectedMessId, setSelectedMessId] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const loadData = async () => {
		setLoading(true);
		setError("");
		try {
			const [hostelsResponse, messesResponse] = await Promise.all([
				api.get("/office/hostels"),
				api.get("/office/messes"),
			]);
			setHostels(hostelsResponse.data.data || []);
			setMesses(messesResponse.data.data || []);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to load mapping data",
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadData();
	}, []);

	const selectedHostel = useMemo(
		() => hostels.find((hostel) => hostel.id === selectedHostelId) ?? null,
		[hostels, selectedHostelId],
	);

	const selectedHostelAlreadyMapped = Boolean(
		selectedHostel?.messMapping?.isActive,
	);

	const submitMapping = async () => {
		if (!selectedHostelId || !selectedMessId) {
			setError("Please select both hostel and mess");
			return;
		}

		setSaving(true);
		setError("");
		setSuccess("");
		try {
			if (selectedHostelAlreadyMapped) {
				await api.patch(`/office/hostels/${selectedHostelId}/mess`, {
					messId: selectedMessId,
				});
				setSuccess("Mess mapping updated successfully");
			} else {
				await api.post(`/office/hostels/${selectedHostelId}/mess`, {
					messId: selectedMessId,
				});
				setSuccess("Mess assigned to hostel successfully");
			}
			setSelectedMessId("");
			await loadData();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to save mapping",
			);
		} finally {
			setSaving(false);
		}
	};

	const handleUnassign = async (hostelId: string) => {
		if (
			!window.confirm(
				"Are you sure you want to unassign the mess from this hostel?",
			)
		) {
			return;
		}

		try {
			setError("");
			setSuccess("");
			await api.delete(`/office/hostels/${hostelId}/mess`);
			setSuccess("Mess unassigned from hostel successfully");
			if (selectedHostelId === hostelId) {
				setSelectedMessId("");
			}
			await loadData();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to unassign mess",
			);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-3xl font-bold text-slate-900">
						Hostel-Mess Mapping
					</h1>
					<p className="mt-2 text-slate-600">
						Assign a mess to any hostel. Students already in that
						hostel are updated automatically.
					</p>
				</div>
				<div className="flex gap-2 flex-wrap">
					<span className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium">
						{hostels.length} hostels
					</span>
					<span className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium">
						{
							hostels.filter(
								(hostel) => hostel.messMapping?.isActive,
							).length
						}{" "}
						mapped
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

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 overflow-hidden">
					{loading ? (
						<div className="py-12 text-center text-slate-600">
							Loading hostels...
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-slate-50 border-b border-slate-200">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
											Hostel
										</th>
										<th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
											Gender
										</th>
										<th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
											Assigned Mess
										</th>
										<th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
											Rooms
										</th>
										<th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
											Students
										</th>
										<th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
											Actions
										</th>
									</tr>
								</thead>
								<tbody>
									{hostels.length === 0 ? (
										<tr>
											<td
												colSpan={6}
												className="px-6 py-8 text-center text-slate-500"
											>
												No hostels found
											</td>
										</tr>
									) : (
										hostels.map((hostel) => (
											<tr
												key={hostel.id}
												className="border-b border-slate-200 hover:bg-slate-50"
											>
												<td className="px-6 py-4 font-medium text-slate-900">
													{hostel.name}
												</td>
												<td className="px-6 py-4">
													<span
														className={clsx(
															"inline-block px-2 py-1 rounded text-xs font-semibold",
															hostel.gender ===
																"MALE"
																? "bg-blue-100 text-blue-700"
																: "bg-pink-100 text-pink-700",
														)}
													>
														{hostel.gender}
													</span>
												</td>
												<td className="px-6 py-4 text-slate-900">
													{hostel.messMapping?.mess
														.name ?? "Not assigned"}
												</td>
												<td className="px-6 py-4 text-slate-600">
													{hostel.roomCount}
												</td>
												<td className="px-6 py-4 text-slate-600">
													{hostel.studentCount}
												</td>
												<td className="px-6 py-4 flex gap-2">
													<button
														onClick={() => {
															setSelectedHostelId(
																hostel.id,
															);
															setSelectedMessId(
																hostel
																	.messMapping
																	?.messId ??
																	"",
															);
															setError("");
														}}
														className={
															secondaryButton
														}
													>
														{hostel.messMapping
															? "Change mess"
															: "Assign mess"}
													</button>
													<button
														onClick={() =>
															void handleUnassign(
																hostel.id,
															)
														}
														disabled={
															hostel.studentCount >
																0 ||
															!hostel.messMapping
														}
														className={clsx(
															dangerButton,
															(hostel.studentCount >
																0 ||
																!hostel.messMapping) &&
																"opacity-50 cursor-not-allowed",
														)}
													>
														Unassign
													</button>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					)}
				</div>

				<div className="bg-white rounded-lg border border-slate-200 p-6 h-fit sticky top-6">
					<h3 className="text-lg font-semibold text-slate-900 mb-4">
						{selectedHostelAlreadyMapped
							? "Update mess assignment"
							: "Assign mess to hostel"}
					</h3>

					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">
								Select hostel
							</label>
							<select
								value={selectedHostelId}
								onChange={(event) => {
									setSelectedHostelId(event.target.value);
									setSelectedMessId("");
								}}
								className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="">-- Select hostel --</option>
								{hostels.map((hostel) => (
									<option key={hostel.id} value={hostel.id}>
										{hostel.name} ({hostel.gender})
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-700 mb-2">
								Select mess
							</label>
							<select
								value={selectedMessId}
								onChange={(event) =>
									setSelectedMessId(event.target.value)
								}
								className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="">-- Select mess --</option>
								{messes.map((mess) => (
									<option key={mess.id} value={mess.id}>
										{mess.name} ({mess.gender})
									</option>
								))}
							</select>
						</div>

						<div className="flex gap-2 pt-2">
							<button
								onClick={() => void submitMapping()}
								disabled={
									saving ||
									!selectedHostelId ||
									!selectedMessId
								}
								className={primaryButton}
							>
								{saving
									? "Saving..."
									: selectedHostelAlreadyMapped
										? "Update"
										: "Assign"}
							</button>
							<button
								onClick={() => {
									setSelectedHostelId("");
									setSelectedMessId("");
									setError("");
								}}
								className={secondaryButton}
							>
								Clear
							</button>
						</div>

						{selectedHostel && (
							<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 space-y-1">
								<p className="font-semibold text-slate-900">
									{selectedHostel.name}
								</p>
								<p>Rooms: {selectedHostel.roomCount}</p>
								<p>Students: {selectedHostel.studentCount}</p>
								<p>
									Current mess:{" "}
									{selectedHostel.messMapping?.mess.name ??
										"Not assigned"}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
