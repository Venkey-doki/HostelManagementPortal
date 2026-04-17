import { Outlet } from "react-router-dom";

/**
 * AuthLayout - Centered card layout for login and change-password pages
 */
export default function AuthLayout() {
	return (
		<div className="min-h-screen bg-gray-50">
			<Outlet />
		</div>
	);
}
