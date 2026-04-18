import { Link } from "react-router-dom";

export default function WardenDashboardPage() {
	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Warden console</p>
					<h1>Warden dashboard</h1>
					<p>
						Review leave approvals, payment verifications, and
						complaint progress from a single command view.
					</p>
				</div>
				<div className="portal-actions">
					<Link
						className="portal-button portal-button-primary"
						to="/warden/leaves"
					>
						Pending approvals
					</Link>
					<Link
						className="portal-button portal-button-secondary"
						to="/warden/dashboard"
					>
						Reports
					</Link>
				</div>
			</section>

			<div className="portal-grid four">
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Pending leaves</p>
					<div className="portal-stat-value">12</div>
					<p className="portal-helper">
						Leaves awaiting manual action.
					</p>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Payments queue</p>
					<div className="portal-stat-value">8</div>
					<p className="portal-helper">
						New payment proofs to verify.
					</p>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Open complaints</p>
					<div className="portal-stat-value">5</div>
					<p className="portal-helper">
						Need assignment or resolution.
					</p>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Collection rate</p>
					<div className="portal-stat-value">91%</div>
					<p className="portal-helper">
						Collection health for the current billing cycle.
					</p>
				</div>
			</div>

			<div className="portal-grid two">
				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Actions</p>
							<h2>Work queues</h2>
						</div>
					</div>
					<div className="portal-list">
						<div className="portal-list-item">
							<div className="portal-list-item-header">
								<div>
									<h3>Leave review</h3>
									<p className="portal-helper">
										Review student applications before
										auto-approval happens.
									</p>
								</div>
								<Link
									className="portal-pill warning"
									to="/warden/leaves"
								>
									Open queue
								</Link>
							</div>
						</div>
						<div className="portal-list-item">
							<div className="portal-list-item-header">
								<div>
									<h3>Payment verification</h3>
									<p className="portal-helper">
										Credit verified payments to the student
										ledger.
									</p>
								</div>
								<span className="portal-pill accent">
									In progress
								</span>
							</div>
						</div>
						<div className="portal-list-item">
							<div className="portal-list-item-header">
								<div>
									<h3>Complaint triage</h3>
									<p className="portal-helper">
										Assign technical issues to the right
										technician.
									</p>
								</div>
								<span className="portal-pill">5 open</span>
							</div>
						</div>
					</div>
				</div>
				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Insights</p>
							<h2>Operational summary</h2>
						</div>
					</div>
					<div className="portal-mini-grid">
						<div className="portal-mini-card">
							<h3>Leave SLA</h3>
							<p>
								Most requests are being closed within a day in
								the demo workflow.
							</p>
						</div>
						<div className="portal-mini-card">
							<h3>Billing</h3>
							<p>
								Frozen monthly bills keep the ledger stable for
								corrections.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
