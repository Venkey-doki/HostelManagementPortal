import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

interface WardenPendingLeave {
	id: string;
	startDate: string;
	endDate: string;
	duration: number;
	reason: string | null;
	status: "PENDING";
	appliedOn: string;
	autoApproveAt: string;
	student: {
		id: string;
		rollNumber: string;
		firstName: string;
		lastName: string;
		email: string;
	};
	currentMess: { id: string; name: string } | null;
	currentHostel: { id: string; name: string; roomNumber: string } | null;
}

interface WardenPendingLeavesResponse {
	leaves: WardenPendingLeave[];
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
}

export default function WardenLeavesPage() {
	const [rejectionReasons, setRejectionReasons] = useState<
		Record<string, string>
	>({});
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const { data, isLoading, isFetching } = useQuery({
		queryKey: ["warden-pending-leaves"],
		queryFn: async () => {
			const response = await api.get("/leaves/pending");
			return response.data.data as WardenPendingLeavesResponse;
		},
	});

	const approveMutation = useMutation({
		mutationFn: async (leaveId: string) => {
			const response = await api.patch(`/leaves/${leaveId}/approve`);
			return response.data.data as WardenPendingLeave;
		},
		onSuccess: async () => {
			setSuccess("Leave approved.");
			await queryClient.invalidateQueries({
				queryKey: ["warden-pending-leaves"],
			});
		},
		onError: (err: any) => {
			setError(
				err.response?.data?.error?.message ?? "Failed to approve leave",
			);
		},
	});

	const rejectMutation = useMutation({
		mutationFn: async ({
			leaveId,
			rejectionReason,
		}: {
			leaveId: string;
			rejectionReason: string;
		}) => {
			const response = await api.patch(`/leaves/${leaveId}/reject`, {
				rejectionReason,
			});
			return response.data.data as WardenPendingLeave;
		},
		onSuccess: async (_, variables) => {
			setSuccess("Leave rejected.");
			setRejectionReasons((current) => {
				const next = { ...current };
				delete next[variables.leaveId];
				return next;
			});
			await queryClient.invalidateQueries({
				queryKey: ["warden-pending-leaves"],
			});
		},
		onError: (err: any) => {
			setError(
				err.response?.data?.error?.message ?? "Failed to reject leave",
			);
		},
	});

	const summary = useMemo(
		() => ({ count: data?.leaves.length ?? 0 }),
		[data],
	);

	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Warden console</p>
					<h1>Leave approvals</h1>
					<p>
						Review pending requests, approve or reject them, and
						keep the 48-hour auto-approval window under control.
					</p>
				</div>
				<div className="portal-actions">
					<span className="portal-pill warning">
						Pending: {summary.count}
					</span>
					<span className="portal-pill">Auto-approval: 48h</span>
				</div>
			</section>

			{error ? <div className="portal-alert error">{error}</div> : null}
			{success ? (
				<div className="portal-alert success">{success}</div>
			) : null}

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Queue</p>
						<h2>Pending leaves</h2>
					</div>
					{isLoading || isFetching ? (
						<span className="portal-pill">Loading</span>
					) : null}
				</div>

				{!data?.leaves.length ? (
					<div className="portal-empty">
						No pending leave requests.
					</div>
				) : null}

				<div className="portal-list">
					{data?.leaves.map((leave) => {
						const rejectionReason =
							rejectionReasons[leave.id] ?? "";
						return (
							<div key={leave.id} className="portal-list-item">
								<div className="portal-list-item-header">
									<div>
										<h3>
											{leave.student.firstName}{" "}
											{leave.student.lastName}
											<span className="portal-helper">
												{" "}
												· {leave.student.rollNumber}
											</span>
										</h3>
										<p className="portal-helper">
											{formatDate(leave.startDate)} to{" "}
											{formatDate(leave.endDate)} ·{" "}
											{leave.duration} day
											{leave.duration === 1 ? "" : "s"}
										</p>
									</div>
									<span className="portal-pill warning">
										Pending
									</span>
								</div>

								<div
									className="portal-actions"
									style={{ marginTop: "12px" }}
								>
									<span className="portal-pill">
										{leave.student.email}
									</span>
									<span className="portal-pill">
										Mess: {leave.currentMess?.name ?? "N/A"}
									</span>
									<span className="portal-pill">
										Hostel:{" "}
										{leave.currentHostel
											? `${leave.currentHostel.name} / ${leave.currentHostel.roomNumber}`
											: "N/A"}
									</span>
									<span className="portal-pill">
										Auto-approves{" "}
										{new Intl.DateTimeFormat("en-IN", {
											day: "2-digit",
											month: "short",
											hour: "2-digit",
											minute: "2-digit",
										}).format(
											new Date(leave.autoApproveAt),
										)}
									</span>
								</div>

								{leave.reason ? (
									<p
										className="portal-helper"
										style={{ marginTop: "10px" }}
									>
										{leave.reason}
									</p>
								) : null}

								<div
									className="portal-grid two"
									style={{ marginTop: "12px" }}
								>
									<div>
										<label className="portal-form-label">
											Rejection reason
											<textarea
												className="portal-input"
												rows={3}
												value={rejectionReason}
												onChange={(event) =>
													setRejectionReasons(
														(current) => ({
															...current,
															[leave.id]:
																event.target
																	.value,
														}),
													)
												}
												placeholder="Optional but recommended"
											/>
										</label>
									</div>
									<div
										className="portal-actions"
										style={{ alignSelf: "end" }}
									>
										<button
											className="portal-button portal-button-primary"
											type="button"
											onClick={() => {
												setError("");
												setSuccess("");
												approveMutation.mutate(
													leave.id,
												);
											}}
											disabled={approveMutation.isPending}
										>
											Approve
										</button>
										<button
											className="portal-button portal-button-secondary"
											type="button"
											onClick={() => {
												setError("");
												setSuccess("");
												rejectMutation.mutate({
													leaveId: leave.id,
													rejectionReason,
												});
											}}
											disabled={
												rejectMutation.isPending ||
												!rejectionReason.trim()
											}
										>
											Reject
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
