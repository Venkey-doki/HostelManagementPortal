import { PortalLayout } from "@/components/shared/PortalLayout";
import { Outlet } from "react-router-dom";

const navItems = [
	{ href: "/warden/dashboard", label: "Dashboard" },
	{ href: "/warden/leaves", label: "Leave Approvals" },
	{ href: "/warden/payments", label: "Payment Verification" },
	{ href: "/warden/students", label: "Students" },
	{ href: "/warden/hostels", label: "Hostels" },
	{ href: "/warden/messes", label: "Messes" },
	{ href: "/warden/hostel-mess-mapping", label: "Hostel-Mess Mapping" },
	{ href: "/warden/extras", label: "Extras" },
	{ href: "/warden/billing", label: "Billing" },
	{ href: "/warden/import", label: "CSV Import" },
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
