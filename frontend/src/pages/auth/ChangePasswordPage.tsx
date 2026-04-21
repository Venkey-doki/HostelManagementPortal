import { api } from "@/lib/api";
import { getDashboardPath } from "@/lib/routeMap";
import { useAuthStore } from "@/lib/store";
import { changePasswordSchema } from "@/schemas/auth";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

export default function ChangePasswordPage() {
	const navigate = useNavigate();
	const { user, logout } = useAuthStore();

	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	if (!user) return <Navigate to="/login" replace />;
	if (!user.mustChangePwd)
		return <Navigate to={getDashboardPath(user.role)} replace />;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			const validated = changePasswordSchema.parse({
				oldPassword,
				newPassword,
				confirmPassword,
			});
			await api.patch("/auth/change-password", {
				oldPassword: validated.oldPassword,
				newPassword: validated.newPassword,
				confirmPassword: validated.confirmPassword,
			});
			logout();
			navigate("/login", {
				state: { message: "Password changed successfully. Please log in again." },
			});
		} catch (err: any) {
			setError(err.response?.data?.error?.message || "Failed to change password.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
			<div className="mb-6">
				<div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 mb-3">
					<svg
						className="w-5 h-5 text-amber-700"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
						/>
					</svg>
				</div>
				<h2 className="text-xl font-bold text-slate-900">
					Set a new password
				</h2>
				<p className="mt-1 text-sm text-slate-500">
					You must change your initial password before entering the portal.
				</p>
			</div>

			{error && (
				<div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
					{error}
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label
						htmlFor="old-password"
						className="block text-sm font-medium text-slate-700 mb-1"
					>
						Current password
					</label>
					<input
						id="old-password"
						type="password"
						required
						value={oldPassword}
						onChange={(e) => setOldPassword(e.target.value)}
						disabled={loading}
						className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50"
					/>
				</div>

				<div>
					<label
						htmlFor="new-password"
						className="block text-sm font-medium text-slate-700 mb-1"
					>
						New password
					</label>
					<input
						id="new-password"
						type="password"
						required
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
						disabled={loading}
						className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50"
					/>
					<p className="mt-1.5 text-xs text-slate-500">
						Min 8 characters — must include uppercase, lowercase, number, and
						special character.
					</p>
				</div>

				<div>
					<label
						htmlFor="confirm-password"
						className="block text-sm font-medium text-slate-700 mb-1"
					>
						Confirm new password
					</label>
					<input
						id="confirm-password"
						type="password"
						required
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						disabled={loading}
						className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					className="w-full py-2.5 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
				>
					{loading ? "Updating…" : "Update password"}
				</button>
			</form>
		</div>
	);
}
