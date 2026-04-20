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
const StudentLeavesPage = lazy(
	() => import("@/pages/student/StudentLeavesPage"),
);
const StudentExtrasPage = lazy(
	() => import("@/pages/student/StudentExtrasPage"),
);
const WardenDashboardPage = lazy(
	() => import("@/pages/warden/WardenDashboardPage"),
);
const WardenLeavesPage = lazy(() => import("@/pages/warden/WardenLeavesPage"));
const InchargeDashboardPage = lazy(
	() => import("@/pages/incharge/InchargeDashboardPage"),
);
const InchargeAttendancePage = lazy(
	() => import("@/pages/incharge/InchargeAttendancePage"),
);
const InchargeExtrasPage = lazy(
	() => import("@/pages/incharge/InchargeExtrasPage"),
);
const AdminDashboardPage = lazy(
	() => import("@/pages/admin/AdminDashboardPage"),
);
const HostelsPage = lazy(() => import("@/pages/admin/HostelsPage"));
const MessesPage = lazy(() => import("@/pages/admin/MessesPage"));
const StudentsPage = lazy(() => import("@/pages/admin/StudentsPage"));
const ImportPage = lazy(() => import("@/pages/admin/ImportPage"));
const AdminExtrasPage = lazy(() => import("@/pages/admin/ExtrasPage"));

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
					{
						path: "/student/leaves",
						element: wrap(<StudentLeavesPage />),
					},
					{
						path: "/student/extras",
						element: wrap(<StudentExtrasPage />),
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
					{
						path: "/incharge/extras",
						element: wrap(<InchargeExtrasPage />),
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
					{
						path: "/warden/leaves",
						element: wrap(<WardenLeavesPage />),
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
						path: "/admin/extras",
						element: wrap(<AdminExtrasPage />),
					},
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
