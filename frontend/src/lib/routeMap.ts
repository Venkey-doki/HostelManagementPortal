import type { User } from "@/lib/store";

const dashboardPathByRole: Record<User["role"], string> = {
	SUPER_ADMIN: "/admin/dashboard",
	WARDEN: "/warden/dashboard",
	MESS_INCHARGE: "/incharge/dashboard",
	STUDENT: "/student/dashboard",
};

export function getDashboardPath(role: User["role"]): string {
	return dashboardPathByRole[role];
}
