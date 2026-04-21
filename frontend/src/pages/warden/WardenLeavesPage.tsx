import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface WardenPendingLeave {
	id: string; startDate: string; endDate: string; duration: number;
	reason: string | null; status: "PENDING"; appliedOn: string; autoApproveAt: string;
	student: { id: string; rollNumber: string; firstName: string; lastName: string; email: string };
	currentMess: { id: string; name: string } | null;
	currentHostel: { id: string; name: string; roomNumber: string } | null;
}

function formatDate(v: string) {
	return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v));
}
function formatDateTime(v: string) {
	return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}

const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function WardenLeavesPage() {
	const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const { data, isLoading } = useQuery({
		queryKey: ["warden-pending-leaves"],
		queryFn: async () => (await api.get("/leaves/pending")).data.data as { leaves: WardenPendingLeave[] },
	});

	const approveMutation = useMutation({
		mutationFn: async (leaveId: string) => (await api.patch(`/leaves/${leaveId}/approve`)).data.data,
		onSuccess: async () => { setSuccess("Leave approved."); await queryClient.invalidateQueries({ queryKey: ["warden-pending-leaves"] }); },
		onError: (err: any) => { setError(err.response?.data?.error?.message ?? "Failed to approve leave"); },
	});

	const rejectMutation = useMutation({
		mutationFn: async ({ leaveId, rejectionReason }: { leaveId: string; rejectionReason: string }) =>
			(await api.patch(`/leaves/${leaveId}/reject`, { rejectionReason })).data.data,
		onSuccess: async (_, v) => {
			setSuccess("Leave rejected.");
			setRejectionReasons((c) => { const n = { ...c }; delete n[v.leaveId]; return n; });
			await queryClient.invalidateQueries({ queryKey: ["warden-pending-leaves"] });
		},
		onError: (err: any) => { setError(err.response?.data?.error?.message ?? "Failed to reject leave"); },
	});

	const leaves = data?.leaves ?? [];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-bold text-slate-900">Leave Approvals</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Review pending requests before auto-approval triggers at the 48-hour mark.
					</p>
				</div>
				<div className="flex gap-2">
					<span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-sm font-semibold text-amber-700">
						{leaves.length} pending
					</span>
					<span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-sm text-slate-600 font-medium">
						Auto-approval: 48h
					</span>
				</div>
			</div>

			{error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
			{success && <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">{success}</div>}

			{/* Queue */}
			<div className="bg-white rounded-lg border border-slate-200">
				<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">Pending queue</h2>
					{isLoading && <span className="text-xs text-slate-400">Loading…</span>}
				</div>
				{!leaves.length && !isLoading ? (
					<p className="text-center py-10 text-sm text-slate-400">No pending leave requests. All clear!</p>
				) : (
					<div className="divide-y divide-slate-100">
						{leaves.map((leave) => {
							const rejReason = rejectionReasons[leave.id] ?? "";
							return (
								<div key={leave.id} className="p-5">
									<div className="flex items-start justify-between gap-3 mb-3">
										<div>
											<p className="text-sm font-semibold text-slate-900">
												{leave.student.firstName} {leave.student.lastName}
												<span className="ml-2 text-slate-400 font-normal text-xs">· {leave.student.rollNumber}</span>
											</p>
											<p className="text-sm text-slate-600 mt-0.5">
												{formatDate(leave.startDate)} — {formatDate(leave.endDate)}
												<span className="text-slate-400 ml-1">({leave.duration} day{leave.duration !== 1 ? "s" : ""})</span>
											</p>
											{leave.reason && <p className="text-xs text-slate-500 mt-0.5 italic">"{leave.reason}"</p>}
										</div>
										<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 whitespace-nowrap">
											PENDING
										</span>
									</div>

									<div className="flex flex-wrap gap-2 mb-4 text-xs text-slate-500">
										<span>{leave.student.email}</span>
										<span>· Mess: {leave.currentMess?.name ?? "N/A"}</span>
										<span>
											· Hostel: {leave.currentHostel
												? `${leave.currentHostel.name} / ${leave.currentHostel.roomNumber}`
												: "N/A"}
										</span>
										<span>· Auto-approves: {formatDateTime(leave.autoApproveAt)}</span>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label className="block text-xs font-medium text-slate-700 mb-1">
												Rejection reason (required to reject)
											</label>
											<textarea
												rows={2}
												value={rejReason}
												onChange={(e) => setRejectionReasons((c) => ({ ...c, [leave.id]: e.target.value }))}
												placeholder="Explain rejection reason…"
												className={cn(inputClass, "resize-none")}
											/>
										</div>
										<div className="flex items-end gap-2">
											<button
												type="button"
												onClick={() => { setError(""); setSuccess(""); approveMutation.mutate(leave.id); }}
												disabled={approveMutation.isPending}
												className="flex-1 py-2 px-4 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors"
											>
												Approve
											</button>
											<button
												type="button"
												onClick={() => { setError(""); setSuccess(""); rejectMutation.mutate({ leaveId: leave.id, rejectionReason: rejReason }); }}
												disabled={rejectMutation.isPending || !rejReason.trim()}
												className="flex-1 py-2 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 transition-colors"
											>
												Reject
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
