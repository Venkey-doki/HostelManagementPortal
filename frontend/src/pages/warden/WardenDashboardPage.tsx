import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

export default function WardenDashboardPage() {
	const { data: leavesData } = useQuery({
		queryKey: ["warden-pending-leaves-count"],
		queryFn: async () => (await api.get("/leaves/pending")).data.data as { leaves: unknown[] },
	});
	const { data: paymentsData } = useQuery({
		queryKey: ["warden-pending-payments-count"],
		queryFn: async () => (await api.get("/payments/pending")).data.data as { totalPending: number },
	});
	const { data: statsData } = useQuery({
		queryKey: ["warden-dashboard-stats"],
		queryFn: async () => (await api.get("/warden/dashboard-stats")).data.data as {
			totalStudents: number;
			totalHostels: number;
			totalMesses: number;
			activeComplaints: number;
		},
	});

	const adminModules = [
		{
			to: "/warden/leaves",
			label: "Leave Approvals",
			desc: "Review and action pending student leave requests.",
			count: leavesData?.leaves.length ?? 0,
		},
		{
			to: "/warden/payments",
			label: "Payment Verification",
			desc: "Verify or reject student payment proofs.",
			count: paymentsData?.totalPending ?? 0,
		},
		{
			to: "/warden/students",
			label: "Students Directory",
			desc: "Search students, assign hostel and mess.",
		},
		{
			to: "/warden/hostels",
			label: "Hostels",
			desc: "Create hostels, add rooms, manage capacity.",
		},
		{
			to: "/warden/messes",
			label: "Messes",
			desc: "Add messes, set daily charges, assign incharge staff.",
		},
		{
			to: "/warden/extras",
			label: "Extras Config",
			desc: "Define extra items per mess for incharge staff.",
		},
		{
			to: "/warden/billing",
			label: "Billing",
			desc: "Generate monthly bills for all students.",
		},
		{
			to: "/warden/import",
			label: "CSV Import",
			desc: "Bulk-onboard students from CSV with password seeding.",
		},
	];

	return (
		<div className="space-y-6">
			<div>
				<p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Control room</p>
				<h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
				<p className="mt-0.5 text-sm text-slate-500">
					Manage campus structure, review ops queues, and oversee system metrics.
				</p>
			</div>

			{/* Global Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="bg-white rounded-lg border border-slate-200 p-4">
					<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Students</p>
					<p className="mt-1 text-2xl font-bold text-slate-900">{statsData ? String(statsData.totalStudents) : "—"}</p>
				</div>
				<div className="bg-white rounded-lg border border-slate-200 p-4">
					<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Hostels</p>
					<p className="mt-1 text-2xl font-bold text-slate-900">{statsData ? String(statsData.totalHostels) : "—"}</p>
				</div>
				<div className="bg-white rounded-lg border border-slate-200 p-4">
					<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Messes</p>
					<p className="mt-1 text-2xl font-bold text-slate-900">{statsData ? String(statsData.totalMesses) : "—"}</p>
				</div>
				<div className={`bg-white rounded-lg border p-4 ${statsData && statsData.activeComplaints > 0 ? "border-amber-200" : "border-slate-200"}`}>
					<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Complaints</p>
					<p className={`mt-1 text-2xl font-bold ${statsData && statsData.activeComplaints > 0 ? "text-amber-700" : "text-slate-900"}`}>{statsData ? String(statsData.activeComplaints) : "—"}</p>
				</div>
			</div>

			{/* Module grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{adminModules.map((m) => (
					<Link
						key={m.to}
						to={m.to}
						className="group flex flex-col bg-white rounded-lg border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
					>
						<div className="flex items-start justify-between mb-2">
							<p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">
								{m.label}
							</p>
							{m.count !== undefined && m.count > 0 && (
								<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
									{m.count}
								</span>
							)}
						</div>
						<p className="text-xs text-slate-500 leading-relaxed mt-auto">
							{m.desc}
						</p>
					</Link>
				))}
			</div>
		</div>
	);
}
