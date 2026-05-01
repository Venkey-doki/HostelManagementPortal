import { lazy, Suspense, type JSX } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import ProtectedRoute from "@/components/shared/ProtectedRoute";
import RouteFallback from "@/components/shared/RouteFallback";
import AuthLayout from "@/layouts/AuthLayout";
import InchargeLayout from "@/layouts/InchargeLayout";
import StudentLayout from "@/layouts/StudentLayout";
import OfficeLayout from "@/layouts/OfficeLayout";

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
const StudentProfilePage = lazy(
	() => import("@/pages/student/StudentProfilePage"),
);
const AssignHostelPage = lazy(() => import("@/pages/student/AssignHostelPage"));
const OfficeDashboardPage = lazy(
	() => import("@/pages/office/OfficeDashboardPage"),
);
const OfficeLeavesPage = lazy(() => import("@/pages/office/OfficeLeavesPage"));
const OfficePaymentsPage = lazy(
	() => import("@/pages/office/OfficePaymentsPage"),
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
const HostelsPage = lazy(() => import("@/pages/office/HostelsPage"));
const MessesPage = lazy(() => import("@/pages/office/MessesPage"));
const OfficeStudentsPage = lazy(
	() => import("@/pages/office/OfficeStudentsPage"),
);
const ImportPage = lazy(() => import("@/pages/office/ImportPage"));
const OfficeExtrasPage = lazy(() => import("@/pages/office/ExtrasPage"));
const OfficeBillingPage = lazy(() => import("@/pages/office/BillingPage"));
const HostelMessMappingPage = lazy(
	() => import("@/pages/office/HostelMessMappingPage"),
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
					{
						path: "/student/profile",
						element: wrap(<StudentProfilePage />),
					},
					{
						path: "/student/assign-hostel",
						element: wrap(<AssignHostelPage />),
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

	// ── Office routes ────────────────────────────────────────
	{
		element: <ProtectedRoute allowedRoles={["OFFICE"]} />,
		children: [
			{
				element: <OfficeLayout />,
				children: [
					{
						path: "/office/dashboard",
						element: wrap(<OfficeDashboardPage />),
					},
					{
						path: "/office/leaves",
						element: wrap(<OfficeLeavesPage />),
					},
					{
						path: "/office/payments",
						element: wrap(<OfficePaymentsPage />),
					},
					{
						path: "/office/students",
						element: wrap(<OfficeStudentsPage />),
					},
					{
						path: "/office/hostels",
						element: wrap(<HostelsPage />),
					},
					{
						path: "/office/hostel",
						element: <Navigate to="/office/hostels" replace />,
					},
					{
						path: "/office/messes",
						element: wrap(<MessesPage />),
					},
					{
						path: "/office/hostel-mess-mapping",
						element: wrap(<HostelMessMappingPage />),
					},
					{
						path: "/office/extras",
						element: wrap(<OfficeExtrasPage />),
					},
					{
						path: "/office/billing",
						element: wrap(<OfficeBillingPage />),
					},
					{
						path: "/office/import",
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
