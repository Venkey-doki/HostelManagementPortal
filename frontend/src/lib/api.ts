import axios, { AxiosError, type AxiosInstance } from "axios";
import { useAuthStore } from "./store";

const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

/**
 * API Client - Axios instance with JWT interceptors
 */

export const api: AxiosInstance = axios.create({
	baseURL: API_BASE_URL,
	withCredentials: true, // Allow cookies
});

// Request interceptor - attach access token
api.interceptors.request.use((config) => {
	const { accessToken } = useAuthStore.getState();
	if (accessToken) {
		config.headers.Authorization = `Bearer ${accessToken}`;
	}
	return config;
});

// Response interceptor - handle 401 and token refresh
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const originalRequest = error.config as any;
		const requestUrl = originalRequest?.url as string | undefined;

		// Let auth form requests handle their own 401/422 errors in the UI.
		const bypassAutoRefresh =
			!!requestUrl &&
			(requestUrl.includes("/auth/login") ||
				requestUrl.includes("/auth/change-password"));

		if (bypassAutoRefresh) {
			return Promise.reject(error);
		}

		// If 401 and not already tried to refresh
		if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
			originalRequest._retry = true;

			try {
				// Only one refresh request at a time
				if (!refreshPromise) {
					refreshPromise = (async () => {
						const response = await axios.post<{
							data: { access_token: string };
						}>(
							`${API_BASE_URL}/auth/refresh`,
							{},
							{ withCredentials: true },
						);
						const newToken = response.data.data.access_token;
						useAuthStore.setState({ accessToken: newToken });
						return newToken;
					})();
				}

				const newToken = await refreshPromise;
				refreshPromise = null;

				// Retry original request with new token
				originalRequest.headers.Authorization = `Bearer ${newToken}`;
				return api(originalRequest);
			} catch (refreshError) {
				refreshPromise = null;
				// Refresh failed - logout
				useAuthStore.getState().logout();
				window.location.href = "/login";
				return Promise.reject(refreshError);
			}
		}

		return Promise.reject(error);
	},
);

export default api;
