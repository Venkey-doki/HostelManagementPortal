import { Link } from "react-router-dom";

const adminModules = [
	{
		to: "/admin/hostels",
		label: "Hostels",
		desc: "Create hostels, add rooms, manage capacity.",
	},
	{
		to: "/admin/messes",
		label: "Messes",
		desc: "Add messes, set daily charges, assign incharge staff.",
	},
	{
		to: "/admin/students",
		label: "Students",
		desc: "Search students, assign hostel and mess.",
	},
	{
		to: "/admin/extras",
		label: "Extras Config",
		desc: "Define extra items per mess for incharge staff.",
	},
	{
		to: "/admin/billing",
		label: "Billing",
		desc: "Generate monthly bills for all students.",
	},
	{
		to: "/admin/import",
		label: "CSV Import",
		desc: "Bulk-onboard students from CSV with password seeding.",
	},
];

export default function AdminDashboardPage() {
	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Control room</p>
					<h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Manage campus structure, configure mess extras, onboard students, and run monthly billing.
					</p>
				</div>
				<div className="flex gap-2">
					<Link to="/admin/extras" className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors">
						Manage extras
					</Link>
					<Link to="/admin/billing" className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
						Generate bills
					</Link>
				</div>
			</div>

			{/* Module grid */}
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
				{adminModules.map((m) => (
					<Link
						key={m.to}
						to={m.to}
						className="group bg-white rounded-lg border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
					>
						<p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 mb-1">{m.label}</p>
						<p className="text-xs text-slate-500 leading-relaxed">{m.desc}</p>
					</Link>
				))}
			</div>
		</div>
	);
}
