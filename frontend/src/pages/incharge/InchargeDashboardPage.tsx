import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

export default function InchargeDashboardPage() {
	const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
	
	const { data: rosterData } = useQuery({
		queryKey: ["incharge-roster", new Date().toISOString().slice(0, 10)],
		queryFn: async () => (await api.get("/attendance/incharge")).data.data as { roster: unknown[], isWaived: boolean }
	});

	const quickLinks = [
		{
			to: "/incharge/attendance",
			label: "Mark Attendance",
			desc: "Breakfast, lunch, and dinner toggles for the daily roster.",
			cta: "Open roster →",
		},
		{
			to: "/incharge/extras",
			label: "Add Extras",
			desc: "Add per-student chargeable items that flow into monthly billing.",
			cta: "Add extras →",
		},
	];



	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Mess floor</p>
					<h1 className="text-xl font-bold text-slate-900">Incharge Dashboard</h1>
					<p className="mt-0.5 text-sm text-slate-500">{today}</p>
				</div>
				<div className="flex gap-2">
					<Link to="/incharge/attendance" className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors">
						Mark attendance
					</Link>
					<Link to="/incharge/extras" className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
						Add extras
					</Link>
				</div>
			</div>

			{/* Quick links */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{quickLinks.map((link) => (
					<div key={link.to} className="bg-white rounded-lg border border-slate-200 p-5">
						<h3 className="text-base font-bold text-slate-900 mb-1">{link.label}</h3>
						<p className="text-sm text-slate-500 mb-4 leading-relaxed">{link.desc}</p>
						<Link to={link.to} className="inline-flex items-center text-sm font-semibold text-blue-700 hover:underline">
							{link.cta}
						</Link>
					</div>
				))}
			</div>

			{/* Overview cards */}
			<div className="bg-white rounded-lg border border-slate-200 p-5">
				<h2 className="text-sm font-semibold text-slate-900 mb-4">Today's Overview</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="p-4 rounded-lg border border-slate-100 bg-slate-50">
						<p className="text-sm font-semibold text-slate-800 mb-1">Assigned Students</p>
						<p className="text-2xl font-bold text-slate-900">{rosterData ? rosterData.roster.length : "—"}</p>
						<p className="text-xs text-slate-500 mt-1">Currently eating in this mess</p>
					</div>
					<div className={`p-4 rounded-lg border ${rosterData?.isWaived ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"}`}>
						<p className="text-sm font-semibold text-slate-800 mb-1">Mess Day Status</p>
						<p className={`text-2xl font-bold ${rosterData?.isWaived ? "text-amber-700" : "text-green-700"}`}>
							{rosterData ? (rosterData.isWaived ? "Waived" : "Active") : "—"}
						</p>
						<p className="text-xs text-slate-500 mt-1">
							{rosterData?.isWaived ? "No charges applied for today." : "Charges applied as normal."}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
