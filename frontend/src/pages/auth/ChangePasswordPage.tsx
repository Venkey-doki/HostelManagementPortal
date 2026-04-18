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
		<div className="auth-shell">
			<section className="auth-hero">
				<div className="auth-hero-panel">
					<p className="portal-kicker">Account security</p>
					<h1>Change your password before continuing.</h1>
					<p>
						First-login accounts are forced through this screen so
						the initial password seeded from the backend can be
						replaced immediately.
					</p>
				</div>
			</section>

			<section className="auth-card-wrap">
				<div className="auth-card">
					<div className="auth-card-header">
						<p className="portal-kicker">Secure your account</p>
						<h2>Change password</h2>
						<p>
							You must set a new password before the rest of the
							portal opens.
						</p>
					</div>

					{error ? (
						<div className="portal-alert error">{error}</div>
					) : null}

					<form onSubmit={handleSubmit} className="auth-form">
						<label className="portal-form-label">
							Current password
							<input
								className="portal-input"
								type="password"
								value={oldPassword}
								onChange={(e) => setOldPassword(e.target.value)}
								required
								disabled={loading}
							/>
						</label>

						<label className="portal-form-label">
							New password
							<input
								className="portal-input"
								type="password"
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								required
								disabled={loading}
							/>
							<span className="portal-helper">
								At least 8 characters with uppercase, lowercase,
								number, and special character.
							</span>
						</label>

						<label className="portal-form-label">
							Confirm password
							<input
								className="portal-input"
								type="password"
								value={confirmPassword}
								onChange={(e) =>
									setConfirmPassword(e.target.value)
								}
								required
								disabled={loading}
							/>
						</label>

						<button
							className="portal-button portal-button-primary"
							type="submit"
							disabled={loading}
						>
							{loading ? "Updating..." : "Update password"}
						</button>
					</form>
				</div>
			</section>
		</div>
	);
}
