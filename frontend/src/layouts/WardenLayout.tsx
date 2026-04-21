import { PortalLayout } from "@/components/shared/PortalLayout";
import { Outlet } from "react-router-dom";

const navItems = [
	{ href: "/warden/dashboard", label: "Dashboard" },
	{ href: "/warden/leaves", label: "Leave Approvals" },
	{ href: "/warden/payments", label: "Payment Verification" },
	{ href: "/warden/students", label: "Students" },
];

export default function WardenLayout() {
	return (
		<PortalLayout
			title="Warden"
			subtitle="Operations desk"
			accentLabel="Warden portal"
			navItems={navItems}
		>
			<Outlet />
		</PortalLayout>
	);
}
