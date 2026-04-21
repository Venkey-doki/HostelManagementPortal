import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

export default function StudentDashboardPage() {
	const { data: leavesData } = useQuery({
		queryKey: ["student-leaves-summary"],
		queryFn: async () =>
			(await api.get("/leaves/me")).data.data as {
				summary: {
					PENDING: number;
					APPROVED: number;
					AUTO_APPROVED: number;
					usedDays: number;
				};
			},
	});
	const { data: billsData } = useQuery({
		queryKey: ["student-bills-summary"],
		queryFn: async () =>
			(await api.get("/bills/me")).data.data as {
				bills: Array<{ balanceDue: string }>;
				totalBills: number;
			},
	});
	const { data: configData } = useQuery({
		queryKey: ["leaves-config"],
		queryFn: async () =>
			(await api.get("/leaves/config")).data.data as {
				maxLeaveDays: number;
				autoApproveHours: number;
			},
	});

	const balanceDue =
		billsData?.bills.reduce((s, b) => s + Number(b.balanceDue), 0) ?? null;
	const pendingLeaves = leavesData?.summary.PENDING ?? null;

	const stats = [
		{
			label: "Pending leaves",
			value: pendingLeaves !== null ? String(pendingLeaves) : "—",
			note: "Awaiting warden review",
		},
		{
			label: "Leaves used",
			value: leavesData !== undefined ? `${leavesData.summary.usedDays} days` : "—",
			note: `Max per request: ${configData ? configData.maxLeaveDays : "—"}`,
		},
		{
			label: "Balance due",
			value: balanceDue !== null ? `₹${balanceDue.toFixed(2)}` : "—",
			note: "Cumulative across all bills",
			warn: balanceDue !== null && balanceDue > 0,
		},
		{
			label: "Total bills",
			value: billsData ? String(billsData.totalBills) : "—",
			note: "Frozen monthly invoices",
		},
	];

	const quickLinks = [
		{
			to: "/student/attendance",
			label: "Attendance",
			desc: "Check meal presence and daily status",
		},
		{
			to: "/student/leaves",
			label: "Leaves",
			desc: "Apply for leave and track approvals",
		},
		{
			to: "/student/billing",
			label: "Billing",
			desc: "Monthly bills and payment proofs",
		},
		{
			to: "/student/extras",
			label: "Extras",
			desc: "Monthly extras billing preview",
		},
	];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
						Student portal
					</p>
					<h1 className="text-xl font-bold text-slate-900">
						Dashboard
					</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Your hostel life at a glance — attendance, leaves,
						billing, and more.
					</p>
				</div>
				<div className="flex gap-2">
					<Link
						to="/student/leaves"
						className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors"
					>
						Apply leave
					</Link>
					<Link
						to="/student/extras"
						className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
					>
						View extras
					</Link>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{stats.map((s) => (
					<div
						key={s.label}
						className={`bg-white rounded-lg border p-4 ${s.warn ? "border-red-200" : "border-slate-200"}`}
					>
						<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
							{s.label}
						</p>
						<p
							className={`mt-1 text-2xl font-bold leading-none ${s.warn ? "text-red-700" : "text-slate-900"}`}
						>
							{s.value}
						</p>
						<p className="mt-1 text-xs text-slate-400">{s.note}</p>
					</div>
				))}
			</div>

			{/* Quick access */}
			<div className="bg-white rounded-lg border border-slate-200 p-5">
				<h2 className="text-sm font-semibold text-slate-900 mb-4">
					Quick Access
				</h2>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					{quickLinks.map((link) => (
						<Link
							key={link.to}
							to={link.to}
							className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
						>
							<p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700">
								{link.label}
							</p>
							<p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
								{link.desc}
							</p>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
