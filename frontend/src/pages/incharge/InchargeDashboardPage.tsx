import { Link } from "react-router-dom";

export default function InchargeDashboardPage() {
	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Mess operations</p>
					<h1>Incharge dashboard</h1>
					<p>
						Mark attendance, manage mess extras, and review the
						current day’s operational state.
					</p>
				</div>
				<div className="portal-actions">
					<Link
						className="portal-button portal-button-primary"
						to="/incharge/dashboard"
					>
						Mark attendance
					</Link>
					<Link
						className="portal-button portal-button-secondary"
						to="/incharge/dashboard"
					>
						Add extras
					</Link>
				</div>
			</section>

			<div className="portal-grid four">
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Assigned students</p>
					<div className="portal-stat-value">182</div>
					<p className="portal-helper">
						Count for the current mess roster.
					</p>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Marked today</p>
					<div className="portal-stat-value">156</div>
					<p className="portal-helper">
						Attendance entries recorded today.
					</p>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Extra charges</p>
					<div className="portal-stat-value">24</div>
					<p className="portal-helper">
						Student extras added for billing.
					</p>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Waived days</p>
					<div className="portal-stat-value">2</div>
					<p className="portal-helper">
						Mess-day waivers this cycle.
					</p>
				</div>
			</div>

			<div className="portal-grid two">
				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Today</p>
							<h2>Meal checklist</h2>
						</div>
					</div>
					<div className="portal-mini-grid">
						<div className="portal-mini-card">
							<h3>Breakfast</h3>
							<p>
								Morning attendance and confirmations are ready
								to mark.
							</p>
						</div>
						<div className="portal-mini-card">
							<h3>Lunch</h3>
							<p>
								Quick toggles and backdate support will live on
								the attendance screen.
							</p>
						</div>
						<div className="portal-mini-card">
							<h3>Dinner</h3>
							<p>
								Evening meal tracking and extras are used for
								monthly billing.
							</p>
						</div>
						<div className="portal-mini-card">
							<h3>Waivers</h3>
							<p>
								One-click full-day waiver applies before billing
								runs.
							</p>
						</div>
					</div>
				</div>
				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Billing inputs</p>
							<h2>Why this matters</h2>
						</div>
					</div>
					<div className="portal-mini-card">
						<p>
							The attendance data you enter here flows into the
							monthly billing engine and the student bill
							breakdown.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
