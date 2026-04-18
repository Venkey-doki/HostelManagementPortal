import { api } from "@/lib/api";
import { getDashboardPath } from "@/lib/routeMap";
import { useAuthStore } from "@/lib/store";
import { loginSchema } from "@/schemas/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * LoginPage - Student/Warden/Admin login
 */
export default function LoginPage() {
	const navigate = useNavigate();
	const { setUser, setAccessToken } = useAuthStore();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			// Validate with Zod schema
			const validated = loginSchema.parse({ email, password });

			// Call API
			const response = await api.post("/auth/login", validated);
			const { data } = response.data;

			// Store user and token
			setUser(data.user);
			setAccessToken(data.access_token);

			// Navigate based on role or must_change_pwd
			if (data.user.mustChangePwd) {
				navigate("/change-password");
			} else {
				navigate(getDashboardPath(data.user.role));
			}
		} catch (err: any) {
			const errorMsg =
				err.response?.data?.error?.message ||
				"Login failed. Please try again.";
			setError(errorMsg);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="auth-shell">
			<section className="auth-hero">
				<div className="auth-hero-panel">
					<p className="portal-kicker">Hostel Management Portal</p>
					<h1>
						One portal for hostel, mess, billing, and approvals.
					</h1>
					<p>
						A single operational console for students, mess
						incharges, wardens, and admins. Built for a college
						environment where the data has to stay consistent.
					</p>
					<div className="auth-feature-grid">
						<div className="auth-feature">
							<h3>Fast login</h3>
							<p>
								JWT authentication with refresh token rotation
								keeps the session smooth.
							</p>
						</div>
						<div className="auth-feature">
							<h3>Role aware</h3>
							<p>
								Each account lands in the correct dashboard
								after login.
							</p>
						</div>
						<div className="auth-feature">
							<h3>Billing ready</h3>
							<p>
								Attendance and leave flows feed the monthly bill
								engine.
							</p>
						</div>
						<div className="auth-feature">
							<h3>Seed data</h3>
							<p>
								Use the demo accounts to explore the seeded
								hostel structure.
							</p>
						</div>
					</div>
				</div>
			</section>

			<section className="auth-card-wrap">
				<div className="auth-card">
					<div className="auth-card-header">
						<p className="portal-kicker">Sign in</p>
						<h2>Welcome back</h2>
						<p>
							Use your college-issued credentials to access the
							portal.
						</p>
					</div>

					{error ? (
						<div className="portal-alert error">{error}</div>
					) : null}

					<form onSubmit={handleLogin} className="auth-form">
						<label className="portal-form-label">
							Email
							<input
								className="portal-input"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="your@email.com"
								disabled={loading}
							/>
						</label>

						<label className="portal-form-label">
							Password
							<input
								className="portal-input"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								disabled={loading}
							/>
						</label>

						<button
							className="portal-button portal-button-primary"
							type="submit"
							disabled={loading}
						>
							{loading ? "Logging in..." : "Login"}
						</button>
					</form>

					<div
						className="portal-card soft"
						style={{ marginTop: "18px" }}
					>
						<p className="portal-helper">Demo credentials</p>
						<p className="portal-helper">
							admin@hostel.local / Admin@12345
						</p>
					</div>
				</div>
			</section>
		</div>
	);
}
