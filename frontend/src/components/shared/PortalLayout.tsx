import { useAuthStore } from "@/lib/store";
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";

export interface PortalNavItem {
	href: string;
	label: string;
	description?: string;
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
		<div className="portal-shell">
			<aside className="portal-sidebar">
				<div className="portal-brand">
					<div className="portal-brand-mark">H</div>
					<div>
						<p className="portal-kicker">Hostel Management</p>
						<h1>{title}</h1>
					</div>
				</div>

				<div className="portal-profile-card">
					<p className="portal-profile-role">{accentLabel}</p>
					<p className="portal-profile-name">
						{user?.firstName} {user?.lastName}
					</p>
					<p className="portal-profile-meta">{user?.email}</p>
				</div>

				<nav className="portal-nav">
					{navItems.map((item) => (
						<NavLink
							key={item.href}
							to={item.href}
							className={({ isActive }) =>
								`portal-nav-link ${isActive ? "is-active" : ""}`
							}
							end
						>
							<span>{item.label}</span>
							{item.description ? (
								<small>{item.description}</small>
							) : null}
						</NavLink>
					))}
				</nav>

				<div className="portal-sidebar-footer">
					<button
						className="portal-button portal-button-secondary"
						onClick={handleLogout}
						type="button"
					>
						Sign out
					</button>
				</div>
			</aside>

			<main className="portal-main">
				<header className="portal-topbar">
					<div>
						<p className="portal-kicker">{accentLabel}</p>
						<h2>{subtitle}</h2>
					</div>
					<div className="portal-topbar-actions">
						<span className="portal-pill">{user?.role}</span>
						<button
							className="portal-button portal-button-secondary"
							onClick={handleLogout}
							type="button"
						>
							Logout
						</button>
					</div>
				</header>

				<div className="portal-content">{children}</div>
			</main>
		</div>
	);
}
