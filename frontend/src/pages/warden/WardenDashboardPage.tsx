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

	const stats = [
		{
			label: "Pending leaves",
			value: leavesData ? String(leavesData.leaves.length) : "—",
			note: "Awaiting manual action",
			link: "/warden/leaves",
			warn: leavesData && leavesData.leaves.length > 0,
		},
		{
			label: "Payment queue",
			value: paymentsData ? String(paymentsData.totalPending) : "—",
			note: "Payment proofs to verify",
			link: "/warden/payments",
			warn: paymentsData && paymentsData.totalPending > 0,
		},
		{
			label: "Auto-approval",
			value: "48h",
			note: "Window after application",
		},
		{
			label: "Leave quota",
			value: "60 days",
			note: "Per student per year",
		},
	];

	const workQueues = [
		{
			label: "Leave review",
			desc: "Approve or reject pending student leave applications before auto-approval triggers.",
			link: "/warden/leaves",
			cta: "Open queue",
			count: leavesData?.leaves.length ?? 0,
		},
		{
			label: "Payment verification",
			desc: "Review payment screenshots and credit verified transfers to the student bill ledger.",
			link: "/warden/payments",
			cta: "Open queue",
			count: paymentsData?.totalPending ?? 0,
		},
		{
			label: "Students",
			desc: "View the full student directory with current hostel and mess assignments.",
			link: "/warden/students",
			cta: "View directory",
			count: null,
		},
	];

	return (
		<div className="space-y-6">
			<div>
				<p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Warden console</p>
				<h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
				<p className="mt-0.5 text-sm text-slate-500">
					Review leave approvals and payment verifications from one command view.
				</p>
			</div>

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{stats.map((s) => (
					<div key={s.label} className={`bg-white rounded-lg border p-4 ${s.warn ? "border-amber-200" : "border-slate-200"}`}>
						<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
						<p className={`mt-1 text-2xl font-bold ${s.warn ? "text-amber-700" : "text-slate-900"}`}>{s.value}</p>
						<p className="mt-1 text-xs text-slate-400">{s.note}</p>
						{s.link && (
							<Link to={s.link} className="mt-2 block text-xs font-medium text-blue-600 hover:underline">
								Go →
							</Link>
						)}
					</div>
				))}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				{workQueues.map((q) => (
					<div key={q.label} className="bg-white rounded-lg border border-slate-200 p-5">
						<div className="flex items-start justify-between mb-2">
							<h3 className="text-sm font-semibold text-slate-900">{q.label}</h3>
							{q.count !== null && q.count > 0 && (
								<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
									{q.count}
								</span>
							)}
						</div>
						<p className="text-xs text-slate-500 mb-4 leading-relaxed">{q.desc}</p>
						<Link
							to={q.link}
							className="inline-flex items-center text-xs font-semibold text-blue-700 hover:underline"
						>
							{q.cta} →
						</Link>
					</div>
				))}
			</div>
		</div>
	);
}
