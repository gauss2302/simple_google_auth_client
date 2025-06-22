'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, TokenPair } from '../../types/auth';
import { authService } from '../api/auth';
import { getTokens, setTokens, clearTokens } from '../utils/storage';

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	login: (tokens: TokenPair, user: User) => Promise<void>;
	logout: () => Promise<void>;
	updateUser: (user: User) => void;
	refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const refetchUser = useCallback(async () => {
		const tokens = getTokens();
		if (tokens) {
			try {
				const response = await authService.getProfile();
				setUser(response.user);
				return;
			} catch (error) {
				console.error('Failed to get profile:', error);
				clearTokens();
				setUser(null);
			}
		}
	}, []);

	useEffect(() => {
		const initializeAuth = async () => {
			await refetchUser();
			setIsLoading(false);
		};

		initializeAuth();
	}, [refetchUser]);

	const login = useCallback(async (tokens: TokenPair, userData: User) => {
		setIsLoading(true);
		try {
			setTokens(tokens);
			setUser(userData);

			// Double-check by fetching fresh user data
			try {
				const response = await authService.getProfile();
				setUser(response.user);
			} catch (error) {
				// If profile fetch fails, use the provided user data
				console.warn('Failed to fetch fresh profile, using provided data:', error);
			}
		} catch (error) {
			console.error('Login error:', error);
			clearTokens();
			setUser(null);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const logout = useCallback(async () => {
		try {
			await authService.logout();
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			clearTokens();
			setUser(null);
		}
	}, []);

	const updateUser = useCallback((userData: User) => {
		setUser(userData);
	}, []);

	const value = {
		user,
		isLoading,
		isAuthenticated: !!user,
		login,
		logout,
		updateUser,
		refetchUser,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
