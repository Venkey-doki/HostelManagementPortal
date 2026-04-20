import { PortalLayout } from "@/components/shared/PortalLayout";
import { Outlet } from "react-router-dom";

const navItems = [
	{ href: "/admin/dashboard", label: "Dashboard", description: "Overview" },
	{ href: "/admin/hostels", label: "Hostels", description: "Rooms & blocks" },
	{
		href: "/admin/messes",
		label: "Messes",
		description: "Charges & incharges",
	},
	{
		href: "/admin/students",
		label: "Students",
		description: "Directory & assignments",
	},
	{
		href: "/admin/extras",
		label: "Extras",
		description: "Mess item setup",
	},
	{
		href: "/admin/billing",
		label: "Billing",
		description: "Generate monthly bills",
	},
	{ href: "/admin/import", label: "Import", description: "CSV bulk upload" },
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
