import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
	id: string;
	email: string;
	role: "OFFICE" | "MESS_INCHARGE" | "STUDENT";
	firstName: string;
	lastName: string;
	mustChangePwd: boolean;
	studentId?: string;
}

export interface AuthStore {
	user: User | null;
	accessToken: string | null;
	unreadNotifications: number;

	// Actions
	setUser: (user: User) => void;
	setAccessToken: (token: string) => void;
	logout: () => void;
	setUnreadNotifications: (count: number) => void;
}

/**
 * Auth Store - Persisted to localStorage
 * Stores authenticated user and access token
 */
export const useAuthStore = create<AuthStore>()(
	persist(
		(set) => ({
			user: null,
			accessToken: null,
			unreadNotifications: 0,

			setUser: (user) => set({ user }),
			setAccessToken: (token) => set({ accessToken: token }),
			logout: () => set({ user: null, accessToken: null }),
			setUnreadNotifications: (count) =>
				set({ unreadNotifications: count }),
		}),
		{
			name: "auth-store",
			partialize: (state) => ({
				user: state.user,
				accessToken: state.accessToken,
			}),
		},
	),
);
