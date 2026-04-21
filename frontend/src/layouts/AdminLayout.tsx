import { PortalLayout } from "@/components/shared/PortalLayout";
import { Outlet } from "react-router-dom";

const navItems = [
	{ href: "/admin/dashboard", label: "Dashboard" },
	{ href: "/admin/hostels", label: "Hostels" },
	{ href: "/admin/messes", label: "Messes" },
	{ href: "/admin/students", label: "Students" },
	{ href: "/admin/extras", label: "Extras" },
	{ href: "/admin/billing", label: "Billing" },
	{ href: "/admin/import", label: "CSV Import" },
];

export default function AdminLayout() {
	return (
		<PortalLayout
			title="Super Admin"
			subtitle="Administration console"
			accentLabel="Management center"
			navItems={navItems}
		>
			<Outlet />
		</PortalLayout>
	);
}
