import { api } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

interface PreviewEntry {
	id: string;
	date: string;
	name: string;
	unit: string;
	quantity: number;
	unitPrice: number;
	amount: number;
	messName: string;
}

interface PreviewResponse {
	student: { id: string; rollNumber: string };
	month: string;
	entries: PreviewEntry[];
	summary: { totalAmount: number; totalQuantity: number; count: number };
}

function toMonthValue(date: Date): string {
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatDate(date: string) {
	return new Intl.DateTimeFormat("en-IN", {
		day: "2-digit",
		month: "short",
	}).format(new Date(date));
}

export default function StudentExtrasPage() {
	const [month, setMonth] = useState(toMonthValue(new Date()));
	const [data, setData] = useState<PreviewResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const load = async () => {
		setLoading(true);
		setError("");
		try {
			const response = await api.get("/student-extras/me/preview", {
				params: { month },
			});
			setData(response.data.data as PreviewResponse);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to load extras preview",
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void load();
	}, [month]);

	const summaryCards = useMemo(() => {
		if (!data) {
			return [
				{ label: "Entries", value: 0 },
				{ label: "Quantity", value: 0 },
				{ label: "Preview total", value: 0 },
			];
		}

		return [
			{ label: "Entries", value: data.summary.count },
			{ label: "Quantity", value: data.summary.totalQuantity },
			{ label: "Preview total", value: data.summary.totalAmount },
		];
	}, [data]);

	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Billing preview</p>
					<h1>Extras preview</h1>
					<p>
						See the monthly extras that will flow into billing
						later, grouped by day and item.
					</p>
				</div>
				<div className="portal-actions">
					<input
						className="portal-input"
						type="month"
						value={month}
						onChange={(event) => setMonth(event.target.value)}
						style={{ width: "auto" }}
					/>
					<button
						className="portal-button portal-button-secondary"
						type="button"
						onClick={() => void load()}
						disabled={loading}
					>
						Refresh
					</button>
				</div>
			</section>

			{error ? <div className="portal-alert error">{error}</div> : null}

			<div className="portal-grid three">
				{summaryCards.map((card) => (
					<div key={card.label} className="portal-card portal-stat">
						<p className="portal-stat-label">{card.label}</p>
						<div className="portal-stat-value">
							{card.label === "Preview total"
								? `₹${Number(card.value).toFixed(2)}`
								: card.value}
						</div>
					</div>
				))}
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Extras breakdown</p>
						<h2>{data?.month ?? month}</h2>
					</div>
					{loading ? (
						<span className="portal-pill">Loading</span>
					) : null}
				</div>

				<div className="portal-table-wrap">
					<table className="portal-table">
						<thead>
							<tr>
								<th>Date</th>
								<th>Item</th>
								<th>Mess</th>
								<th>Quantity</th>
								<th>Rate</th>
								<th>Amount</th>
							</tr>
						</thead>
						<tbody>
							{data?.entries.map((entry) => (
								<tr key={entry.id}>
									<td>{formatDate(entry.date)}</td>
									<td>{entry.name}</td>
									<td>{entry.messName}</td>
									<td>
										{entry.quantity} {entry.unit}
									</td>
									<td>₹{entry.unitPrice.toFixed(2)}</td>
									<td>₹{entry.amount.toFixed(2)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{!data?.entries.length ? (
					<div className="portal-empty">
						No extras added for this month yet.
					</div>
				) : null}
			</div>
		</div>
	);
}
