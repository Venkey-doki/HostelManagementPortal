import { api } from "@/lib/api";
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
		remainingDays: number;
	};
	assignmentSnapshot: {
		hostelAssignment: {
			hostel: { id: string; name: string };
			room: { id: string; roomNumber: string };
		} | null;
		messAssignment: {
			mess: { id: string; name: string };
		} | null;
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

function formatDateLabel(value: string) {
	return new Intl.DateTimeFormat("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
}

function statusClass(status: LeaveStatus) {
	switch (status) {
		case "PENDING":
			return "portal-pill warning";
		case "APPROVED":
			return "portal-pill success";
		case "AUTO_APPROVED":
			return "portal-pill accent";
		case "REJECTED":
			return "portal-pill danger";
		case "CANCELLED":
		default:
			return "portal-pill";
	}
}

const initialStart = toDateInputValue(addDays(new Date(), 2));

export default function StudentLeavesPage() {
	const queryClient = useQueryClient();
	const [startDate, setStartDate] = useState(initialStart);
	const [endDate, setEndDate] = useState(initialStart);
	const [reason, setReason] = useState("");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [returnDates, setReturnDates] = useState<Record<string, string>>({});

	const { data, isLoading, isFetching } = useQuery({
		queryKey: ["student-leaves"],
		queryFn: async () => {
			const response = await api.get("/leaves/me");
			return response.data.data as StudentLeavesResponse;
		},
	});

	const applyMutation = useMutation({
		mutationFn: async () => {
			const response = await api.post("/leaves", {
				startDate,
				endDate,
				reason: reason || undefined,
			});
			return response.data.data as StudentLeaveItem;
		},
		onSuccess: async () => {
			setSuccess("Leave application submitted.");
			setReason("");
			await queryClient.invalidateQueries({
				queryKey: ["student-leaves"],
			});
		},
		onError: (err: any) => {
			setError(
				err.response?.data?.error?.message ?? "Failed to apply leave",
			);
		},
	});

	const cancelMutation = useMutation({
		mutationFn: async (leaveId: string) => {
			const response = await api.delete(`/leaves/${leaveId}`);
			return response.data.data as StudentLeaveItem;
		},
		onSuccess: async () => {
			setSuccess("Leave updated.");
			await queryClient.invalidateQueries({
				queryKey: ["student-leaves"],
			});
		},
		onError: (err: any) => {
			setError(
				err.response?.data?.error?.message ?? "Failed to update leave",
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
		}) => {
			const response = await api.patch(`/leaves/${leaveId}/return`, {
				returnDate,
			});
			return response.data.data as StudentLeaveItem;
		},
		onSuccess: async () => {
			setSuccess("Return date saved.");
			await queryClient.invalidateQueries({
				queryKey: ["student-leaves"],
			});
		},
		onError: (err: any) => {
			setError(
				err.response?.data?.error?.message ?? "Failed to mark return",
			);
		},
	});

	const summaryCards = useMemo(() => {
		if (!data) {
			return [
				{ label: "Pending", value: 0 },
				{ label: "Approved", value: 0 },
				{ label: "Auto-approved", value: 0 },
				{ label: "Remaining days", value: 0 },
			];
		}

		return [
			{ label: "Pending", value: data.summary.PENDING },
			{ label: "Approved", value: data.summary.APPROVED },
			{ label: "Auto-approved", value: data.summary.AUTO_APPROVED },
			{ label: "Remaining days", value: data.summary.remainingDays },
		];
	}, [data]);

	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Student portal</p>
					<h1>Leave management</h1>
					<p>
						Apply for leave with advance validation, track warden
						decisions, and mark early return when you come back.
					</p>
				</div>
				<div className="portal-actions">
					<span className="portal-pill accent">
						Leave days used: {data?.summary.usedDays ?? 0}
					</span>
					<span className="portal-pill">Advance rule: +2 days</span>
				</div>
			</section>

			{error ? <div className="portal-alert error">{error}</div> : null}
			{success ? (
				<div className="portal-alert success">{success}</div>
			) : null}

			<div className="portal-grid four">
				{summaryCards.map((card) => (
					<div key={card.label} className="portal-card portal-stat">
						<p className="portal-stat-label">{card.label}</p>
						<div className="portal-stat-value">{card.value}</div>
					</div>
				))}
			</div>

			<div className="portal-grid two">
				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">New request</p>
							<h2>Apply for leave</h2>
						</div>
					</div>
					<div className="portal-grid two">
						<label className="portal-form-label">
							Start date
							<input
								className="portal-input"
								type="date"
								min={initialStart}
								value={startDate}
								onChange={(event) => {
									const value = event.target.value;
									setStartDate(value);
									if (endDate < value) {
										setEndDate(value);
									}
								}}
							/>
						</label>
						<label className="portal-form-label">
							End date
							<input
								className="portal-input"
								type="date"
								min={startDate}
								value={endDate}
								onChange={(event) =>
									setEndDate(event.target.value)
								}
							/>
						</label>
					</div>
					<label
						className="portal-form-label"
						style={{ marginTop: "12px" }}
					>
						Reason
						<textarea
							className="portal-input"
							rows={4}
							value={reason}
							onChange={(event) => setReason(event.target.value)}
							placeholder="Optional but recommended"
						/>
					</label>
					<div
						className="portal-actions"
						style={{ marginTop: "12px" }}
					>
						<button
							className="portal-button portal-button-primary"
							type="button"
							onClick={() => {
								setError("");
								setSuccess("");
								applyMutation.mutate();
							}}
							disabled={applyMutation.isPending}
						>
							Submit leave
						</button>
						<span className="portal-helper">
							Future dates are blocked if they are less than 2
							days ahead.
						</span>
					</div>
				</div>

				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Current assignment</p>
							<h2>Hostel and mess snapshot</h2>
						</div>
					</div>
					<div className="portal-list">
						<div className="portal-list-item">
							<h3>Hostel</h3>
							<p className="portal-helper">
								{data?.assignmentSnapshot.hostelAssignment
									? `${data.assignmentSnapshot.hostelAssignment.hostel.name} · Room ${data.assignmentSnapshot.hostelAssignment.room.roomNumber}`
									: "No active hostel assignment found."}
							</p>
						</div>
						<div className="portal-list-item">
							<h3>Mess</h3>
							<p className="portal-helper">
								{data?.assignmentSnapshot.messAssignment
									? data.assignmentSnapshot.messAssignment
											.mess.name
									: "No active mess assignment found."}
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">History</p>
						<h2>Leave requests</h2>
					</div>
					{isLoading || isFetching ? (
						<span className="portal-pill">Loading</span>
					) : null}
				</div>

				{!data?.leaves.length ? (
					<div className="portal-empty">No leave requests yet.</div>
				) : null}

				<div className="portal-list">
					{data?.leaves.map((leave) => {
						const returnValue =
							returnDates[leave.id] ??
							toDateInputValue(new Date());
						const isActiveReturnable =
							leave.status === "APPROVED" ||
							leave.status === "AUTO_APPROVED";

						return (
							<div key={leave.id} className="portal-list-item">
								<div className="portal-list-item-header">
									<div>
										<h3>
											{formatDateLabel(leave.startDate)}{" "}
											to {formatDateLabel(leave.endDate)}
										</h3>
										<p className="portal-helper">
											{leave.duration} day
											{leave.duration === 1 ? "" : "s"}
											{leave.reason
												? ` · ${leave.reason}`
												: ""}
										</p>
									</div>
									<span className={statusClass(leave.status)}>
										{leave.status.replaceAll("_", " ")}
									</span>
								</div>

								<div
									className="portal-actions"
									style={{ marginTop: "12px" }}
								>
									<span className="portal-pill">
										Applied{" "}
										{formatDateLabel(leave.appliedOn)}
									</span>
									<span className="portal-pill">
										Auto-approval{" "}
										{new Intl.DateTimeFormat("en-IN", {
											day: "2-digit",
											month: "short",
											hour: "2-digit",
											minute: "2-digit",
										}).format(
											new Date(leave.autoApproveAt),
										)}
									</span>
									{leave.returnDate ? (
										<span className="portal-pill success">
											Returned{" "}
											{formatDateLabel(leave.returnDate)}
										</span>
									) : null}
									{leave.rejectionReason ? (
										<span className="portal-pill danger">
											{leave.rejectionReason}
										</span>
									) : null}
								</div>

								{leave.status === "PENDING" ? (
									<div
										className="portal-actions"
										style={{ marginTop: "12px" }}
									>
										<button
											className="portal-button portal-button-danger"
											type="button"
											onClick={() => {
												setError("");
												setSuccess("");
												cancelMutation.mutate(leave.id);
											}}
											disabled={cancelMutation.isPending}
										>
											Cancel request
										</button>
									</div>
								) : null}

								{isActiveReturnable && !leave.returnDate ? (
									<div
										className="portal-grid two"
										style={{ marginTop: "12px" }}
									>
										<label className="portal-form-label">
											I returned on
											<input
												className="portal-input"
												type="date"
												min={leave.startDate}
												max={leave.endDate}
												value={returnValue}
												onChange={(event) =>
													setReturnDates(
														(current) => ({
															...current,
															[leave.id]:
																event.target
																	.value,
														}),
													)
												}
											/>
										</label>
										<div style={{ alignSelf: "end" }}>
											<button
												className="portal-button portal-button-secondary"
												type="button"
												onClick={() => {
													setError("");
													setSuccess("");
													returnMutation.mutate({
														leaveId: leave.id,
														returnDate: returnValue,
													});
												}}
												disabled={
													returnMutation.isPending
												}
											>
												Mark returned
											</button>
										</div>
									</div>
								) : null}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
