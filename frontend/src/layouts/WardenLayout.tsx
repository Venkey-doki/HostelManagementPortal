import { PortalLayout } from "@/components/shared/PortalLayout";
import { Outlet } from "react-router-dom";

const navItems = [
	{
		href: "/warden/dashboard",
		label: "Dashboard",
		description: "KPI overview",
	},
];

export default function WardenLayout() {
	return (
		<PortalLayout
			title="Warden"
			subtitle="Operations dashboard"
			accentLabel="Approval desk"
			navItems={navItems}
		>
			<Outlet />
		</PortalLayout>
	);
}
