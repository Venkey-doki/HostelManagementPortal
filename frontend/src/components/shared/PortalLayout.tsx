import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";

export interface PortalNavItem {
	href: string;
	label: string;
	icon?: ReactNode;
}

interface PortalLayoutProps {
	title: string;
	subtitle: string;
	accentLabel: string;
	navItems: PortalNavItem[];
	children: ReactNode;
}

export function PortalLayout({
	title,
	subtitle,
	accentLabel,
	navItems,
	children,
}: PortalLayoutProps) {
	const navigate = useNavigate();
	const { user, logout } = useAuthStore();

	const handleLogout = () => {
		logout();
		navigate("/login", { replace: true });
	};

	return (
		<div className="flex min-h-screen bg-slate-50">
			{/* ── Sidebar ───────────────────────────────────── */}
			<aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen overflow-y-auto">
				{/* Brand */}
				<div className="px-5 py-5 border-b border-slate-200">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center shrink-0">
							<svg
								className="w-5 h-5 text-white"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
								/>
							</svg>
						</div>
						<div className="min-w-0">
							<p className="text-xs font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">
								Hostel Portal
							</p>
							<p className="text-sm font-bold text-slate-900 truncate leading-snug">
								{title}
							</p>
						</div>
					</div>
				</div>

				{/* User profile strip */}
				<div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
					<div className="flex items-center gap-2.5 min-w-0">
						<div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
							{user?.firstName?.[0] ?? "?"}
						</div>
						<div className="min-w-0">
							<p className="text-sm font-semibold text-slate-900 truncate leading-snug">
								{user?.firstName} {user?.lastName}
							</p>
							<p className="text-xs text-slate-500 truncate">{user?.email}</p>
						</div>
					</div>
				</div>

				{/* Navigation */}
				<nav className="flex-1 px-3 py-3 space-y-0.5">
					{navItems.map((item) => (
						<NavLink
							key={item.href}
							to={item.href}
							end
							className={({ isActive }) =>
								cn(
									"flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
									isActive
										? "bg-blue-50 text-blue-700"
										: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
								)
							}
						>
							{item.icon && (
								<span className="w-4 h-4 shrink-0">{item.icon}</span>
							)}
							{item.label}
						</NavLink>
					))}
				</nav>

				{/* Sign-out footer */}
				<div className="px-3 py-3 border-t border-slate-200">
					<button
						type="button"
						onClick={handleLogout}
						className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
					>
						<svg
							className="w-4 h-4 shrink-0"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
							/>
						</svg>
						Sign out
					</button>
				</div>
			</aside>

			{/* ── Main content area ─────────────────────────── */}
			<div className="flex-1 min-w-0 flex flex-col">
				{/* Top header bar */}
				<header className="bg-white border-b border-slate-200 sticky top-0 z-10">
					<div className="px-6 py-3.5 flex items-center justify-between gap-4">
						<div>
							<p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
								{accentLabel}
							</p>
							<h2 className="text-base font-bold text-slate-900 leading-snug">
								{subtitle}
							</h2>
						</div>
						<div className="flex items-center gap-2">
							<span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
								{user?.role?.replace("_", " ")}
							</span>
						</div>
					</div>
				</header>

				{/* Page content */}
				<main className="flex-1 p-6">{children}</main>
			</div>
		</div>
	);
}
