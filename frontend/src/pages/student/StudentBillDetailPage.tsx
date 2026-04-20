import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

type BillLineItem = {
	id: string;
	type: "HOSTEL_RENT" | "MESS_CHARGE" | "EXTRA" | "ADJUSTMENT";
	description: string;
	date: string | null;
	quantity: string;
	unitPrice: string;
	amount: string;
	referenceId: string | null;
};

type Payment = {
	id: string;
	amount: string;
	paymentDate: string;
	referenceNumber: string;
	status: string;
};

type BillDetail = {
	id: string;
	billingMonth: string;
	hostelRent: string;
	messCharges: string;
	extrasTotal: string;
	totalAmount: string;
	amountPaid: string;
	balanceDue: string;
	status: "GENERATED" | "PARTIALLY_PAID" | "PAID";
	chargeableDays: number;
	waivedDays: number;
	totalDays: number;
	student: {
		id: string;
		rollNumber: string;
		firstName: string;
		lastName: string;
	};
	lineItems: BillLineItem[];
	payments: Payment[];
};

function formatMonth(dateValue: string) {
	return new Intl.DateTimeFormat("en-IN", {
		month: "long",
		year: "numeric",
	}).format(new Date(dateValue));
}

function formatMoney(value: string) {
	return `₹${Number(value).toFixed(2)}`;
}

function formatDate(value: string | null) {
	if (!value) {
		return "-";
	}

	return new Intl.DateTimeFormat("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
}

export default function StudentBillDetailPage() {
	const { billId } = useParams<{ billId: string }>();
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const [referenceNumber, setReferenceNumber] = useState("");
	const [amount, setAmount] = useState("");
	const [paymentDate, setPaymentDate] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [screenshot, setScreenshot] = useState<File | null>(null);

	const { data, isLoading, error } = useQuery({
		queryKey: ["student-bill", billId],
		queryFn: async () => {
			const response = await api.get(`/bills/me/${billId}`);
			return response.data.data as BillDetail;
		},
		enabled: Boolean(billId),
	});

	useEffect(() => {
		if (!data) {
			return;
		}

		setAmount((current) => {
			if (current.trim()) {
				return current;
			}
			return Number(data.balanceDue).toFixed(2);
		});
	}, [data]);

	const submitPaymentMutation = useMutation({
		mutationFn: async () => {
			if (!billId) {
				throw new Error("Bill not found");
			}

			if (!screenshot) {
				throw new Error("Payment screenshot is required");
			}

			const formData = new FormData();
			formData.append("billId", billId);
			formData.append("amount", amount);
			formData.append("paymentDate", paymentDate);
			formData.append("referenceNumber", referenceNumber);
			formData.append("screenshot", screenshot);

			const response = await api.post("/payments", formData);
			return response.data.data;
		},
		onSuccess: async () => {
			setSuccessMessage(
				"Payment proof submitted. Warden verification is pending.",
			);
			setReferenceNumber("");
			setScreenshot(null);
			await queryClient.invalidateQueries({
				queryKey: ["student-bill", billId],
			});
			await queryClient.invalidateQueries({
				queryKey: ["student-bills"],
			});
		},
		onError: (err: any) => {
			const status = err?.response?.status as number | undefined;
			const code = err?.response?.data?.error?.code as string | undefined;
			setErrorMessage(
				(status === 401
					? "Session expired. Please login again and retry."
					: code === "SCREENSHOT_UPLOAD_UNAVAILABLE"
						? "Screenshot upload is temporarily unavailable. Please try again in a moment."
						: undefined) ??
					err.response?.data?.error?.message ??
					err.message ??
					"Failed to submit payment proof",
			);
		},
	});

	if (!billId) {
		return <div className="portal-empty">Bill not found.</div>;
	}

	if (error) {
		return (
			<div className="portal-alert error">
				Failed to load bill details
			</div>
		);
	}

	return (
		<div className="portal-page">
			{errorMessage ? (
				<div className="portal-alert error">{errorMessage}</div>
			) : null}
			{successMessage ? (
				<div className="portal-alert success">{successMessage}</div>
			) : null}

			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Billing detail</p>
					<h1>
						{data ? formatMonth(data.billingMonth) : "Bill details"}
					</h1>
					<p>
						Line-item level breakdown of the frozen monthly invoice.
					</p>
				</div>
				<div className="portal-actions">
					<Link
						className="portal-button portal-button-secondary"
						to="/student/billing"
					>
						Back to bills
					</Link>
				</div>
			</section>

			<div className="portal-grid four">
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Total</p>
					<div className="portal-stat-value">
						{data ? formatMoney(data.totalAmount) : "-"}
					</div>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Paid</p>
					<div className="portal-stat-value">
						{data ? formatMoney(data.amountPaid) : "-"}
					</div>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Balance due</p>
					<div className="portal-stat-value">
						{data ? formatMoney(data.balanceDue) : "-"}
					</div>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Status</p>
					<div className="portal-stat-value">
						{data?.status ?? (isLoading ? "Loading" : "-")}
					</div>
				</div>
			</div>

			<div className="portal-grid two">
				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Student</p>
							<h2>
								{data
									? `${data.student.firstName} ${data.student.lastName}`
									: "-"}
							</h2>
						</div>
					</div>
					<p className="portal-helper">
						Roll number: {data?.student.rollNumber ?? "-"}
					</p>
					<p className="portal-helper">
						Chargeable days: {data?.chargeableDays ?? "-"}
					</p>
					<p className="portal-helper">
						Waived days: {data?.waivedDays ?? "-"}
					</p>
				</div>
				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Billing summary</p>
							<h2>Charge breakdown</h2>
						</div>
					</div>
					<div className="portal-mini-grid">
						<div className="portal-mini-card">
							<h3>Hostel rent</h3>
							<p>{data ? formatMoney(data.hostelRent) : "-"}</p>
						</div>
						<div className="portal-mini-card">
							<h3>Mess charges</h3>
							<p>{data ? formatMoney(data.messCharges) : "-"}</p>
						</div>
						<div className="portal-mini-card">
							<h3>Extras</h3>
							<p>{data ? formatMoney(data.extrasTotal) : "-"}</p>
						</div>
						<div className="portal-mini-card">
							<h3>Frozen bill</h3>
							<p>Immutable after generation</p>
						</div>
					</div>
				</div>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Payment proof</p>
						<h2>Submit transfer details</h2>
					</div>
				</div>
				<div className="portal-grid two">
					<label className="portal-form-label">
						Amount
						<input
							className="portal-input"
							type="number"
							step="0.01"
							min="0.01"
							value={amount}
							onChange={(event) => setAmount(event.target.value)}
						/>
					</label>
					<label className="portal-form-label">
						Payment date
						<input
							className="portal-input"
							type="date"
							value={paymentDate}
							onChange={(event) =>
								setPaymentDate(event.target.value)
							}
						/>
					</label>
					<label className="portal-form-label">
						Reference number
						<input
							className="portal-input"
							type="text"
							value={referenceNumber}
							onChange={(event) =>
								setReferenceNumber(event.target.value)
							}
							placeholder="UTR / transaction reference"
						/>
					</label>
					<label className="portal-form-label">
						Screenshot proof
						<input
							className="portal-input"
							type="file"
							accept="image/*"
							onChange={(event) =>
								setScreenshot(event.target.files?.[0] ?? null)
							}
						/>
					</label>
				</div>
				<div className="portal-actions" style={{ marginTop: "14px" }}>
					<button
						className="portal-button portal-button-primary"
						type="button"
						onClick={() => {
							setErrorMessage("");
							setSuccessMessage("");
							submitPaymentMutation.mutate();
						}}
						disabled={
							submitPaymentMutation.isPending ||
							!amount.trim() ||
							!referenceNumber.trim() ||
							!screenshot
						}
					>
						{submitPaymentMutation.isPending
							? "Submitting..."
							: "Submit proof"}
					</button>
					<span className="portal-helper">
						Verification is manual. Balance updates after warden
						approval.
					</span>
				</div>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Line items</p>
						<h2>Every rupee explained</h2>
					</div>
				</div>

				<div className="portal-table-wrap">
					<table className="portal-table">
						<thead>
							<tr>
								<th>Type</th>
								<th>Description</th>
								<th>Date</th>
								<th>Qty</th>
								<th>Rate</th>
								<th>Amount</th>
							</tr>
						</thead>
						<tbody>
							{data?.lineItems.map((item) => (
								<tr key={item.id}>
									<td>{item.type}</td>
									<td>{item.description}</td>
									<td>{formatDate(item.date)}</td>
									<td>{item.quantity}</td>
									<td>{formatMoney(item.unitPrice)}</td>
									<td>{formatMoney(item.amount)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Payments</p>
						<h2>Ledger preview</h2>
					</div>
				</div>
				{data?.payments.length ? (
					<div className="portal-table-wrap">
						<table className="portal-table">
							<thead>
								<tr>
									<th>Date</th>
									<th>Reference</th>
									<th>Status</th>
									<th>Amount</th>
								</tr>
							</thead>
							<tbody>
								{data.payments.map((payment) => (
									<tr key={payment.id}>
										<td>
											{formatDate(payment.paymentDate)}
										</td>
										<td>{payment.referenceNumber}</td>
										<td>{payment.status}</td>
										<td>{formatMoney(payment.amount)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="portal-empty">
						No payment entries are linked yet.
					</div>
				)}
			</div>
		</div>
	);
}
