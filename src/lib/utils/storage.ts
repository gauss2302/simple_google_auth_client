// import { TokenPair } from '../../types/auth';
//
// const ACCESS_TOKEN_KEY = 'access_token';
// const REFRESH_TOKEN_KEY = 'refresh_token';
// const SESSION_ID_KEY = 'session_id';
//
// export const setTokens = (tokens: TokenPair): void => {
// 	if (typeof window !== 'undefined') {
// 		localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
// 		localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
// 		localStorage.setItem(SESSION_ID_KEY, tokens.session_id);
// 	}
// };
//
// export const getTokens = (): TokenPair | null => {
// 	if (typeof window !== 'undefined') {
// 		const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
// 		const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
// 		const sessionId = localStorage.getItem(SESSION_ID_KEY);
//
// 		if (accessToken && refreshToken && sessionId) {
// 			return {
// 				access_token: accessToken,
// 				refresh_token: refreshToken,
// 				session_id: sessionId,
// 			};
// 		}
// 	}
// 	return null;
// };
//
// export const clearTokens = (): void => {
// 	if (typeof window !== 'undefined') {
// 		localStorage.removeItem(ACCESS_TOKEN_KEY);
// 		localStorage.removeItem(REFRESH_TOKEN_KEY);
// 		localStorage.removeItem(SESSION_ID_KEY);
// 	}
// };

import { TokenPair } from '../../types/auth';
import { secureStorage } from './secureStorage';

/**
 * Legacy interface maintained for backward compatibility
 * Now uses secure storage under the hood
 */

export const setTokens = async (tokens: TokenPair): Promise<void> => {
	try {
		const success = await secureStorage.setTokens(tokens);
		if (!success) {
			console.warn('Tokens stored in memory-only mode due to storage limitations');
		}
	} catch (error) {
		console.error('Failed to store tokens:', error);
		throw new Error('Token storage failed');
	}
};

export const getTokens = async (): Promise<TokenPair | null> => {
	try {
		return await secureStorage.getTokens();
	} catch (error) {
		console.error('Failed to retrieve tokens:', error);
		return null;
	}
};

export const clearTokens = async (): Promise<void> => {
	try {
		await secureStorage.clearTokens();
	} catch (error) {
		console.error('Failed to clear tokens:', error);
		// Don't throw here as clearing should always succeed
	}
};

/**
 * Additional utility functions using secure storage
 */

export const hasValidTokens = async (): Promise<boolean> => {
	return await secureStorage.hasValidTokens();
};

export const getTokenExpiry = async (): Promise<number | null> => {
	return await secureStorage.getTokenExpiry();
};

export const isTokenExpiringSoon = async (bufferMinutes: number = 5): Promise<boolean> => {
	const expiry = await getTokenExpiry();
	if (!expiry) return true; // Assume expiring if we don't know

	const buffer = bufferMinutes * 60 * 1000;
	return Date.now() > (expiry - buffer);
};

// Sync versions for backward compatibility (not recommended for new code)
export const getTokensSync = (): TokenPair | null => {
	console.warn('getTokensSync is deprecated and less secure. Use getTokens() instead.');

	if (typeof window === 'undefined') return null;

	// Fallback to sessionStorage only for sync access
	try {
		const stored = sessionStorage.getItem('auth_tokens');
		if (stored) {
			const parsed = JSON.parse(atob(stored));
			return {
				access_token: parsed.access_token,
				refresh_token: parsed.refresh_token,
				session_id: parsed.session_id,
			};
		}
	} catch {
		// Silent fail
	}

	return null;
};

export const setTokensSync = (tokens: TokenPair): void => {
	console.warn('setTokensSync is deprecated and less secure. Use setTokens() instead.');

	if (typeof window === 'undefined') return;

	try {
		const encoded = btoa(JSON.stringify(tokens));
		sessionStorage.setItem('auth_tokens', encoded);
	} catch (error) {
		console.error('Sync token storage failed:', error);
	}
};

export const clearTokensSync = (): void => {
	console.warn('clearTokensSync is deprecated. Use clearTokens() instead.');

	if (typeof window === 'undefined') return;

	try {
		sessionStorage.removeItem('auth_tokens');
		// Also clear cookie
		document.cookie = 'auth_tokens=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
	} catch (error) {
		console.error('Sync token clearing failed:', error);
	}
};
