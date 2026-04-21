import { lazy, Suspense, type JSX } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import ProtectedRoute from "@/components/shared/ProtectedRoute";
import RouteFallback from "@/components/shared/RouteFallback";
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
const StudentBillingPage = lazy(
	() => import("@/pages/student/StudentBillingPage"),
);
const StudentBillDetailPage = lazy(
	() => import("@/pages/student/StudentBillDetailPage"),
);
const WardenDashboardPage = lazy(
	() => import("@/pages/warden/WardenDashboardPage"),
);
const WardenLeavesPage = lazy(() => import("@/pages/warden/WardenLeavesPage"));
const WardenPaymentsPage = lazy(
	() => import("@/pages/warden/WardenPaymentsPage"),
);
const InchargeDashboardPage = lazy(
	() => import("@/pages/incharge/InchargeDashboardPage"),
);
const InchargeAttendancePage = lazy(
	() => import("@/pages/incharge/InchargeAttendancePage"),
);
const InchargeExtrasPage = lazy(
	() => import("@/pages/incharge/InchargeExtrasPage"),
);
const HostelsPage = lazy(() => import("@/pages/warden/HostelsPage"));
const MessesPage = lazy(() => import("@/pages/warden/MessesPage"));
const WardenStudentsPage = lazy(() => import("@/pages/warden/WardenStudentsPage"));
const ImportPage = lazy(() => import("@/pages/warden/ImportPage"));
const WardenExtrasPage = lazy(() => import("@/pages/warden/ExtrasPage"));
const WardenBillingPage = lazy(() => import("@/pages/warden/BillingPage"));

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
					{
						path: "/student/billing",
						element: wrap(<StudentBillingPage />),
					},
					{
						path: "/student/billing/:billId",
						element: wrap(<StudentBillDetailPage />),
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
		element: <ProtectedRoute allowedRoles={["WARDEN"]} />,
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
					{
						path: "/warden/payments",
						element: wrap(<WardenPaymentsPage />),
					},
					{
						path: "/warden/students",
						element: wrap(<WardenStudentsPage />),
					},
					{
						path: "/warden/hostels",
						element: wrap(<HostelsPage />),
					},
					{
						path: "/warden/hostel",
						element: <Navigate to="/warden/hostels" replace />,
					},
					{
						path: "/warden/messes",
						element: wrap(<MessesPage />),
					},
					{
						path: "/warden/extras",
						element: wrap(<WardenExtrasPage />),
					},
					{
						path: "/warden/billing",
						element: wrap(<WardenBillingPage />),
					},
					{
						path: "/warden/import",
						element: wrap(<ImportPage />),
					},
				],
			},
		],
	},

	// ── Fallback ─────────────────────────────────────────────
	{ path: "/", element: <Navigate to="/login" replace /> },
	{ path: "*", element: <RouteFallback /> },
]);
