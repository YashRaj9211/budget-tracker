import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../../stores/authStore';

export default function ProtectedRoute() {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	return <Outlet />;
}
