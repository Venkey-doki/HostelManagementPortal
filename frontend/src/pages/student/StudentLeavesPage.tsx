import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type LeaveStatus =
	| "PENDING"
	| "APPROVED"
	| "REJECTED"
	| "AUTO_APPROVED"
	| "CANCELLED";

interface StudentLeaveItem {
	id: string;
	startDate: string;
	endDate: string;
	duration: number;
	reason: string | null;
	status: LeaveStatus;
	appliedOn: string;
	autoApproveAt: string;
	actionedAt: string | null;
	returnDate: string | null;
	rejectionReason: string | null;
}
interface StudentLeavesResponse {
	leaves: StudentLeaveItem[];
	summary: {
		PENDING: number;
		APPROVED: number;
		REJECTED: number;
		AUTO_APPROVED: number;
		CANCELLED: number;
		usedDays: number;
	};
	assignmentSnapshot: {
		hostelAssignment: {
			hostel: { id: string; name: string };
			room: { id: string; roomNumber: string };
		} | null;
		messAssignment: { mess: { id: string; name: string } } | null;
	};
}

function addDays(date: Date, days: number): Date {
	return new Date(
		Date.UTC(
			date.getUTCFullYear(),
			date.getUTCMonth(),
			date.getUTCDate() + days,
		),
	);
}
function toDateInputValue(date: Date): string {
	return date.toISOString().slice(0, 10);
}
function formatDate(value: string) {
	return new Intl.DateTimeFormat("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
}

const STATUS_BADGE: Record<LeaveStatus, string> = {
	PENDING: "bg-amber-100 text-amber-700",
	APPROVED: "bg-green-100 text-green-700",
	AUTO_APPROVED: "bg-blue-100 text-blue-700",
	REJECTED: "bg-red-100 text-red-700",
	CANCELLED: "bg-slate-100 text-slate-600",
};

const initialStart = toDateInputValue(addDays(new Date(), 2));

export default function StudentLeavesPage() {
	const queryClient = useQueryClient();
	const [startDate, setStartDate] = useState(initialStart);
	const [endDate, setEndDate] = useState(initialStart);
	const [reason, setReason] = useState("");
	const [formError, setFormError] = useState("");
	const [formSuccess, setFormSuccess] = useState("");
	const [returnDates, setReturnDates] = useState<Record<string, string>>({});

	const { data, isLoading } = useQuery({
		queryKey: ["student-leaves"],
		queryFn: async () => {
			const res = await api.get("/leaves/me");
			return res.data.data as StudentLeavesResponse;
		},
	});

	const applyMutation = useMutation({
		mutationFn: async () => {
			const res = await api.post("/leaves", {
				startDate,
				endDate,
				reason: reason || undefined,
			});
			return res.data.data as StudentLeaveItem;
		},
		onSuccess: async () => {
			setFormSuccess("Leave application submitted.");
			setFormError("");
			setReason("");
			await queryClient.invalidateQueries({
				queryKey: ["student-leaves"],
			});
		},
		onError: (err: any) => {
			setFormError(
				err.response?.data?.error?.message ?? "Failed to apply leave",
			);
		},
	});

	const cancelMutation = useMutation({
		mutationFn: async (id: string) =>
			(await api.delete(`/leaves/${id}`)).data.data,
		onSuccess: async () => {
			setFormSuccess("Leave cancelled.");
			await queryClient.invalidateQueries({
				queryKey: ["student-leaves"],
			});
		},
		onError: (err: any) => {
			setFormError(
				err.response?.data?.error?.message ?? "Failed to cancel leave",
			);
		},
	});

	const returnMutation = useMutation({
		mutationFn: async ({
			leaveId,
			returnDate,
		}: {
			leaveId: string;
			returnDate: string;
		}) =>
			(await api.patch(`/leaves/${leaveId}/return`, { returnDate })).data
				.data,
		onSuccess: async () => {
			setFormSuccess("Return date saved.");
			await queryClient.invalidateQueries({
				queryKey: ["student-leaves"],
			});
		},
		onError: (err: any) => {
			setFormError(
				err.response?.data?.error?.message ?? "Failed to mark return",
			);
		},
	});

	const summaryStats = useMemo(
		() => [
			{ label: "Pending", value: data?.summary.PENDING ?? 0 },
			{
				label: "Approved",
				value:
					(data?.summary.APPROVED ?? 0) +
					(data?.summary.AUTO_APPROVED ?? 0),
			},
			{ label: "Days used", value: data?.summary.usedDays ?? 0 },
			{ label: "Max/request", value: 60 },
		],
		[data],
	);

	const inputClass =
		"w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-bold text-slate-900">
						Leave Management
					</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Apply with 2-day advance notice. A single request can be
						up to 60 days.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium">
						Days used: {data?.summary.usedDays ?? 0}
					</span>
					<span className="text-xs px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 font-medium">
						Max/request: 60 days
					</span>
				</div>
			</div>

			{/* Stat cards */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				{summaryStats.map((s) => (
					<div
						key={s.label}
						className="bg-white rounded-lg border border-slate-200 p-4"
					>
						<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
							{s.label}
						</p>
						<p className="mt-1 text-2xl font-bold text-slate-900">
							{s.value}
						</p>
					</div>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Apply for leave */}
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-4">
						Apply for Leave
					</h2>
					{formError && (
						<div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
							{formError}
						</div>
					)}
					{formSuccess && (
						<div className="mb-3 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700">
							{formSuccess}
						</div>
					)}
					<div className="grid grid-cols-2 gap-3 mb-3">
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">
								Start date
							</label>
							<input
								type="date"
								min={initialStart}
								value={startDate}
								onChange={(e) => {
									setStartDate(e.target.value);
									if (endDate < e.target.value)
										setEndDate(e.target.value);
								}}
								className={inputClass}
							/>
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">
								End date
							</label>
							<input
								type="date"
								min={startDate}
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className={inputClass}
							/>
						</div>
					</div>
					<div className="mb-4">
						<label className="block text-xs font-medium text-slate-700 mb-1">
							Reason (optional)
						</label>
						<textarea
							rows={3}
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Brief reason for leave…"
							className={inputClass}
						/>
					</div>
					<button
						type="button"
						onClick={() => {
							setFormError("");
							setFormSuccess("");
							applyMutation.mutate();
						}}
						disabled={applyMutation.isPending}
						className="w-full py-2 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors"
					>
						{applyMutation.isPending
							? "Submitting…"
							: "Submit leave request"}
					</button>
					<p className="mt-2 text-xs text-slate-400">
						Leave must be applied at least 2 days in advance.
					</p>
				</div>

				{/* Assignment snapshot */}
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-4">
						Current Assignment
					</h2>
					<div className="space-y-3">
						<div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
							<p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
								Hostel & Room
							</p>
							<p className="text-sm text-slate-900">
								{data?.assignmentSnapshot.hostelAssignment
									? `${data.assignmentSnapshot.hostelAssignment.hostel.name} · Room ${data.assignmentSnapshot.hostelAssignment.room.roomNumber}`
									: "No active hostel assignment"}
							</p>
						</div>
						<div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
							<p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
								Mess
							</p>
							<p className="text-sm text-slate-900">
								{data?.assignmentSnapshot.messAssignment?.mess
									.name ?? "No active mess assignment"}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Leave history */}
			<div className="bg-white rounded-lg border border-slate-200">
				<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">
						Leave History
					</h2>
					{isLoading && (
						<span className="text-xs text-slate-400">Loading…</span>
					)}
				</div>
				{!data?.leaves.length ? (
					<p className="text-center py-10 text-sm text-slate-400">
						No leave requests yet.
					</p>
				) : (
					<div className="divide-y divide-slate-100">
						{data.leaves.map((leave) => {
							const returnValue =
								returnDates[leave.id] ??
								toDateInputValue(new Date());
							const isReturnable =
								(leave.status === "APPROVED" ||
									leave.status === "AUTO_APPROVED") &&
								!leave.returnDate;
							return (
								<div key={leave.id} className="px-5 py-4">
									<div className="flex items-start justify-between gap-3 mb-2">
										<div>
											<p className="text-sm font-semibold text-slate-900">
												{formatDate(leave.startDate)} —{" "}
												{formatDate(leave.endDate)}
											</p>
											<p className="text-xs text-slate-500 mt-0.5">
												{leave.duration} day
												{leave.duration !== 1
													? "s"
													: ""}
												{leave.reason
													? ` · ${leave.reason}`
													: ""}
											</p>
										</div>
										<span
											className={cn(
												"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
												STATUS_BADGE[leave.status],
											)}
										>
											{leave.status.replace("_", " ")}
										</span>
									</div>
									<div className="flex flex-wrap gap-2 text-xs text-slate-400 mb-2">
										<span>
											Applied{" "}
											{formatDate(leave.appliedOn)}
										</span>
										{leave.returnDate && (
											<span className="text-green-600">
												Returned{" "}
												{formatDate(leave.returnDate)}
											</span>
										)}
										{leave.rejectionReason && (
											<span className="text-red-600">
												{leave.rejectionReason}
											</span>
										)}
									</div>
									{leave.status === "PENDING" && (
										<button
											type="button"
											onClick={() => {
												setFormError("");
												setFormSuccess("");
												cancelMutation.mutate(leave.id);
											}}
											disabled={cancelMutation.isPending}
											className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors"
										>
											Cancel request
										</button>
									)}
									{isReturnable && (
										<div className="flex items-center gap-2 mt-2">
											<input
												type="date"
												min={leave.startDate}
												max={leave.endDate}
												value={returnValue}
												onChange={(e) =>
													setReturnDates((c) => ({
														...c,
														[leave.id]:
															e.target.value,
													}))
												}
												className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
											/>
											<button
												type="button"
												onClick={() => {
													setFormError("");
													setFormSuccess("");
													returnMutation.mutate({
														leaveId: leave.id,
														returnDate: returnValue,
													});
												}}
												disabled={
													returnMutation.isPending
												}
												className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-60 transition-colors"
											>
												Mark returned
											</button>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
