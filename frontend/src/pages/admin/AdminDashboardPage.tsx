import { Link } from "react-router-dom";

export default function AdminDashboardPage() {
	return (
		<div className="p-6 space-y-6">
			<h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
			<p className="text-gray-600">
				Welcome admin! Manage users, hostels, and messes here.
			</p>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
				<Link
					className="border rounded-md p-4 hover:bg-gray-50"
					to="/admin/hostels"
				>
					<h2 className="font-semibold">Hostels</h2>
					<p className="text-sm text-gray-600">
						Create hostels and view room structure
					</p>
				</Link>
				<Link
					className="border rounded-md p-4 hover:bg-gray-50"
					to="/admin/messes"
				>
					<h2 className="font-semibold">Messes</h2>
					<p className="text-sm text-gray-600">
						Create messes and configure daily charges
					</p>
				</Link>
				<Link
					className="border rounded-md p-4 hover:bg-gray-50"
					to="/admin/students"
				>
					<h2 className="font-semibold">Students</h2>
					<p className="text-sm text-gray-600">
						Search and inspect student directory
					</p>
				</Link>
				<Link
					className="border rounded-md p-4 hover:bg-gray-50"
					to="/admin/import"
				>
					<h2 className="font-semibold">Import Students</h2>
					<p className="text-sm text-gray-600">Bulk import via CSV</p>
				</Link>
			</div>
		</div>
	);
}
