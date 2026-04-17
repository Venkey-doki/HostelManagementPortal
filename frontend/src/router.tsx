import { lazy, Suspense, type JSX } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import ProtectedRoute from "@/components/shared/ProtectedRoute";
import AuthLayout from "@/layouts/AuthLayout";

// Lazy load pages
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const ChangePasswordPage = lazy(
	() => import("@/pages/auth/ChangePasswordPage"),
);

const StudentDashboardPage = lazy(
	() => import("@/pages/student/StudentDashboardPage"),
);
const WardenDashboardPage = lazy(
	() => import("@/pages/warden/WardenDashboardPage"),
);
const InchargeDashboardPage = lazy(
	() => import("@/pages/incharge/InchargeDashboardPage"),
);
const AdminDashboardPage = lazy(
	() => import("@/pages/admin/AdminDashboardPage"),
);

const wrap = (el: JSX.Element) => (
	<Suspense fallback={<div>Loading…</div>}>{el}</Suspense>
);

export const router = createBrowserRouter([
	// ── Auth routes ──────────────────────────────────────────
	{
		element: <AuthLayout />,
		children: [
			{ path: "/login", element: wrap(<LoginPage />) },
			{ path: "/change-password", element: wrap(<ChangePasswordPage />) },
		],
	},

	// ── Student routes ───────────────────────────────────────
	{
		element: <ProtectedRoute allowedRoles={["STUDENT"]} />,
		children: [
			{
				path: "/student/dashboard",
				element: wrap(<StudentDashboardPage />),
			},
		],
	},

	// ── Incharge routes ──────────────────────────────────────
	{
		element: <ProtectedRoute allowedRoles={["MESS_INCHARGE"]} />,
		children: [
			{
				path: "/incharge/dashboard",
				element: wrap(<InchargeDashboardPage />),
			},
		],
	},

	// ── Warden routes ────────────────────────────────────────
	{
		element: <ProtectedRoute allowedRoles={["WARDEN", "SUPER_ADMIN"]} />,
		children: [
			{
				path: "/warden/dashboard",
				element: wrap(<WardenDashboardPage />),
			},
		],
	},

	// ── Admin routes ─────────────────────────────────────────
	{
		element: <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} />,
		children: [
			{ path: "/admin/dashboard", element: wrap(<AdminDashboardPage />) },
		],
	},

	// ── Fallback ─────────────────────────────────────────────
	{ path: "/", element: <Navigate to="/login" replace /> },
	{ path: "*", element: <Navigate to="/login" replace /> },
]);
