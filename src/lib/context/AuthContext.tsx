'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, TokenPair } from '../../types/auth';
import { authService } from '../api/auth';
import { getTokens, setTokens, clearTokens, hasValidTokens, isTokenExpiringSoon, getTokenExpiry } from '../utils/storage';

interface AuthContextType {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	login: (tokens: TokenPair, user: User) => Promise<void>;
	logout: () => Promise<void>;
	updateUser: (user: User) => void;
	refetchUser: () => Promise<void>;
	refreshTokens: () => Promise<boolean>;
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

	// Use refs to prevent race conditions and circular dependencies
	const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const refreshInProgressRef = useRef<boolean>(false);
	const lastProfileFetchRef = useRef<number>(0);
	const initializationPromiseRef = useRef<Promise<void> | null>(null);
	const mountedRef = useRef<boolean>(true);
	const consecutiveFailuresRef = useRef<number>(0);

	// Refresh tokens with race condition prevention
	const refreshTokens = useCallback(async (): Promise<boolean> => {
		// Prevent multiple simultaneous refresh attempts
		if (refreshInProgressRef.current) {
			console.log('🔄 Token refresh already in progress, waiting...');
			return true;
		}

		// Check if component is still mounted
		if (!mountedRef.current) {
			console.log('🔄 Component unmounted, canceling refresh');
			return false;
		}

		try {
			refreshInProgressRef.current = true;
			console.log('🔄 Starting token refresh...');

			const currentTokens = await getTokens();
			if (!currentTokens?.refresh_token) {
				console.error('❌ No refresh token available');
				consecutiveFailuresRef.current++;

				// Only logout after multiple failures to avoid single failure causing logout
				if (consecutiveFailuresRef.current >= 3) {
					console.log('🚪 Too many consecutive failures, logging out');
					await logout();
				}
				return false;
			}

			// Attempt token refresh
			const response = await authService.refreshToken(currentTokens.refresh_token);

			// Validate response structure
			if (!response?.tokens?.access_token || !response?.tokens?.refresh_token) {
				console.error('❌ Invalid refresh response format');
				consecutiveFailuresRef.current++;
				return false;
			}

			// Store new tokens
			await setTokens(response.tokens);
			console.log('✅ Tokens refreshed successfully');

			// Reset failure counter on success
			consecutiveFailuresRef.current = 0;

			// Validate user profile occasionally (not on every refresh)
			const now = Date.now();
			const shouldValidateProfile = now - lastProfileFetchRef.current > 5 * 60 * 1000; // 5 minutes

			if (shouldValidateProfile && mountedRef.current) {
				try {
					const profileResponse = await authService.getProfile();
					if (profileResponse.user) {
						setUser(profileResponse.user);
						lastProfileFetchRef.current = now;
						console.log('✅ User profile validated after refresh');
					}
				} catch (profileError: any) {
					console.error('⚠️ Profile validation failed after token refresh:', profileError);

					// Only logout on definite auth errors, not network errors
					if (profileError.response?.status === 401 || profileError.response?.status === 403) {
						console.log('🚪 Auth error in profile validation, logging out');
						await logout();
						return false;
					}
					// For network errors (5xx, timeout), keep user logged in
				}
			}

			return true;
		} catch (error: any) {
			console.error('❌ Token refresh failed:', error);
			consecutiveFailuresRef.current++;

			// Only logout on auth errors, not network errors
			if (error.response?.status === 401 || error.response?.status === 403) {
				console.log('🚪 Auth error during token refresh, logging out');
				await logout();
				return false;
			}

			// For network errors or server errors, don't logout immediately
			if (consecutiveFailuresRef.current >= 5) {
				console.log('🚪 Too many consecutive refresh failures, logging out');
				await logout();
				return false;
			}

			return false;
		} finally {
			refreshInProgressRef.current = false;
		}
	}, []); // No dependencies to avoid circular references

	// Setup automatic token refresh with better scheduling
	const setupTokenRefresh = useCallback(async () => {
		// Clear existing timeout
		if (refreshTimeoutRef.current) {
			clearTimeout(refreshTimeoutRef.current);
			refreshTimeoutRef.current = null;
		}

		if (!mountedRef.current) {
			return;
		}

		try {
			// Check if tokens are expiring soon
			const isExpiring = await isTokenExpiringSoon(10); // 10 minutes buffer

			if (isExpiring) {
				console.log('🔄 Tokens expiring soon, refreshing immediately...');
				const success = await refreshTokens();
				if (!success) {
					return; // Don't schedule next refresh if current failed
				}
			}

			// Get actual token expiry for better scheduling
			const expiry = await getTokenExpiry();
			let nextRefreshTime: number;

			if (expiry) {
				const now = Date.now();
				const timeUntilExpiry = expiry - now;
				// Refresh 10 minutes before expiry, but at least check every 5 minutes
				nextRefreshTime = Math.min(
					Math.max(timeUntilExpiry - (10 * 60 * 1000), 60000), // Min 1 minute
					5 * 60 * 1000 // Max 5 minutes
				);
			} else {
				// Fallback: check every 5 minutes
				nextRefreshTime = 5 * 60 * 1000;
			}

			console.log(`⏰ Next token check in ${Math.round(nextRefreshTime / 1000)} seconds`);

			refreshTimeoutRef.current = setTimeout(async () => {
				if (mountedRef.current) {
					await setupTokenRefresh();
				}
			}, nextRefreshTime);

		} catch (error) {
			console.error('❌ Token refresh setup error:', error);
			// Fallback: try again in 2 minutes
			if (mountedRef.current) {
				refreshTimeoutRef.current = setTimeout(() => setupTokenRefresh(), 2 * 60 * 1000);
			}
		}
	}, [refreshTokens]);

	// Initialize authentication state
	const initializeAuth = useCallback(async () => {
		if (initializationPromiseRef.current) {
			return initializationPromiseRef.current;
		}

		initializationPromiseRef.current = (async () => {
			try {
				console.log('🔄 Initializing authentication...');
				setIsLoading(true);

				const hasTokens = await hasValidTokens();
				if (!hasTokens) {
					console.log('ℹ️ No valid tokens found');
					setUser(null);
					return;
				}

				// Check if tokens are expiring soon and refresh if needed
				const isExpiring = await isTokenExpiringSoon(5);
				if (isExpiring) {
					console.log('🔄 Tokens expiring soon, refreshing during initialization...');
					const refreshed = await refreshTokens();
					if (!refreshed) {
						console.log('❌ Token refresh failed during initialization');
						setUser(null);
						return;
					}
				}

				// Fetch user profile
				try {
					const response = await authService.getProfile();
					if (response.user && mountedRef.current) {
						setUser(response.user);
						lastProfileFetchRef.current = Date.now();

						// Setup token refresh monitoring
						await setupTokenRefresh();

						console.log('✅ Authentication initialized successfully');
					}
				} catch (error: any) {
					console.error('❌ Profile fetch failed during initialization:', error);

					if (error.response?.status === 401 || error.response?.status === 403) {
						await clearTokens();
						setUser(null);
					}
				}
			} catch (error) {
				console.error('❌ Auth initialization error:', error);
				setUser(null);
			} finally {
				if (mountedRef.current) {
					setIsLoading(false);
				}
			}
		})();

		return initializationPromiseRef.current;
	}, [refreshTokens, setupTokenRefresh]);

	// Login with better validation
	const login = useCallback(async (tokens: TokenPair, userData: User) => {
		try {
			console.log('🔐 Starting login process...');
			setIsLoading(true);
			consecutiveFailuresRef.current = 0; // Reset failure counter

			// Validate token structure
			if (!tokens?.access_token || !tokens?.refresh_token || !tokens?.session_id) {
				throw new Error('Invalid token structure provided');
			}

			// Store tokens securely
			await setTokens(tokens);
			console.log('✅ Tokens stored successfully');

			// Set user data
			setUser(userData);

			// Verify login by fetching fresh profile
			try {
				const response = await authService.getProfile();
				if (response.user && mountedRef.current) {
					setUser(response.user);
					lastProfileFetchRef.current = Date.now();
					console.log('✅ Fresh profile validated');
				}
			} catch (error: any) {
				console.warn('⚠️ Fresh profile fetch failed, using provided data:', error);
				// Continue with provided data - don't fail login for this
			}

			// Setup automatic token refresh
			await setupTokenRefresh();

			console.log('✅ Login completed successfully');
		} catch (error) {
			console.error('❌ Login error:', error);
			await clearTokens();
			setUser(null);
			throw error;
		} finally {
			if (mountedRef.current) {
				setIsLoading(false);
			}
		}
	}, [setupTokenRefresh]);

	// Enhanced logout with proper cleanup
	const logout = useCallback(async () => {
		try {
			console.log('🚪 Starting logout process...');

			// Clear refresh timeout immediately
			if (refreshTimeoutRef.current) {
				clearTimeout(refreshTimeoutRef.current);
				refreshTimeoutRef.current = null;
			}

			// Reset all refs
			refreshInProgressRef.current = false;
			lastProfileFetchRef.current = 0;
			consecutiveFailuresRef.current = 0;

			// Try to notify server
			try {
				await authService.logout();
				console.log('✅ Server logout successful');
			} catch (error) {
				console.warn('⚠️ Server logout failed, continuing with local logout:', error);
			}
		} catch (error) {
			console.error('❌ Logout error:', error);
		} finally {
			// Always clear local state and tokens
			await clearTokens();
			if (mountedRef.current) {
				setUser(null);
			}
			console.log('✅ Logout completed');
		}
	}, []);

	// Fetch user profile
	const refetchUser = useCallback(async () => {
		try {
			const hasTokens = await hasValidTokens();
			if (!hasTokens) {
				setUser(null);
				return;
			}

			const response = await authService.getProfile();
			if (response.user && mountedRef.current) {
				setUser(response.user);
				lastProfileFetchRef.current = Date.now();
			}
		} catch (error: any) {
			console.error('❌ Failed to refetch user profile:', error);

			// Only logout on definite auth errors
			if (error.response?.status === 401 || error.response?.status === 403) {
				await logout();
			}
		}
	}, [logout]);

	// Update user data
	const updateUser = useCallback((userData: User) => {
		if (mountedRef.current) {
			setUser(userData);
		}
	}, []);

	// Initialize on mount
	useEffect(() => {
		mountedRef.current = true;
		initializeAuth();

		// Cleanup on unmount
		return () => {
			mountedRef.current = false;
			if (refreshTimeoutRef.current) {
				clearTimeout(refreshTimeoutRef.current);
			}
			initializationPromiseRef.current = null;
		};
	}, [initializeAuth]);

	// Handle page visibility change for better token management
	useEffect(() => {
		const handleVisibilityChange = async () => {
			if (document.visibilityState === 'visible' && user && mountedRef.current) {
				console.log('👁️ Page became visible, checking tokens...');

				// Check if tokens need refresh when page becomes visible
				const isExpiring = await isTokenExpiringSoon(5);
				if (isExpiring) {
					console.log('🔄 Refreshing tokens on visibility change...');
					await refreshTokens();
				}
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [user, refreshTokens]);

	const value: AuthContextType = {
		user,
		isLoading,
		isAuthenticated: !!user,
		login,
		logout,
		updateUser,
		refetchUser,
		refreshTokens,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
