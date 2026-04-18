import { getDashboardPath } from "@/lib/routeMap";
import { useAuthStore } from "@/lib/store";
import { Navigate } from "react-router-dom";

export default function RouteFallback() {
	const { user } = useAuthStore();

	if (user) {
		return <Navigate to={getDashboardPath(user.role)} replace />;
	}

	return <Navigate to="/login" replace />;
}
