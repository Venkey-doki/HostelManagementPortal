import { api } from "@/lib/api";
import { getDashboardPath } from "@/lib/routeMap";
import { useAuthStore } from "@/lib/store";
import { changePasswordSchema } from "@/schemas/auth";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

/**
 * ChangePasswordPage - Forced on first login (must_change_pwd = true)
 */
export default function ChangePasswordPage() {
	const navigate = useNavigate();
	const { user, logout } = useAuthStore();

	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	if (!user.mustChangePwd) {
		// Not in forced password change state - redirect to dashboard
		return <Navigate to={getDashboardPath(user.role)} replace />;
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			// Validate with schema
			const validated = changePasswordSchema.parse({
				oldPassword,
				newPassword,
				confirmPassword,
			});

			// Call API
			await api.patch("/auth/change-password", {
				oldPassword: validated.oldPassword,
				newPassword: validated.newPassword,
				confirmPassword: validated.confirmPassword,
			});

			// Success - logout and redirect to login
			logout();
			navigate("/login", {
				state: {
					message:
						"Password changed successfully. Please log in again.",
				},
			});
		} catch (err: any) {
			const errorMsg =
				err.response?.data?.error?.message ||
				"Failed to change password";
			setError(errorMsg);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-50">
			<div className="w-full max-w-md bg-white rounded-lg shadow p-8">
				<h1 className="text-2xl font-bold mb-2 text-center">
					Change Password
				</h1>
				<p className="text-center text-gray-600 text-sm mb-6">
					You must change your password before continuing
				</p>

				{error && (
					<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Current Password
						</label>
						<input
							type="password"
							value={oldPassword}
							onChange={(e) => setOldPassword(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							required
							disabled={loading}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							New Password
						</label>
						<input
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							required
							disabled={loading}
						/>
						<p className="text-xs text-gray-500 mt-1">
							At least 8 characters with uppercase, lowercase,
							number, and special character
						</p>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Confirm Password
						</label>
						<input
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							required
							disabled={loading}
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition"
					>
						{loading ? "Updating..." : "Update Password"}
					</button>
				</form>
			</div>
		</div>
	);
}
