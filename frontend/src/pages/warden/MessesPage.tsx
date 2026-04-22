import { api } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";

interface Mess {
	id: string;
	name: string;
	gender: "MALE" | "FEMALE";
	perDayCharge: string;
	isActive: boolean;
}
interface MonthlyMessRate {
	id: string;
	month: string;
	perDayCharge: string;
	createdAt: string;
	updatedAt: string;
}
interface InchargeAssignment {
	id: string;
	startDate: string;
	endDate: string | null;
	isCurrent: boolean;
	user: { id: string; email: string; firstName: string; lastName: string };
}
interface AdminUserResponse {
	data: {
		user: {
			id: string;
			email: string;
			firstName: string;
			lastName: string;
			role: string;
		};
		temporaryPassword: string;
	};
}

const inputClass =
	"w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function MessesPage() {
	const [messes, setMesses] = useState<Mess[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [name, setName] = useState("");
	const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
	const [perDayCharge, setPerDayCharge] = useState("120");
	const [staffForm, setStaffForm] = useState({
		email: "",
		firstName: "",
		lastName: "",
		phone: "",
		password: "",
		role: "MESS_INCHARGE" as "MESS_INCHARGE" | "WARDEN",
		messId: "",
	});
	const [recentStaffId, setRecentStaffId] = useState("");
	const [inchargeHistory, setInchargeHistory] = useState<
		Record<string, InchargeAssignment[]>
	>({});
	const [monthlyRateMonth, setMonthlyRateMonth] = useState(
		new Date().toISOString().slice(0, 7),
	);
	const [monthlyRateInputByMess, setMonthlyRateInputByMess] = useState<
		Record<string, string>
	>({});
	const [monthlyRatesHistory, setMonthlyRatesHistory] = useState<
		Record<string, MonthlyMessRate[]>
	>({});

	const load = async () => {
		setLoading(true);
		setError("");
		try {
			const res = await api.get("/warden/messes");
			setMesses(res.data.data);
			setMonthlyRateInputByMess((current) => {
				const next = { ...current };
				for (const mess of res.data.data as Mess[]) {
					if (!next[mess.id]) {
						next[mess.id] = String(mess.perDayCharge);
					}
				}
				return next;
			});
			setStaffForm((c) => ({
				...c,
				messId: c.messId || res.data.data[0]?.id || "",
			}));
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to load messes",
			);
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		void load();
	}, []);

	const avgCharge = useMemo(
		() =>
			messes.length
				? Math.round(
						messes.reduce((s, m) => s + Number(m.perDayCharge), 0) /
							messes.length,
					)
				: 0,
		[messes],
	);

	const onCreateMess = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccess("");
		try {
			await api.post("/warden/messes", {
				name,
				gender,
				perDayCharge: Number(perDayCharge),
			});
			setName("");
			setPerDayCharge("120");
			setSuccess("Mess created.");
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to create mess",
			);
		}
	};

	const onCreateStaff = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccess("");
		try {
			const res = await api.post<AdminUserResponse>("/warden/users", {
				email: staffForm.email,
				role: staffForm.role,
				firstName: staffForm.firstName,
				lastName: staffForm.lastName,
				phone: staffForm.phone || undefined,
				password: staffForm.password || undefined,
			});
			setRecentStaffId(res.data.data.user.id);
			setStaffForm((c) => ({
				...c,
				email: "",
				firstName: "",
				lastName: "",
				phone: "",
				password: "",
			}));
			setSuccess(
				`Created ${res.data.data.user.role.toLowerCase()} account.`,
			);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to create staff account",
			);
		}
	};

	const onAssignIncharge = async () => {
		if (!staffForm.messId || !recentStaffId) {
			setError("Create a staff account first, then assign.");
			return;
		}
		setError("");
		setSuccess("");
		try {
			await api.post(
				`/warden/messes/${staffForm.messId}/incharge-assignment`,
				{ userId: recentStaffId, startDate: new Date().toISOString() },
			);
			setSuccess("Incharge assigned.");
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to assign incharge",
			);
		}
	};

	const onUpdateMess = async (mess: Mess) => {
		const nextName = window.prompt("Mess name", mess.name);
		if (!nextName) return;
		const chargeInput = window.prompt(
			"Per day charge",
			String(mess.perDayCharge),
		);
		if (!chargeInput) return;
		setError("");
		setSuccess("");
		try {
			await api.patch(`/warden/messes/${mess.id}`, {
				name: nextName.trim(),
				perDayCharge: Number(chargeInput),
			});
			setSuccess("Mess updated.");
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to update mess",
			);
		}
	};

	const onToggleMess = async (mess: Mess) => {
		setError("");
		setSuccess("");
		try {
			await api.patch(`/warden/messes/${mess.id}`, {
				isActive: !mess.isActive,
			});
			setSuccess(
				mess.isActive ? "Mess deactivated." : "Mess reactivated.",
			);
			await load();
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ?? "Failed to update mess",
			);
		}
	};

	const onLoadInchargeHistory = async (messId: string) => {
		setError("");
		try {
			const res = await api.get(
				`/warden/messes/${messId}/incharge-assignment`,
			);
			setInchargeHistory((c) => ({ ...c, [messId]: res.data.data }));
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to load incharge history",
			);
		}
	};

	const onEndInchargeAssignment = async (
		assignmentId: string,
		messId: string,
	) => {
		setError("");
		setSuccess("");
		try {
			await api.patch(`/warden/incharge-assignment/${assignmentId}/end`, {
				endDate: new Date().toISOString(),
			});
			setSuccess("Incharge assignment ended.");
			await onLoadInchargeHistory(messId);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to end assignment",
			);
		}
	};

	const onUpsertMonthlyRate = async (mess: Mess) => {
		const rawRate =
			monthlyRateInputByMess[mess.id] ?? String(mess.perDayCharge);
		const parsedRate = Number(rawRate);
		if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
			setError("Monthly per-day charge must be a positive number");
			return;
		}

		setError("");
		setSuccess("");
		try {
			await api.post(`/warden/messes/${mess.id}/monthly-rates`, {
				month: monthlyRateMonth,
				perDayCharge: parsedRate,
			});
			setSuccess(
				`Monthly rate set for ${mess.name} (${monthlyRateMonth}).`,
			);
			await load();
			await onLoadMonthlyRates(mess.id);
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to save monthly rate",
			);
		}
	};

	const onLoadMonthlyRates = async (messId: string) => {
		setError("");
		try {
			const res = await api.get(
				`/warden/messes/${messId}/monthly-rates`,
				{ params: { limit: 6 } },
			);
			setMonthlyRatesHistory((current) => ({
				...current,
				[messId]: res.data.data.rates ?? [],
			}));
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ??
					"Failed to load monthly rates",
			);
		}
	};

	const setMonthlyRateInput = (messId: string, value: string) => {
		setMonthlyRateInputByMess((current) => ({
			...current,
			[messId]: value,
		}));
	};

	const sf = (key: keyof typeof staffForm, val: string) =>
		setStaffForm((c) => ({ ...c, [key]: val }));

	return (
		<div className="space-y-6">
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h1 className="text-xl font-bold text-slate-900">Messes</h1>
					<p className="mt-0.5 text-sm text-slate-500">
						Create meal pricing and manage incharge staff
						assignment.
					</p>
				</div>
				<div className="flex gap-2">
					<span className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium">
						{messes.length} messes
					</span>
					<span className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-600 font-medium">
						Avg ₹{avgCharge}/day
					</span>
				</div>
			</div>

			{error && (
				<div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
					{error}
				</div>
			)}
			{success && (
				<div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
					{success}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Create mess */}
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-4">
						Add New Mess
					</h2>
					<form onSubmit={onCreateMess} className="space-y-3">
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">
									Mess name
								</label>
								<input
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Boys Mess C"
									required
									className={inputClass}
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">
									Gender
								</label>
								<select
									value={gender}
									onChange={(e) =>
										setGender(
											e.target.value as "MALE" | "FEMALE",
										)
									}
									className={inputClass}
								>
									<option value="MALE">Male</option>
									<option value="FEMALE">Female</option>
								</select>
							</div>
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">
								Per day charge (₹)
							</label>
							<input
								type="number"
								min="1"
								step="0.01"
								required
								value={perDayCharge}
								onChange={(e) =>
									setPerDayCharge(e.target.value)
								}
								className={inputClass}
							/>
						</div>
						<button
							type="submit"
							className="w-full py-2 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors"
						>
							Create mess
						</button>
					</form>
				</div>

				{/* Create staff + assign */}
				<div className="bg-white rounded-lg border border-slate-200 p-5">
					<h2 className="text-sm font-semibold text-slate-900 mb-4">
						Create & Assign Staff
					</h2>
					<form onSubmit={onCreateStaff} className="space-y-3">
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">
									Role
								</label>
								<select
									value={staffForm.role}
									onChange={(e) => sf("role", e.target.value)}
									className={inputClass}
								>
									<option value="MESS_INCHARGE">
										Mess incharge
									</option>
									<option value="WARDEN">Warden</option>
								</select>
							</div>
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">
									Assign to mess
								</label>
								<select
									value={staffForm.messId}
									onChange={(e) =>
										sf("messId", e.target.value)
									}
									className={inputClass}
								>
									{messes.map((m) => (
										<option key={m.id} value={m.id}>
											{m.name}
										</option>
									))}
								</select>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">
									First name
								</label>
								<input
									required
									value={staffForm.firstName}
									onChange={(e) =>
										sf("firstName", e.target.value)
									}
									className={inputClass}
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">
									Last name
								</label>
								<input
									required
									value={staffForm.lastName}
									onChange={(e) =>
										sf("lastName", e.target.value)
									}
									className={inputClass}
								/>
							</div>
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-700 mb-1">
								Email
							</label>
							<input
								type="email"
								required
								value={staffForm.email}
								onChange={(e) => sf("email", e.target.value)}
								className={inputClass}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">
									Phone (optional)
								</label>
								<input
									value={staffForm.phone}
									onChange={(e) =>
										sf("phone", e.target.value)
									}
									className={inputClass}
								/>
							</div>
							<div>
								<label className="block text-xs font-medium text-slate-700 mb-1">
									Temp password
								</label>
								<input
									placeholder="Auto-generated if blank"
									value={staffForm.password}
									onChange={(e) =>
										sf("password", e.target.value)
									}
									className={inputClass}
								/>
							</div>
						</div>
						<div className="flex gap-2">
							<button
								type="submit"
								className="flex-1 py-2 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
							>
								Create account
							</button>
							<button
								type="button"
								onClick={() => void onAssignIncharge()}
								disabled={!recentStaffId}
								className="flex-1 py-2 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors"
							>
								Assign to mess
							</button>
						</div>
					</form>
					{recentStaffId && (
						<p className="mt-3 text-xs text-slate-500">
							Last created:{" "}
							<code className="font-mono">{recentStaffId}</code>
						</p>
					)}
				</div>
			</div>

			{/* Messes list */}
			<div className="bg-white rounded-lg border border-slate-200">
				<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-slate-900">
						Configured Messes
					</h2>
					{loading && (
						<span className="text-xs text-slate-400">Loading…</span>
					)}
				</div>
				{!messes.length && !loading ? (
					<p className="text-center py-10 text-sm text-slate-400">
						No messes configured yet.
					</p>
				) : (
					<div className="divide-y divide-slate-100">
						{messes.map((mess) => (
							<div key={mess.id} className="p-5">
								<div className="flex items-start justify-between gap-3 mb-3">
									<div>
										<p className="text-sm font-bold text-slate-900">
											{mess.name}
										</p>
										<p className="text-xs text-slate-500">
											{mess.gender} · ₹
											{Number(mess.perDayCharge).toFixed(
												2,
											)}
											/day
										</p>
									</div>
									<div className="flex gap-1.5">
										<span
											className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${mess.gender === "MALE" ? "bg-blue-50 text-blue-700" : "bg-pink-50 text-pink-700"}`}
										>
											{mess.gender}
										</span>
										<span
											className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${mess.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}
										>
											{mess.isActive
												? "Active"
												: "Inactive"}
										</span>
									</div>
								</div>
								<div className="flex gap-2 mb-4">
									<button
										type="button"
										onClick={() => void onUpdateMess(mess)}
										className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={() => void onToggleMess(mess)}
										className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${mess.isActive ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
									>
										{mess.isActive
											? "Deactivate"
											: "Reactivate"}
									</button>
									<button
										type="button"
										onClick={() =>
											void onLoadInchargeHistory(mess.id)
										}
										className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
									>
										Incharge history
									</button>
									<button
										type="button"
										onClick={() =>
											void onLoadMonthlyRates(mess.id)
										}
										className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
									>
										Monthly rates
									</button>
								</div>

								<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-4">
									<p className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
										Month-wise rate
									</p>
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
										<input
											type="month"
											value={monthlyRateMonth}
											onChange={(e) =>
												setMonthlyRateMonth(
													e.target.value,
												)
											}
											className={inputClass}
										/>
										<input
											type="number"
											min="0.01"
											step="0.01"
											value={
												monthlyRateInputByMess[
													mess.id
												] ?? String(mess.perDayCharge)
											}
											onChange={(e) =>
												setMonthlyRateInput(
													mess.id,
													e.target.value,
												)
											}
											className={inputClass}
										/>
										<button
											type="button"
											onClick={() =>
												void onUpsertMonthlyRate(mess)
											}
											className="py-2 px-3 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors"
										>
											Set rate
										</button>
									</div>
									<p className="mt-2 text-xs text-slate-500">
										If not set for a month, billing falls
										back to default ₹
										{Number(mess.perDayCharge).toFixed(2)}
										/day.
									</p>
								</div>

								{inchargeHistory[mess.id]?.length ? (
									<div className="space-y-1.5">
										{inchargeHistory[mess.id].map(
											(item) => (
												<div
													key={item.id}
													className="flex items-center justify-between gap-3 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
												>
													<span className="text-slate-700 font-medium">
														{item.user.firstName}{" "}
														{item.user.lastName}
													</span>
													<span className="text-slate-400">
														{new Date(
															item.startDate,
														).toLocaleDateString()}{" "}
														—{" "}
														{item.endDate
															? new Date(
																	item.endDate,
																).toLocaleDateString()
															: "current"}
													</span>
													{item.isCurrent && (
														<button
															type="button"
															onClick={() =>
																void onEndInchargeAssignment(
																	item.id,
																	mess.id,
																)
															}
															className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
														>
															End
														</button>
													)}
												</div>
											),
										)}
									</div>
								) : null}

								{monthlyRatesHistory[mess.id]?.length ? (
									<div className="space-y-1.5 mt-3">
										{monthlyRatesHistory[mess.id].map(
											(item) => (
												<div
													key={item.id}
													className="flex items-center justify-between gap-3 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50"
												>
													<span className="text-slate-700 font-medium">
														{item.month}
													</span>
													<span className="text-slate-600">
														₹
														{Number(
															item.perDayCharge,
														).toFixed(2)}
														/day
													</span>
													<span className="text-slate-400">
														updated{" "}
														{new Date(
															item.updatedAt,
														).toLocaleDateString()}
													</span>
												</div>
											),
										)}
									</div>
								) : null}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
