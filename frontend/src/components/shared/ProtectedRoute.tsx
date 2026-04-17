import { useAuthStore, type User } from "@/lib/store";
import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
	allowedRoles?: Array<User["role"]>;
}

/**
 * ProtectedRoute - Wraps routes that require authentication
 * Checks user is logged in, not in password change state, and has correct role
 */
export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
	const { user } = useAuthStore();

	// Not logged in → redirect to login
	if (!user) {
		return <Navigate to="/login" replace />;
	}

	// Must change password first
	if (user.mustChangePwd) {
		return <Navigate to="/change-password" replace />;
	}

	// Has role restriction and user doesn't match
	if (allowedRoles && !allowedRoles.includes(user.role)) {
		return <Navigate to="/login" replace />;
	}

	return <Outlet />;
}
