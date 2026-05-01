import { PortalLayout } from "@/components/shared/PortalLayout";
import { Outlet } from "react-router-dom";

const navItems = [
	{ href: "/office/dashboard", label: "Dashboard" },
	{ href: "/office/leaves", label: "Leave Approvals" },
	{ href: "/office/payments", label: "Payment Verification" },
	{ href: "/office/students", label: "Students" },
	{ href: "/office/hostels", label: "Hostels" },
	{ href: "/office/messes", label: "Messes" },
	{ href: "/office/hostel-mess-mapping", label: "Hostel-Mess Mapping" },
	{ href: "/office/extras", label: "Extras" },
	{ href: "/office/billing", label: "Billing" },
	{ href: "/office/import", label: "CSV Import" },
];

export default function OfficeLayout() {
	return (
		<PortalLayout
			title="Office"
			subtitle="Operations and management desk"
			accentLabel="Office portal"
			navItems={navItems}
		>
			<Outlet />
		</PortalLayout>
	);
}
