import { Link } from "react-router-dom";

export default function AdminDashboardPage() {
	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Control room</p>
					<h1>Admin Dashboard</h1>
					<p>
						Create the campus structure, configure mess extras,
						onboard staff, and keep the hostel and mess setup in
						sync.
					</p>
				</div>
				<div className="portal-actions">
					<Link
						className="portal-button portal-button-primary"
						to="/admin/extras"
					>
						Manage extras
					</Link>
					<Link
						className="portal-button portal-button-secondary"
						to="/admin/hostels"
					>
						Manage hostels
					</Link>
				</div>
			</section>

			<div className="portal-grid four">
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Active hostels</p>
					<div className="portal-stat-value">8</div>
					<p className="portal-helper">
						5 boys and 3 girls hostels are configured in the seed
						data.
					</p>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Active messes</p>
					<div className="portal-stat-value">3</div>
					<p className="portal-helper">
						Separate mess setup for boys and girls is ready.
					</p>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Demo roles</p>
					<div className="portal-stat-value">4</div>
					<p className="portal-helper">
						Admin, warden, incharge, and student accounts are
						seeded.
					</p>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Phase 1</p>
					<div className="portal-stat-value">Step 3</div>
					<p className="portal-helper">
						Hostel, mess, and student management are now wired up.
					</p>
				</div>
			</div>

			<div className="portal-grid two">
				<Link
					className="portal-card portal-mini-card"
					to="/admin/hostels"
				>
					<h3>Hostel structure</h3>
					<p>
						Create hostels, add rooms, and keep room capacity data
						organized.
					</p>
				</Link>
				<Link
					className="portal-card portal-mini-card"
					to="/admin/messes"
				>
					<h3>Mess setup</h3>
					<p>
						Add messes, set daily charges, and assign current
						incharge staff.
					</p>
				</Link>
				<Link
					className="portal-card portal-mini-card"
					to="/admin/extras"
				>
					<h3>Extras config</h3>
					<p>
						Define extra items per mess so incharge staff can charge
						them later.
					</p>
				</Link>
				<Link
					className="portal-card portal-mini-card"
					to="/admin/students"
				>
					<h3>Student directory</h3>
					<p>
						Search students and assign hostel or mess from the same
						screen.
					</p>
				</Link>
				<Link
					className="portal-card portal-mini-card"
					to="/admin/import"
				>
					<h3>Bulk import</h3>
					<p>
						Upload CSV files for fast student onboarding with
						password seeding.
					</p>
				</Link>
			</div>
		</div>
	);
}
