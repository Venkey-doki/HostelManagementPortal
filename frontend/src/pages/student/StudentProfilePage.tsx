import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

type ProfileResponse = {
	student: {
		rollNumber: string;
		gender: "MALE" | "FEMALE";
		department: string | null;
		academicYear: number | null;
		batch: string | null;
		user: {
			email: string;
			firstName: string;
			lastName: string;
			phone: string | null;
		};
	};
	hostelAssignment: null | {
		hostel: { id: string; name: string };
		room: { id: string; roomNumber: string; capacity: number };
		nextEligibleChangeAt: string | null;
		canChangeHostel: boolean;
	};
	messAssignment: null | {
		mess: { id: string; name: string; perDayCharge: string };
	};
	billing: {
		totalBills: number;
		balanceDue: string;
		latestBill: null | {
			billingMonth: string;
			balanceDue: string;
			status: string;
		};
	};
};

type Hostel = {
	id: string;
	name: string;
	gender: "MALE" | "FEMALE";
	availableRoomsCount: number;
	assignedMess: { id: string; name: string } | null;
};

type Room = {
	id: string;
	roomNumber: string;
	capacity: number;
	availableSeats: number;
	isFull: boolean;
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

function formatMoney(value: string) {
	return `₹${Number(value).toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
	if (!value) {
		return "—";
	}

	return new Intl.DateTimeFormat("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
}

export default function StudentProfilePage() {
	const queryClient = useQueryClient();
	const [toast, setToast] = useState<{
		kind: "success" | "error";
		message: string;
	} | null>(null);
	const [formError, setFormError] = useState("");
	const [profileForm, setProfileForm] = useState({
		phone: "",
		department: "",
		batch: "",
	});
	const [assignmentOpen, setAssignmentOpen] = useState(false);
	const [hostels, setHostels] = useState<Hostel[]>([]);
	const [rooms, setRooms] = useState<Room[]>([]);
	const [selectedHostelId, setSelectedHostelId] = useState("");
	const [selectedRoomId, setSelectedRoomId] = useState("");
	const [loadingHostels, setLoadingHostels] = useState(false);
	const [loadingRooms, setLoadingRooms] = useState(false);

	const profileQuery = useQuery({
		queryKey: ["student-profile"],
		queryFn: async () =>
			(await api.get("/students/self/profile")).data
				.data as ProfileResponse,
	});

	const hasHostelAssignment = Boolean(profileQuery.data?.hostelAssignment);
	const canChangeHostel =
		profileQuery.data?.hostelAssignment?.canChangeHostel ?? true;
	const currentHostel =
		profileQuery.data?.hostelAssignment?.hostel.name ?? "Not assigned";
	const currentRoom =
		profileQuery.data?.hostelAssignment?.room.roomNumber ?? "—";
	const currentMess =
		profileQuery.data?.messAssignment?.mess.name ?? "Not assigned";
	const nextEligible =
		profileQuery.data?.hostelAssignment?.nextEligibleChangeAt ?? null;
	const currentBalance = Number(profileQuery.data?.billing.balanceDue ?? 0);

	const loadHostels = async () => {
		setLoadingHostels(true);
		setFormError("");
		try {
			const res = await api.get("/students/self/available-hostels");
			setHostels(res.data.data || []);
		} catch (error: any) {
			setFormError(
				error.response?.data?.error?.message ??
					"Failed to load hostels",
			);
		} finally {
			setLoadingHostels(false);
		}
	};

	const loadRooms = async (hostelId: string) => {
		setLoadingRooms(true);
		try {
			const res = await api.get(
				`/students/self/hostels/${hostelId}/rooms`,
			);
			setRooms(res.data.data || []);
		} catch (error: any) {
			setFormError(
				error.response?.data?.error?.message ?? "Failed to load rooms",
			);
		} finally {
			setLoadingRooms(false);
		}
	};

	useEffect(() => {
		if (!profileQuery.data) {
			return;
		}

		setProfileForm({
			phone: profileQuery.data.student.user.phone ?? "",
			department: profileQuery.data.student.department ?? "",
			batch: profileQuery.data.student.batch ?? "",
		});

		if (!profileQuery.data.hostelAssignment) {
			setAssignmentOpen(true);
			if (hostels.length === 0) {
				void loadHostels();
			}
		} else {
			setAssignmentOpen(false);
		}
	}, [profileQuery.data]);

	useEffect(() => {
		if (!toast) {
			return;
		}

		const timeout = window.setTimeout(() => setToast(null), 3500);
		return () => window.clearTimeout(timeout);
	}, [toast]);

	useEffect(() => {
		if (!selectedHostelId) {
			setRooms([]);
			return;
		}

		void loadRooms(selectedHostelId);
	}, [selectedHostelId]);

	const updateProfileMutation = useMutation({
		mutationFn: async () => {
			const res = await api.patch("/students/self/profile", {
				phone: profileForm.phone.trim() || null,
				department: profileForm.department.trim() || null,
				batch: profileForm.batch.trim() || null,
			});

			return res.data.data;
		},
		onSuccess: async () => {
			setFormError("");
			setToast({
				kind: "success",
				message: "Profile updated successfully.",
			});
			await queryClient.invalidateQueries({
				queryKey: ["student-profile"],
			});
		},
		onError: (error: any) => {
			setFormError(
				error.response?.data?.error?.message ??
					"Failed to update profile",
			);
		},
	});

	const assignmentMutation = useMutation({
		mutationFn: async () => {
			const endpoint = hasHostelAssignment
				? "/students/self/change-hostel-room"
				: "/students/self/assign-hostel-room";

			const res = await api.post(endpoint, {
				hostelId: selectedHostelId,
				roomId: selectedRoomId,
				startDate: new Date(),
			});

			return res.data.data;
		},
		onSuccess: async () => {
			setFormError("");
			setToast({
				kind: "success",
				message: hasHostelAssignment
					? "Hostel and room updated. The mess was assigned automatically."
					: "Hostel, room, and mess assigned successfully.",
			});
			setAssignmentOpen(false);
			setSelectedHostelId("");
			setSelectedRoomId("");
			setRooms([]);
			await queryClient.invalidateQueries({
				queryKey: ["student-profile"],
			});
		},
		onError: (error: any) => {
			const code = error.response?.data?.error?.code;
			const message =
				error.response?.data?.error?.message ??
				"Failed to save hostel details";

			if (code === "HOSTEL_CHANGE_COOLDOWN_ACTIVE") {
				setToast({ kind: "error", message });
				setAssignmentOpen(false);
				return;
			}

			setFormError(message);
		},
	});

	const openAssignmentForm = async () => {
		if (hasHostelAssignment && !canChangeHostel) {
			setToast({
				kind: "error",
				message:
					"You can change hostel and room only once every 6 months. Please contact the warden for a manual change.",
			});
			return;
		}

		if (hostels.length === 0) {
			await loadHostels();
		}

		setAssignmentOpen(true);
	};

	const summaryCards = useMemo(
		() => [
			{
				label: "Roll number",
				value: profileQuery.data?.student.rollNumber ?? "—",
			},
			{
				label: "Email",
				value: profileQuery.data?.student.user.email ?? "—",
			},
			{ label: "Current hostel", value: currentHostel },
			{ label: "Current mess", value: currentMess },
		],
		[profileQuery.data, currentHostel, currentMess],
	);

	if (profileQuery.isLoading) {
		return (
			<div className="py-10 text-sm text-slate-500">
				Loading profile...
			</div>
		);
	}

	const assignmentLabel = hasHostelAssignment
		? "Hostel & Mess"
		: "Choose Hostel & Room";
	const assignmentHelper = hasHostelAssignment
		? "Hostel change is allowed only once every 6 months. Otherwise the warden must change it."
		: "Enter your hostel, room, and personal details to complete your first assignment.";
	const assignmentButtonLabel = hasHostelAssignment
		? assignmentOpen
			? "Close change form"
			: "Change hostel / room"
		: "First-time assignment";
	const assignmentSubmitLabel = assignmentMutation.isPending
		? hasHostelAssignment
			? "Updating..."
			: "Assigning..."
		: hasHostelAssignment
			? "Confirm change"
			: "Confirm assignment";

	return (
		<div className="space-y-6">
			{toast && (
				<div
					className={clsx(
						"fixed right-4 top-4 z-50 max-w-sm rounded-xl border px-4 py-3 shadow-lg",
						toast.kind === "success"
							? "border-emerald-200 bg-emerald-50 text-emerald-800"
							: "border-red-200 bg-red-50 text-red-800",
					)}
				>
					<p className="text-sm font-medium">{toast.message}</p>
				</div>
			)}

			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-bold text-slate-900">
						Student Profile
					</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Hostel, mess, billing, and personal details in one
						place.
					</p>
				</div>
				<div className="flex gap-2 flex-wrap">
					<span className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium">
						Due:{" "}
						{formatMoney(
							profileQuery.data?.billing.balanceDue ?? "0",
						)}
					</span>
					<span className="text-xs px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 font-medium">
						Bills: {profileQuery.data?.billing.totalBills ?? 0}
					</span>
				</div>
			</div>

			{formError && (
				<div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
					{formError}
				</div>
			)}

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{summaryCards.map((card) => (
					<div
						key={card.label}
						className="bg-white rounded-lg border border-slate-200 p-4"
					>
						<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
							{card.label}
						</p>
						<p className="mt-1 text-base font-semibold text-slate-900 wrap-break-word">
							{card.value}
						</p>
					</div>
				))}
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
				{/* ── LEFT COLUMN (span 2) ── */}
				<div className="xl:col-span-2 space-y-6">
					<div className="bg-white rounded-lg border border-slate-200 p-5">
						<div className="flex items-center justify-between gap-4 flex-wrap">
							<div>
								<h2 className="text-sm font-semibold text-slate-900">
									Personal Details
								</h2>
								<p className="text-xs text-slate-500 mt-1">
									Update contact details used by the hostel
									office.
								</p>
							</div>
							<span className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium">
								{profileQuery.data?.student.gender}
							</span>
						</div>

						<div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
							<label className="space-y-1">
								<span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
									Phone
								</span>
								<input
									value={profileForm.phone}
									onChange={(event) =>
										setProfileForm((current) => ({
											...current,
											phone: event.target.value,
										}))
									}
									className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
									placeholder="Phone number"
								/>
							</label>
							<label className="space-y-1">
								<span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
									Department
								</span>
								<input
									value={profileForm.department}
									onChange={(event) =>
										setProfileForm((current) => ({
											...current,
											department: event.target.value,
										}))
									}
									className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
									placeholder="Department"
								/>
							</label>
							<label className="space-y-1">
								<span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
									Batch
								</span>
								<input
									value={profileForm.batch}
									onChange={(event) =>
										setProfileForm((current) => ({
											...current,
											batch: event.target.value,
										}))
									}
									className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
									placeholder="Batch"
								/>
							</label>
						</div>

						<div className="mt-4">
							<button
								onClick={() =>
									void updateProfileMutation.mutateAsync()
								}
								disabled={updateProfileMutation.isPending}
								className={primaryButton}
							>
								{updateProfileMutation.isPending
									? "Saving..."
									: "Save changes"}
							</button>
						</div>
					</div>

					<div className="bg-white rounded-lg border border-slate-200 p-5">
						<div className="flex items-center justify-between gap-4 flex-wrap">
							<div>
								<h2 className="text-sm font-semibold text-slate-900">
									{assignmentLabel}
								</h2>
								<p className="text-xs text-slate-500 mt-1">
									{assignmentHelper}
								</p>
							</div>
							{hasHostelAssignment ? (
								<button
									onClick={() => void openAssignmentForm()}
									className={
										assignmentOpen
											? secondaryButton
											: primaryButton
									}
								>
									{assignmentButtonLabel}
								</button>
							) : (
								<span className="text-xs font-semibold px-3 py-2 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
									First-time assignment
								</span>
							)}
						</div>

						<div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
							<div className="rounded-lg border border-slate-200 p-4">
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Hostel
								</p>
								<p className="mt-1 font-semibold text-slate-900">
									{currentHostel}
								</p>
							</div>
							<div className="rounded-lg border border-slate-200 p-4">
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Room
								</p>
								<p className="mt-1 font-semibold text-slate-900">
									{currentRoom}
								</p>
							</div>
							<div className="rounded-lg border border-slate-200 p-4">
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Mess
								</p>
								<p className="mt-1 font-semibold text-slate-900">
									{currentMess}
								</p>
							</div>
						</div>

						<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div className="rounded-lg border border-slate-200 p-4">
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Next eligible hostel change
								</p>
								<p className="mt-1 font-semibold text-slate-900">
									{formatDate(nextEligible)}
								</p>
							</div>
							<div className="rounded-lg border border-slate-200 p-4">
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Current due bill
								</p>
								<p
									className={clsx(
										"mt-1 font-semibold",
										currentBalance > 0
											? "text-red-700"
											: "text-emerald-700",
									)}
								>
									{formatMoney(
										profileQuery.data?.billing.balanceDue ??
											"0",
									)}
								</p>
							</div>
						</div>

						{assignmentOpen && (
							<div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
								<div className="flex items-center justify-between gap-3 flex-wrap">
									<div>
										<h3 className="text-sm font-semibold text-slate-900">
											Select a hostel and room
										</h3>
										<p className="text-xs text-slate-500 mt-1">
											{hasHostelAssignment
												? "The assigned mess will update automatically."
												: "The hostel's mess will be assigned automatically for your first allocation."}
										</p>
									</div>
									{loadingHostels && (
										<span className="text-xs text-slate-500">
											Loading hostels...
										</span>
									)}
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									{hostels.map((hostel) => (
										<button
											key={hostel.id}
											onClick={() => {
												setSelectedHostelId(hostel.id);
												setSelectedRoomId("");
											}}
											className={clsx(
												"rounded-lg border p-4 text-left transition-colors",
												selectedHostelId === hostel.id
													? "border-blue-500 bg-blue-50"
													: "border-slate-200 bg-white hover:border-blue-300",
											)}
										>
											<div className="flex items-start justify-between gap-2">
												<div>
													<p className="font-semibold text-slate-900">
														{hostel.name}
													</p>
													<p className="text-xs text-slate-500 mt-0.5">
														{hostel.gender} •{" "}
														{
															hostel.availableRoomsCount
														}{" "}
														rooms available
													</p>
												</div>
												<span
													className={clsx(
														"text-xs font-semibold px-2 py-1 rounded-full",
														hostel.assignedMess
															? "bg-blue-100 text-blue-700"
															: "bg-amber-100 text-amber-700",
													)}
												>
													{hostel.assignedMess
														? hostel.assignedMess
																.name
														: "No mess"}
												</span>
											</div>
										</button>
									))}
								</div>

								{selectedHostelId && (
									<div className="space-y-3">
										<div>
											<label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
												Select room
											</label>
											{loadingRooms ? (
												<div className="text-sm text-slate-500">
													Loading rooms...
												</div>
											) : (
												<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
													{rooms.map((room) => (
														<button
															key={room.id}
															onClick={() =>
																setSelectedRoomId(
																	room.id,
																)
															}
															className={clsx(
																"rounded-lg border p-3 text-left text-sm transition-colors",
																selectedRoomId ===
																	room.id
																	? "border-blue-500 bg-blue-50"
																	: "border-slate-200 bg-white hover:border-blue-300",
															)}
														>
															<p className="font-semibold text-slate-900">
																Room{" "}
																{
																	room.roomNumber
																}
															</p>
															<p className="text-xs text-slate-500 mt-0.5">
																{
																	room.availableSeats
																}
																/{room.capacity}{" "}
																seats free
															</p>
														</button>
													))}
												</div>
											)}
										</div>

										<div className="flex gap-2">
											<button
												onClick={() =>
													void assignmentMutation.mutateAsync()
												}
												disabled={
													!selectedHostelId ||
													!selectedRoomId ||
													assignmentMutation.isPending
												}
												className={primaryButton}
											>
												{assignmentSubmitLabel}
											</button>
											<button
												onClick={() => {
													setAssignmentOpen(false);
													setSelectedHostelId("");
													setSelectedRoomId("");
													setRooms([]);
												}}
												className={secondaryButton}
											>
												Cancel
											</button>
										</div>
									</div>
								)}

								{hasHostelAssignment &&
									!canChangeHostel &&
									!assignmentOpen && (
										<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
											You can only change hostel and room
											once every 6 months. A warden can
											still do it manually if needed.
										</div>
									)}
							</div>
						)}
					</div>
				</div>
				{/* ── END xl:col-span-2 ── */}

				{/* ── RIGHT SIDEBAR ── */}
				<div className="space-y-6">
					<div className="bg-white rounded-lg border border-slate-200 p-5">
						<h2 className="text-sm font-semibold text-slate-900">
							Identity
						</h2>
						<div className="mt-4 space-y-3 text-sm">
							<div>
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Name
								</p>
								<p className="font-semibold text-slate-900">
									{profileQuery.data?.student.user.firstName}{" "}
									{profileQuery.data?.student.user.lastName}
								</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Email
								</p>
								<p className="font-semibold text-slate-900 wrap-break-word">
									{profileQuery.data?.student.user.email}
								</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Phone
								</p>
								<p className="font-semibold text-slate-900">
									{profileQuery.data?.student.user.phone ??
										"—"}
								</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Department
								</p>
								<p className="font-semibold text-slate-900">
									{profileQuery.data?.student.department ??
										"—"}
								</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Batch
								</p>
								<p className="font-semibold text-slate-900">
									{profileQuery.data?.student.batch ?? "—"}
								</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Academic year
								</p>
								<p className="font-semibold text-slate-900">
									{profileQuery.data?.student.academicYear ??
										"—"}
								</p>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-lg border border-slate-200 p-5">
						<h2 className="text-sm font-semibold text-slate-900">
							Billing
						</h2>
						<div className="mt-4 space-y-3 text-sm">
							<div>
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Total due
								</p>
								<p
									className={clsx(
										"font-semibold",
										currentBalance > 0
											? "text-red-700"
											: "text-emerald-700",
									)}
								>
									{formatMoney(
										profileQuery.data?.billing.balanceDue ??
											"0",
									)}
								</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Latest bill
								</p>
								<p className="font-semibold text-slate-900">
									{profileQuery.data?.billing.latestBill
										? formatMoney(
												profileQuery.data.billing
													.latestBill.balanceDue,
											)
										: "No bills yet"}
								</p>
							</div>
							<div>
								<p className="text-xs uppercase tracking-wide text-slate-500">
									Bill status
								</p>
								<p className="font-semibold text-slate-900">
									{profileQuery.data?.billing.latestBill
										?.status ?? "—"}
								</p>
							</div>
						</div>
					</div>
				</div>
				{/* ── END sidebar ── */}
			</div>
			{/* ── END xl:grid-cols-3 ── */}
		</div>
	);
}
