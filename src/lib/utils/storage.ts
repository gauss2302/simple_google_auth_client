import { TokenPair } from '../../types/auth';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const SESSION_ID_KEY = 'session_id';

export const setTokens = (tokens: TokenPair): void => {
	if (typeof window !== 'undefined') {
		localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
		localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
		localStorage.setItem(SESSION_ID_KEY, tokens.session_id);
	}
};

export const getTokens = (): TokenPair | null => {
	if (typeof window !== 'undefined') {
		const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
		const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
		const sessionId = localStorage.getItem(SESSION_ID_KEY);

		if (accessToken && refreshToken && sessionId) {
			return {
				access_token: accessToken,
				refresh_token: refreshToken,
				session_id: sessionId,
			};
		}
	}
	return null;
};

export const clearTokens = (): void => {
	if (typeof window !== 'undefined') {
		localStorage.removeItem(ACCESS_TOKEN_KEY);
		localStorage.removeItem(REFRESH_TOKEN_KEY);
		localStorage.removeItem(SESSION_ID_KEY);
	}
};
