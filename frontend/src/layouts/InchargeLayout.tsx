import { PortalLayout } from "@/components/shared/PortalLayout";
import { Outlet } from "react-router-dom";

const navItems = [
	{ href: "/incharge/dashboard", label: "Dashboard" },
	{ href: "/incharge/attendance", label: "Mark Attendance" },
	{ href: "/incharge/extras", label: "Extras" },
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
