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
	summary: {
		PRESENT: number;
		ABSENT: number;
		WAIVED: number;
		NOT_MARKED: number;
	};
	days: CalendarDay[];
}

function toMonthInputValue(date: Date): string {
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

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
			setError(
				err.response?.data?.error?.message ??
					"Failed to load attendance calendar",
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadCalendar();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [month]);

	const daysByWeek = useMemo(() => {
		if (!data) return [] as CalendarDay[][];

		const weeks: CalendarDay[][] = [];
		for (let index = 0; index < data.days.length; index += 7) {
			weeks.push(data.days.slice(index, index + 7));
		}
		return weeks;
	}, [data]);

	return (
		<div className="portal-page">
			<section className="portal-page-header">
				<div>
					<p className="portal-kicker">Step 4</p>
					<h1>Attendance calendar</h1>
					<p>
						Monthly color-coded attendance view with present,
						absent, waived, and pending days.
					</p>
				</div>
				<div className="portal-actions">
					<input
						className="portal-input"
						type="month"
						value={month}
						onChange={(event) => setMonth(event.target.value)}
						style={{ width: "auto" }}
					/>
					<button
						className="portal-button portal-button-secondary"
						type="button"
						onClick={() => void loadCalendar()}
						disabled={loading}
					>
						Refresh
					</button>
				</div>
			</section>

			{error ? <div className="portal-alert error">{error}</div> : null}

			<div className="portal-grid four">
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Present days</p>
					<div className="portal-stat-value">
						{data?.summary.PRESENT ?? 0}
					</div>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Absent days</p>
					<div className="portal-stat-value">
						{data?.summary.ABSENT ?? 0}
					</div>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Waived days</p>
					<div className="portal-stat-value">
						{data?.summary.WAIVED ?? 0}
					</div>
				</div>
				<div className="portal-card portal-stat">
					<p className="portal-stat-label">Not marked</p>
					<div className="portal-stat-value">
						{data?.summary.NOT_MARKED ?? 0}
					</div>
				</div>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Legend</p>
						<h2>Calendar status colors</h2>
					</div>
				</div>
				<div className="portal-actions">
					<span className="portal-pill success">Present</span>
					<span className="portal-pill danger">Absent</span>
					<span className="portal-pill warning">Waived</span>
					<span className="portal-pill">Not marked</span>
				</div>
			</div>

			<div className="portal-card">
				<div className="portal-card-header">
					<div>
						<p className="portal-kicker">Monthly view</p>
						<h2>Attendance days</h2>
					</div>
					{loading ? (
						<span className="portal-pill">Loading</span>
					) : null}
				</div>

				{!loading && (!data || data.days.length === 0) ? (
					<div className="portal-empty">No calendar data found.</div>
				) : null}

				<div className="attendance-calendar-grid">
					{daysByWeek.flat().map((day) => {
						const className =
							day.status === "PRESENT"
								? "attendance-day present"
								: day.status === "ABSENT"
									? "attendance-day absent"
									: day.status === "WAIVED"
										? "attendance-day waived"
										: "attendance-day";

						return (
							<div key={day.date} className={className}>
								<div className="attendance-day-head">
									<strong>{day.date.slice(-2)}</strong>
									<span className="portal-helper">
										{day.status}
									</span>
								</div>
								<p
									className="portal-helper"
									style={{ marginTop: "6px" }}
								>
									{day.messName ?? "No mess assignment"}
								</p>
								{day.status === "PRESENT" ||
								day.status === "ABSENT" ? (
									<p
										className="portal-helper"
										style={{ marginTop: "4px" }}
									>
										B:{day.breakfast ? "Y" : "N"} · L:
										{day.lunch ? "Y" : "N"} · D:
										{day.dinner ? "Y" : "N"}
									</p>
								) : null}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
