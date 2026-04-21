import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

interface CalendarDay {
	date: string;
	status: "PRESENT" | "ABSENT" | "WAIVED" | "NOT_MARKED";
	breakfast: boolean;
	lunch: boolean;
	dinner: boolean;
	messName: string | null;
}
interface CalendarResponse {
	month: string;
	summary: { PRESENT: number; ABSENT: number; WAIVED: number; NOT_MARKED: number };
	days: CalendarDay[];
}
function toMonthInputValue(date: Date): string {
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const STATUS_STYLES: Record<CalendarDay["status"], string> = {
	PRESENT:
		"bg-green-50 border-green-300 text-green-800",
	ABSENT:
		"bg-red-50 border-red-300 text-red-800",
	WAIVED:
		"bg-amber-50 border-amber-300 text-amber-800",
	NOT_MARKED:
		"bg-slate-50 border-slate-300 text-slate-500",
};

export default function StudentAttendancePage() {
	const [month, setMonth] = useState(toMonthInputValue(new Date()));
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [data, setData] = useState<CalendarResponse | null>(null);

	const loadCalendar = async () => {
		setLoading(true);
		setError("");
		try {
			const response = await api.get("/attendance/student/calendar", {
				params: { month },
			});
			setData(response.data.data as CalendarResponse);
		} catch (err: any) {
			setError(err.response?.data?.error?.message ?? "Failed to load attendance calendar");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { void loadCalendar(); }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

	const days = useMemo(() => data?.days ?? [], [data]);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-bold text-slate-900">Attendance Calendar</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Monthly color-coded view — present, absent, waived, and pending days.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<input
						type="month"
						value={month}
						onChange={(e) => setMonth(e.target.value)}
						className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<button
						type="button"
						onClick={() => void loadCalendar()}
						disabled={loading}
						className="px-3 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 transition-colors"
					>
						Refresh
					</button>
				</div>
			</div>

			{error && (
				<div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
					{error}
				</div>
			)}

			{/* Summary stat cards */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				{[
					{ label: "Present", value: data?.summary.PRESENT ?? 0, color: "text-green-700" },
					{ label: "Absent", value: data?.summary.ABSENT ?? 0, color: "text-red-700" },
					{ label: "Waived", value: data?.summary.WAIVED ?? 0, color: "text-amber-700" },
					{ label: "Not marked", value: data?.summary.NOT_MARKED ?? 0, color: "text-slate-600" },
				].map((stat) => (
					<div key={stat.label} className="bg-white rounded-lg border border-slate-200 p-4">
						<p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
						<p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
					</div>
				))}
			</div>

			{/* Legend */}
			<div className="flex flex-wrap gap-2 text-xs font-medium">
				<span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 text-green-700 border border-green-200">
					<span className="w-2 h-2 rounded-full bg-green-500" />Present
				</span>
				<span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 text-red-700 border border-red-200">
					<span className="w-2 h-2 rounded-full bg-red-500" />Absent
				</span>
				<span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
					<span className="w-2 h-2 rounded-full bg-amber-500" />Waived
				</span>
				<span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
					<span className="w-2 h-2 rounded-full bg-slate-400" />Not marked
				</span>
			</div>

			{/* Calendar grid */}
			<div className="bg-white rounded-lg border border-slate-200">
				<div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">Monthly view</h2>
					{loading && <span className="text-xs text-slate-400">Loading…</span>}
				</div>
				<div className="p-4">
					{!loading && days.length === 0 ? (
						<p className="text-center py-8 text-sm text-slate-400">No calendar data for this month.</p>
					) : (
						<div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
							{days.map((day) => (
								<div
									key={day.date}
									className={cn("rounded-lg border p-2 text-xs", STATUS_STYLES[day.status])}
								>
									<div className="flex justify-between items-start mb-1">
										<span className="font-bold text-sm">{day.date.slice(-2)}</span>
										<span className="text-[10px] font-medium opacity-75">
											{day.status === "NOT_MARKED" ? "—" : day.status.charAt(0)}
										</span>
									</div>
									<p className="opacity-75 truncate">{day.messName ?? "No mess"}</p>
									{(day.status === "PRESENT" || day.status === "ABSENT") && (
										<p className="mt-0.5 opacity-60 font-mono">
											{day.breakfast ? "B" : "–"}
											{day.lunch ? "L" : "–"}
											{day.dinner ? "D" : "–"}
										</p>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
