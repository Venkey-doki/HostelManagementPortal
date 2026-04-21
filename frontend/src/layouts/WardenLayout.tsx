import { PortalLayout } from "@/components/shared/PortalLayout";
import { Outlet } from "react-router-dom";

const navItems = [
	{ href: "/warden/dashboard", label: "Dashboard" },
	{ href: "/warden/leaves", label: "Leave Approvals" },
	{ href: "/warden/payments", label: "Payment Verification" },
	{ href: "/warden/students", label: "Students" },
	{ href: "/admin/hostels", label: "Hostels" },
	{ href: "/admin/messes", label: "Messes" },
	{ href: "/admin/extras", label: "Extras" },
	{ href: "/admin/billing", label: "Billing" },
	{ href: "/admin/import", label: "CSV Import" },
];

export default function WardenLayout() {
	return (
		<PortalLayout
			title="Warden"
			subtitle="Operations and management desk"
			accentLabel="Warden portal"
			navItems={navItems}
		>
			<Outlet />
		</PortalLayout>
	);
}
