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
		<div className="flex items-center justify-center min-h-screen bg-gray-50">
			<div className="w-full max-w-md bg-white rounded-lg shadow p-8">
				<h1 className="text-2xl font-bold mb-6 text-center">
					Hostel Management
				</h1>

				{error && (
					<div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
						{error}
					</div>
				)}

				<form onSubmit={handleLogin} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Email
						</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="your@email.com"
							disabled={loading}
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Password
						</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="••••••••"
							disabled={loading}
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition"
					>
						{loading ? "Logging in..." : "Login"}
					</button>
				</form>

				<p className="mt-4 text-center text-sm text-gray-600">
					Demo credentials:
					<br />
					admin@hostel.local / Admin@12345
				</p>
			</div>
		</div>
	);
}
