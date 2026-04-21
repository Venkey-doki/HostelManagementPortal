import type { User } from "@/lib/store";

const dashboardPathByRole: Record<User["role"], string> = {
	WARDEN: "/admin/dashboard",
	MESS_INCHARGE: "/incharge/dashboard",
	STUDENT: "/student/dashboard",
};

export function getDashboardPath(role: User["role"]): string {
	return dashboardPathByRole[role];
}
