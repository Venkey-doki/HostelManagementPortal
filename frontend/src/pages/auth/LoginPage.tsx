import { api } from "@/lib/api";
import { getDashboardPath } from "@/lib/routeMap";
import { useAuthStore } from "@/lib/store";
import { loginSchema } from "@/schemas/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
			const validated = loginSchema.parse({ email, password });
			const response = await api.post("/auth/login", validated);
			const { data } = response.data;
			setUser(data.user);
			setAccessToken(data.access_token);
			if (data.user.mustChangePwd) {
				navigate("/change-password");
			} else {
				navigate(getDashboardPath(data.user.role));
			}
		} catch (err: any) {
			setError(
				err.response?.data?.error?.message ||
					"Login failed. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
			<div className="mb-6">
				<h2 className="text-xl font-bold text-slate-900">Sign in</h2>
				<p className="mt-1 text-sm text-slate-500">
					Use your college-issued credentials to access the portal.
				</p>
			</div>

			{error && (
				<div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
					{error}
				</div>
			)}

			<form onSubmit={handleLogin} className="space-y-4">
				<div>
					<label
						htmlFor="email"
						className="block text-sm font-medium text-slate-700 mb-1"
					>
						Email address
					</label>
					<input
						id="email"
						type="email"
						autoComplete="email"
						required
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						disabled={loading}
						placeholder="your@college.edu"
						className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
					/>
				</div>

				<div>
					<label
						htmlFor="password"
						className="block text-sm font-medium text-slate-700 mb-1"
					>
						Password
					</label>
					<input
						id="password"
						type="password"
						autoComplete="current-password"
						required
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						disabled={loading}
						placeholder="••••••••"
						className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					className="w-full py-2.5 px-4 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
				>
					{loading ? "Signing in…" : "Sign in"}
				</button>
			</form>

			<div className="mt-5 pt-5 border-t border-slate-100">
				<p className="text-xs font-medium text-slate-500 mb-1">
					Demo credentials
				</p>
				<p className="text-xs text-slate-400 font-mono">
					warden@hostel.local / Warden@12345
				</p>
				<p className="mt-1 text-xs text-slate-400 font-mono">
					student1@hostel.local / Student@12345
				</p>
			</div>
		</div>
	);
}
