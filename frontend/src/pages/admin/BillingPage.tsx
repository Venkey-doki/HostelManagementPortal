import { api } from "@/lib/api";
import { useMemo, useState } from "react";

type GenerateResult = {
	month: string;
	locked: boolean;
	message?: string;
	processedCount?: number;
	skippedCount?: number;
	failedCount?: number;
	processed?: Array<{
		studentId: string;
		created: boolean;
		billId: string;
	}>;
	skipped?: Array<{ studentId: string; reason: string }>;
	failed?: Array<{ studentId: string; reason: string }>;
};

function getDefaultMonth() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	return `${year}-${month}`;
}

export default function BillingPage() {
	const [month, setMonth] = useState(getDefaultMonth);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [result, setResult] = useState<GenerateResult | null>(null);

	const summary = useMemo(() => {
		if (!result) {
			return { processed: 0, skipped: 0, failed: 0 };
		}

		return {
			processed: result.processedCount ?? 0,
			skipped: result.skippedCount ?? 0,
			failed: result.failedCount ?? 0,
		};
	}, [result]);

	const onGenerate = async (event: React.FormEvent) => {
		event.preventDefault();
		setError("");
		setSuccess("");
		setResult(null);

		setIsSubmitting(true);
		try {
			const response = await api.post("/bills/generate", { month });
			const payload = response.data.data as GenerateResult;
			setResult(payload);

			if (payload.locked) {
				setSuccess(
					payload.message ??
						"Billing generation is currently running for this month.",
				);
				return;
			}

			const processed = payload.processedCount ?? 0;
			const skipped = payload.skippedCount ?? 0;
			const failed = payload.failedCount ?? 0;
			if (failed > 0) {
				setSuccess(
					`Generation finished with issues. Processed ${processed}, skipped ${skipped}, failed ${failed}.`,
				);
			} else {
				setSuccess(
					`Billing generation completed. Processed ${processed}, skipped ${skipped}, failed ${failed}.`,
				);
			}
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to generate bills for the selected month.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Billing control</p>
					<h1>Manual bill generation</h1>
					<p>
						Run month-wise bill generation for all active students
						using the billing engine.
					</p>
				</div>
				<div className="portal-actions">
					<span className="portal-pill accent">
						Processed: {summary.processed}
					</span>
					<span className="portal-pill">
						Skipped: {summary.skipped}
					</span>
					<span className="portal-pill warning">
						Failed: {summary.failed}
					</span>
				</div>
			</section>

			{error ? <div className="portal-alert error">{error}</div> : null}
			{success ? (
				<div className="portal-alert success">{success}</div>
			) : null}

			<div className="portal-grid two">
				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Run generation</p>
							<h2>Select month</h2>
						</div>
					</div>

					<form className="portal-form-grid" onSubmit={onGenerate}>
						<label className="portal-form-label">
							Billing month
							<input
								className="portal-input"
								type="month"
								value={month}
								onChange={(event) =>
									setMonth(event.target.value)
								}
								required
							/>
						</label>

						<div
							className="portal-actions"
							style={{ marginTop: "8px" }}
						>
							<button
								className="portal-button portal-button-primary"
								type="submit"
								disabled={isSubmitting || !month}
							>
								{isSubmitting
									? "Generating..."
									: "Generate bills"}
							</button>
						</div>
					</form>
				</div>

				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">How it works</p>
							<h2>Notes</h2>
						</div>
					</div>
					<ul className="portal-list">
						<li className="portal-list-item">
							Bills are generated for active students only.
						</li>
						<li className="portal-list-item">
							Existing monthly bills are skipped automatically.
						</li>
						<li className="portal-list-item">
							Failures usually mean missing hostel/mess
							assignments for that month.
						</li>
					</ul>
				</div>
			</div>

			{result && !result.locked ? (
				<div className="portal-grid two">
					<div className="portal-card">
						<div className="portal-card-header">
							<div>
								<p className="portal-kicker">Processed</p>
								<h2>Generated bills</h2>
							</div>
						</div>
						{result.processed?.length ? (
							<div className="portal-list">
								{result.processed.map((item) => (
									<div
										key={item.billId}
										className="portal-list-item"
									>
										<div>
											<h3>{item.studentId}</h3>
											<p className="portal-helper">
												Bill ID: {item.billId}
											</p>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="portal-empty">
								No new bills were generated.
							</div>
						)}
					</div>

					<div className="portal-card">
						<div className="portal-card-header">
							<div>
								<p className="portal-kicker">
									Skipped / failed
								</p>
								<h2>Review issues</h2>
							</div>
						</div>

						{result.skipped?.length ? (
							<div
								className="portal-list"
								style={{ marginBottom: "12px" }}
							>
								{result.skipped.map((item) => (
									<div
										key={`${item.studentId}-skipped`}
										className="portal-list-item"
									>
										<div>
											<h3>{item.studentId}</h3>
											<p className="portal-helper">
												{item.reason}
											</p>
										</div>
									</div>
								))}
							</div>
						) : null}

						{result.failed?.length ? (
							<div className="portal-list">
								{result.failed.map((item) => (
									<div
										key={`${item.studentId}-failed`}
										className="portal-list-item"
									>
										<div>
											<h3>{item.studentId}</h3>
											<p className="portal-helper">
												{item.reason}
											</p>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="portal-empty">
								No failures reported.
							</div>
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}
