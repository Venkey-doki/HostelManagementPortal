import { PortalLayout } from "@/components/shared/PortalLayout";
import { Outlet } from "react-router-dom";

const navItems = [
	{
		href: "/incharge/dashboard",
		label: "Dashboard",
		description: "Attendance & extras",
	},
];

export default function InchargeLayout() {
	return (
		<PortalLayout
			title="Mess Incharge"
			subtitle="Daily operations"
			accentLabel="Mess floor"
			navItems={navItems}
		>
			<Outlet />
		</PortalLayout>
	);
}
