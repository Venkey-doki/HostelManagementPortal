import { Link } from "react-router-dom";

export default function StudentDashboardPage() {
	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Student portal</p>
					<h1>Student dashboard</h1>
					<p>
						See your hostel life at a glance and move to attendance,
						leave, billing, and complaints from one place.
					</p>
				</div>
				<div className="portal-actions">
					<Link
						className="portal-button portal-button-primary"
						to="/student/leaves"
					>
						Apply leave
					</Link>
					<Link
						className="portal-button portal-button-secondary"
						to="/student/billing"
					>
						Open bills
					</Link>
				</div>
			</section>

			<div className="portal-grid four">
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Attendance</p>
					<div className="portal-stat-value">96%</div>
					<p className="portal-helper">
						This month’s meal attendance trend.
					</p>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Chargeable days</p>
					<div className="portal-stat-value">24</div>
					<p className="portal-helper">
						Days included in the latest bill cycle.
					</p>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Leave status</p>
					<div className="portal-stat-value">1</div>
					<p className="portal-helper">
						Pending leave application awaiting review.
					</p>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Balance due</p>
					<div className="portal-stat-value">INR 0</div>
					<p className="portal-helper">
						No overdue dues in the demo seed.
					</p>
				</div>
			</div>

			<div className="portal-grid two">
				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Quick access</p>
							<h2>Student actions</h2>
						</div>
					</div>
					<div className="portal-mini-grid">
						<Link
							className="portal-mini-card"
							to="/student/attendance"
						>
							<h3>Attendance</h3>
							<p>Check meal presence and daily status.</p>
						</Link>
						<Link className="portal-mini-card" to="/student/leaves">
							<h3>Leaves</h3>
							<p>Apply for leave and track approvals.</p>
						</Link>
						<Link
							className="portal-mini-card"
							to="/student/dashboard"
						>
							<h3>Billing</h3>
							<p>Open your monthly bill and payment history.</p>
						</Link>
						<Link
							className="portal-mini-card"
							to="/student/dashboard"
						>
							<h3>Complaints</h3>
							<p>Raise issues with hostel maintenance.</p>
						</Link>
					</div>
				</div>
				<div className="portal-card">
					<div className="portal-card-header">
						<div>
							<p className="portal-kicker">Seed data</p>
							<h2>Account snapshot</h2>
						</div>
					</div>
					<div className="portal-mini-grid">
						<div className="portal-mini-card">
							<h3>Hostel</h3>
							<p>
								Assigned room and current hostel block appear
								here once the student profile is selected.
							</p>
						</div>
						<div className="portal-mini-card">
							<h3>Mess</h3>
							<p>
								Mess assignment and daily charge are shown
								inside the billing view.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
