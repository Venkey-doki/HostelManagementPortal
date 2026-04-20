import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

type BillSummary = {
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
	generatedAt: string | null;
	createdAt: string;
};

type BillingListResponse = {
	studentId: string;
	bills: BillSummary[];
	totalBills: number;
};

function formatMonth(dateValue: string) {
	return new Intl.DateTimeFormat("en-IN", {
		month: "short",
		year: "numeric",
		calendar: "gregory",
	}).format(new Date(dateValue));
}

function formatMoney(value: string) {
	return `₹${Number(value).toFixed(2)}`;
}

export default function StudentBillingPage() {
	const { data, isLoading, error } = useQuery({
		queryKey: ["student-bills"],
		queryFn: async () => {
			const response = await api.get("/bills/me");
			return response.data.data as BillingListResponse;
		},
	});

	const bills = data?.bills ?? [];
	const balanceDue = bills.reduce(
		(total, bill) => total + Number(bill.balanceDue),
		0,
	);
	const totalAmount = bills.reduce(
		(total, bill) => total + Number(bill.totalAmount),
		0,
	);
	const paidAmount = bills.reduce(
		(total, bill) => total + Number(bill.amountPaid),
		0,
	);

	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Billing</p>
					<h1>Monthly bills</h1>
					<p>
						Frozen bills with hostel rent, mess charges, and extras.
						Each bill is immutable once generated.
					</p>
				</div>
				<div className="portal-actions">
					<span className="portal-pill">
						{data ? `${data.totalBills} bills` : "Loading"}
					</span>
				</div>
			</section>

			{error ? (
				<div className="portal-alert error">
					Failed to load billing data
				</div>
			) : null}

			<div className="portal-grid three">
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Total billed</p>
					<div className="portal-stat-value">
						{formatMoney(String(totalAmount))}
					</div>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Paid</p>
					<div className="portal-stat-value">
						{formatMoney(String(paidAmount))}
					</div>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Balance due</p>
					<div className="portal-stat-value">
						{formatMoney(String(balanceDue))}
					</div>
				</div>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Bill history</p>
						<h2>Generated invoices</h2>
					</div>
					{isLoading ? (
						<span className="portal-pill">Loading</span>
					) : null}
				</div>

				<div className="portal-table-wrap">
					<table className="portal-table">
						<thead>
							<tr>
								<th>Month</th>
								<th>Hostel rent</th>
								<th>Mess charges</th>
								<th>Extras</th>
								<th>Total</th>
								<th>Balance</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{bills.map((bill) => (
								<tr key={bill.id}>
									<td>{formatMonth(bill.billingMonth)}</td>
									<td>{formatMoney(bill.hostelRent)}</td>
									<td>{formatMoney(bill.messCharges)}</td>
									<td>{formatMoney(bill.extrasTotal)}</td>
									<td>{formatMoney(bill.totalAmount)}</td>
									<td>{formatMoney(bill.balanceDue)}</td>
									<td>{bill.status}</td>
									<td>
										<Link
											className="portal-button portal-button-secondary"
											to={`/student/billing/${bill.id}`}
										>
											Open
										</Link>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{!bills.length ? (
					<div className="portal-empty">No bills generated yet.</div>
				) : null}
			</div>
		</div>
	);
}
