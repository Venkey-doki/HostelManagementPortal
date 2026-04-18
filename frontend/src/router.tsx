import { lazy, Suspense, type JSX } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import ProtectedRoute from "@/components/shared/ProtectedRoute";
import RouteFallback from "@/components/shared/RouteFallback";
import AdminLayout from "@/layouts/AdminLayout";
import AuthLayout from "@/layouts/AuthLayout";
import InchargeLayout from "@/layouts/InchargeLayout";
import StudentLayout from "@/layouts/StudentLayout";
import WardenLayout from "@/layouts/WardenLayout";

// Lazy load pages
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const ChangePasswordPage = lazy(
	() => import("@/pages/auth/ChangePasswordPage"),
);

const StudentDashboardPage = lazy(
	() => import("@/pages/student/StudentDashboardPage"),
);
const StudentAttendancePage = lazy(
	() => import("@/pages/student/StudentAttendancePage"),
);
const WardenDashboardPage = lazy(
	() => import("@/pages/warden/WardenDashboardPage"),
);
const InchargeDashboardPage = lazy(
	() => import("@/pages/incharge/InchargeDashboardPage"),
);
const InchargeAttendancePage = lazy(
	() => import("@/pages/incharge/InchargeAttendancePage"),
);
const AdminDashboardPage = lazy(
	() => import("@/pages/admin/AdminDashboardPage"),
);
const HostelsPage = lazy(() => import("@/pages/admin/HostelsPage"));
const MessesPage = lazy(() => import("@/pages/admin/MessesPage"));
const StudentsPage = lazy(() => import("@/pages/admin/StudentsPage"));
const ImportPage = lazy(() => import("@/pages/admin/ImportPage"));

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
				element: <StudentLayout />,
				children: [
					{
						path: "/student/dashboard",
						element: wrap(<StudentDashboardPage />),
					},
					{
						path: "/student/attendance",
						element: wrap(<StudentAttendancePage />),
					},
				],
			},
		],
	},

	// ── Incharge routes ──────────────────────────────────────
	{
		element: <ProtectedRoute allowedRoles={["MESS_INCHARGE"]} />,
		children: [
			{
				element: <InchargeLayout />,
				children: [
					{
						path: "/incharge/dashboard",
						element: wrap(<InchargeDashboardPage />),
					},
					{
						path: "/incharge/attendance",
						element: wrap(<InchargeAttendancePage />),
					},
				],
			},
		],
	},

	// ── Warden routes ────────────────────────────────────────
	{
		element: <ProtectedRoute allowedRoles={["WARDEN", "SUPER_ADMIN"]} />,
		children: [
			{
				element: <WardenLayout />,
				children: [
					{
						path: "/warden/dashboard",
						element: wrap(<WardenDashboardPage />),
					},
				],
			},
		],
	},

	// ── Admin routes ─────────────────────────────────────────
	{
		element: <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} />,
		children: [
			{
				element: <AdminLayout />,
				children: [
					{
						path: "/admin/dashboard",
						element: wrap(<AdminDashboardPage />),
					},
					{ path: "/admin/hostels", element: wrap(<HostelsPage />) },
					{
						path: "/admin/hostel",
						element: <Navigate to="/admin/hostels" replace />,
					},
					{ path: "/admin/messes", element: wrap(<MessesPage />) },
					{
						path: "/admin/students",
						element: wrap(<StudentsPage />),
					},
					{ path: "/admin/import", element: wrap(<ImportPage />) },
				],
			},
		],
	},

	// ── Fallback ─────────────────────────────────────────────
	{ path: "/", element: <Navigate to="/login" replace /> },
	{ path: "*", element: <RouteFallback /> },
]);
