import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type PendingPayment = {
	id: string;
	studentId: string;
	billId: string | null;
	amount: string;
	paymentDate: string;
	referenceNumber: string;
	screenshotUrl: string;
	status: "PENDING";
	student: {
		rollNumber: string;
		firstName: string;
		lastName: string;
		email: string;
	};
	bill: {
		id: string;
		billingMonth: string;
		totalAmount: string;
		amountPaid: string;
		balanceDue: string;
		status: "GENERATED" | "PARTIALLY_PAID" | "PAID" | null;
	} | null;
	createdAt: string;
};

type PendingPaymentsResponse = {
	payments: PendingPayment[];
	totalPending: number;
};

function formatMoney(value: string) {
	return `₹${Number(value).toFixed(2)}`;
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(value));
}

export default function WardenPaymentsPage() {
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [rejectionReasons, setRejectionReasons] = useState<
		Record<string, string>
	>({});

	const { data, isLoading, isFetching } = useQuery({
		queryKey: ["warden-pending-payments"],
		queryFn: async () => {
			const response = await api.get("/payments/pending");
			return response.data.data as PendingPaymentsResponse;
		},
	});

	const verifyMutation = useMutation({
		mutationFn: async (paymentId: string) => {
			const response = await api.patch(`/payments/${paymentId}/verify`);
			return response.data.data;
		},
		onSuccess: async () => {
			setSuccess("Payment verified and credited to bill ledger.");
			await queryClient.invalidateQueries({
				queryKey: ["warden-pending-payments"],
			});
		},
		onError: (err: any) => {
			setError(
				err.response?.data?.error?.message ??
					"Failed to verify payment",
			);
		},
	});

	const rejectMutation = useMutation({
		mutationFn: async ({
			paymentId,
			rejectionReason,
		}: {
			paymentId: string;
			rejectionReason: string;
		}) => {
			const response = await api.patch(`/payments/${paymentId}/reject`, {
				rejectionReason,
			});
			return response.data.data;
		},
		onSuccess: async (_, variables) => {
			setSuccess("Payment rejected.");
			setRejectionReasons((current) => {
				const next = { ...current };
				delete next[variables.paymentId];
				return next;
			});
			await queryClient.invalidateQueries({
				queryKey: ["warden-pending-payments"],
			});
		},
		onError: (err: any) => {
			setError(
				err.response?.data?.error?.message ??
					"Failed to reject payment",
			);
		},
	});

	const summary = useMemo(() => ({ count: data?.totalPending ?? 0 }), [data]);

	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Warden console</p>
					<h1>Payment verification queue</h1>
					<p>
						Review payment proofs, verify valid transfers, and
						reject invalid submissions with a reason.
					</p>
				</div>
				<div className="portal-actions">
					<span className="portal-pill warning">
						Pending: {summary.count}
					</span>
				</div>
			</section>

			{error ? <div className="portal-alert error">{error}</div> : null}
			{success ? (
				<div className="portal-alert success">{success}</div>
			) : null}

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Verification queue</p>
						<h2>Pending payment proofs</h2>
					</div>
					{isLoading || isFetching ? (
						<span className="portal-pill">Loading</span>
					) : null}
				</div>

				{!data?.payments.length ? (
					<div className="portal-empty">
						No pending payments right now.
					</div>
				) : null}

				<div className="portal-list">
					{data?.payments.map((payment) => {
						const rejectionReason =
							rejectionReasons[payment.id] ?? "";

						return (
							<div key={payment.id} className="portal-list-item">
								<div className="portal-list-item-header">
									<div>
										<h3>
											{payment.student.firstName}{" "}
											{payment.student.lastName}
											<span className="portal-helper">
												{" "}
												· {payment.student.rollNumber}
											</span>
										</h3>
										<p className="portal-helper">
											{payment.student.email}
										</p>
									</div>
									<span className="portal-pill warning">
										PENDING
									</span>
								</div>

								<div
									className="portal-grid two"
									style={{ marginTop: "12px" }}
								>
									<div>
										<p className="portal-helper">
											Submitted:{" "}
											{formatDate(payment.createdAt)}
										</p>
										<p className="portal-helper">
											Payment date:{" "}
											{formatDate(payment.paymentDate)}
										</p>
										<p className="portal-helper">
											Amount:{" "}
											{formatMoney(payment.amount)}
										</p>
										<p className="portal-helper">
											Reference: {payment.referenceNumber}
										</p>
										{payment.bill ? (
											<p className="portal-helper">
												Bill balance before credit:{" "}
												{formatMoney(
													payment.bill.balanceDue,
												)}
											</p>
										) : (
											<p className="portal-helper">
												Advance payment (not linked to a
												bill)
											</p>
										)}
									</div>

									<div>
										<a
											className="portal-button portal-button-secondary"
											href={payment.screenshotUrl}
											target="_blank"
											rel="noreferrer"
										>
											Open screenshot
										</a>
										<div style={{ marginTop: "10px" }}>
											<img
												src={payment.screenshotUrl}
												alt="Payment proof"
												style={{
													width: "100%",
													maxHeight: "220px",
													objectFit: "cover",
													borderRadius: "10px",
												}}
											/>
										</div>
									</div>
								</div>

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
															[payment.id]:
																event.target
																	.value,
														}),
													)
												}
												placeholder="Add reason if rejecting"
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
												verifyMutation.mutate(
													payment.id,
												);
											}}
											disabled={verifyMutation.isPending}
										>
											Verify
										</button>
										<button
											className="portal-button portal-button-secondary"
											type="button"
											onClick={() => {
												setError("");
												setSuccess("");
												rejectMutation.mutate({
													paymentId: payment.id,
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
