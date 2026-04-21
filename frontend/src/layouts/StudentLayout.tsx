import { PortalLayout } from "@/components/shared/PortalLayout";
import { Outlet } from "react-router-dom";

const navItems = [
	{ href: "/student/dashboard", label: "Dashboard" },
	{ href: "/student/attendance", label: "Attendance" },
	{ href: "/student/leaves", label: "Leaves" },
	{ href: "/student/billing", label: "Billing" },
	{ href: "/student/extras", label: "Extras" },
];

export default function StudentLayout() {
	return (
		<PortalLayout
			title="Student"
			subtitle="Student portal"
			accentLabel="Personal workspace"
			navItems={navItems}
		>
			<Outlet />
		</PortalLayout>
	);
}
