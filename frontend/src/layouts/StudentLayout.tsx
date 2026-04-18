import { PortalLayout } from "@/components/shared/PortalLayout";
import { Outlet } from "react-router-dom";

const navItems = [
	{
		href: "/student/dashboard",
		label: "Dashboard",
		description: "My overview",
	},
	{
		href: "/student/attendance",
		label: "Attendance",
		description: "Monthly calendar",
	},
	{
		href: "/student/leaves",
		label: "Leaves",
		description: "Apply and track",
	},
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
