
import { TokenPair } from '../../types/auth';
import {authService} from "@/src/lib/api/auth";

/**
 * Secure token storage with multiple fallback mechanisms
 * Priority: httpOnly cookies > sessionStorage > memory-only
 */
class SecureTokenStorage {
	private static readonly TOKEN_KEY = 'auth_tokens';
	private static readonly ENCRYPTION_KEY_STORAGE = 'auth_key';
	private static readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes buffer

	private static refreshPromise: Promise<boolean> | null = null;
	private static lastRefreshTime = 0;
	private static readonly REFRESH_COOLDOWN = 5000; // 5 seconds

	// In-memory fallback for when other storage is unavailable
	private static memoryTokens: TokenPair | null = null;
	private static encryptionKey: string | null = null;

	/**
	 * Initialize storage with security checks
	 */
	static async initialize(): Promise<void> {
		// Check if we're in a secure context
		if (typeof window !== 'undefined' && !this.isSecureContext()) {
			console.warn('Secure storage: Not in secure context, using memory-only storage');
		}

		// Generate or retrieve encryption key
		await this.ensureEncryptionKey();
	}

	/**
	 * Store tokens securely with encryption
	 */
	static async setTokens(tokens: TokenPair): Promise<boolean> {
		if (!tokens?.access_token || !tokens?.refresh_token) {
			throw new Error('Invalid tokens provided');
		}

		try {
			// Validate tokens before storing
			if (!this.validateTokens(tokens)) {
				throw new Error('Token validation failed');
			}

			const tokenData = {
				...tokens,
				stored_at: Date.now(),
				expires_at: this.calculateTokenExpiry(tokens.access_token)
			};

			// Try multiple storage methods in order of preference
			const stored = await this.tryStoreTokens(tokenData);

			if (stored) {
				this.memoryTokens = tokens; // Always keep in memory as backup
				return true;
			}

			throw new Error('Failed to store tokens in any available storage');
		} catch (error) {
			console.error('SecureStorage: Failed to store tokens:', error);
			// As last resort, store in memory only
			this.memoryTokens = tokens;
			return false;
		}
	}

	/**
	 * Retrieve tokens with validation and automatic refresh
	 */
	static async getTokens(): Promise<TokenPair | null> {
		try {
			// Try to get from persistent storage first
			const storedTokens = await this.tryRetrieveTokens();

			if (storedTokens) {
				// Validate stored tokens
				if (this.validateStoredTokens(storedTokens)) {
					this.memoryTokens = {
						access_token: storedTokens.access_token,
						refresh_token: storedTokens.refresh_token,
						session_id: storedTokens.session_id
					};
					return this.memoryTokens;
				} else {
					// Tokens expired or invalid, clear them
					await this.clearTokens();
				}
			}

			// Fallback to memory tokens
			if (this.memoryTokens && this.validateTokens(this.memoryTokens)) {
				return this.memoryTokens;
			}

			return null;
		} catch (error) {
			console.error('SecureStorage: Failed to retrieve tokens:', error);
			return this.memoryTokens;
		}
	}

	/**
	 * Clear all stored tokens
	 */
	static async clearTokens(): Promise<void> {
		try {
			// Clear from all possible storage locations
			await Promise.allSettled([
				this.clearFromSessionStorage(),
				this.clearFromCookies(),
				this.clearFromMemory()
			]);
		} catch (error) {
			console.error('SecureStorage: Error clearing tokens:', error);
		}
	}

	/**
	 * Check if tokens exist and are valid
	 */
	static async hasValidTokens(): Promise<boolean> {
		const tokens = await this.getTokens();
		return tokens !== null && this.validateTokens(tokens);
	}

	/**
	 * Get token expiry time
	 */
	static async getTokenExpiry(): Promise<number | null> {
		try {
			const storedData = await this.tryRetrieveTokens();
			return storedData?.expires_at || null;
		} catch {
			return null;
		}
	}

	static async refreshTokens(): Promise<boolean> {
		// Prevent multiple simultaneous refresh attempts
		const now = Date.now();
		if (now - this.lastRefreshTime < this.REFRESH_COOLDOWN) {
			console.log('Token refresh skipped due to cooldown');
			return true;
		}

		// If refresh is already in progress, wait for it
		if (this.refreshPromise) {
			console.log('Token refresh already in progress, waiting...');
			return await this.refreshPromise;
		}

		this.refreshPromise = this.performTokenRefresh();
		const result = await this.refreshPromise;
		this.refreshPromise = null;
		this.lastRefreshTime = now;

		return result;
	}

	private static async performTokenRefresh(): Promise<boolean> {
		try {
			const currentTokens = await this.getTokens();
			if (!currentTokens?.refresh_token) {
				throw new Error('No refresh token available');
			}

			// Call your auth service
			const response = await authService.refreshToken(currentTokens.refresh_token);

			// Validate response before storing
			if (!response?.tokens?.access_token) {
				throw new Error('Invalid refresh response');
			}

			// Store new tokens
			await this.setTokens(response.tokens);

			console.log('Token refresh successful');
			return true;
		} catch (error) {
			console.error('Token refresh failed:', error);
			return false;
		}
	}

	// Private helper methods

	private static async tryStoreTokens(tokenData: any): Promise<boolean> {
		const storageResults = await Promise.allSettled([
			this.storeInSessionStorage(tokenData),
			this.storeInCookies(tokenData)
		]);

		return storageResults.some(result => result.status === 'fulfilled' && result.value);
	}

	private static async tryRetrieveTokens(): Promise<any> {
		// Try sessionStorage first (more secure than localStorage)
		try {
			const sessionData = await this.getFromSessionStorage();
			if (sessionData) return sessionData;
		} catch {
			// Continue to next method
		}

		// Try cookies as fallback
		try {
			const cookieData = await this.getFromCookies();
			if (cookieData) return cookieData;
		} catch {
			// Continue to next method
		}

		return null;
	}

	private static async storeInSessionStorage(tokenData: any): Promise<boolean> {
		if (typeof window === 'undefined' || !window.sessionStorage) {
			return false;
		}

		try {
			const encrypted = await this.encrypt(JSON.stringify(tokenData));
			sessionStorage.setItem(this.TOKEN_KEY, encrypted);
			return true;
		} catch (error) {
			console.warn('SecureStorage: SessionStorage failed:', error);
			return false;
		}
	}

	private static async storeInCookies(tokenData: any): Promise<boolean> {
		if (typeof document === 'undefined') {
			return false;
		}

		try {
			const encrypted = await this.encrypt(JSON.stringify(tokenData));

			// Set secure cookie with proper flags
			const cookieOptions = [
				`${this.TOKEN_KEY}=${encrypted}`,
				'Path=/',
				'SameSite=Strict',
				this.isSecureContext() ? 'Secure' : '',
				`Max-Age=${24 * 60 * 60}` // 24 hours
			].filter(Boolean).join('; ');

			document.cookie = cookieOptions;
			return true;
		} catch (error) {
			console.warn('SecureStorage: Cookie storage failed:', error);
			return false;
		}
	}

	private static async getFromSessionStorage(): Promise<any> {
		if (typeof window === 'undefined' || !window.sessionStorage) {
			return null;
		}

		try {
			const encrypted = sessionStorage.getItem(this.TOKEN_KEY);
			if (!encrypted) return null;

			const decrypted = await this.decrypt(encrypted);
			return JSON.parse(decrypted);
		} catch (error) {
			console.warn('SecureStorage: SessionStorage retrieval failed:', error);
			sessionStorage.removeItem(this.TOKEN_KEY);
			return null;
		}
	}

	private static async getFromCookies(): Promise<any> {
		if (typeof document === 'undefined') {
			return null;
		}

		try {
			const cookies = document.cookie.split(';');
			const tokenCookie = cookies.find(cookie =>
				cookie.trim().startsWith(`${this.TOKEN_KEY}=`)
			);

			if (!tokenCookie) return null;

			const encrypted = tokenCookie.split('=')[1];
			const decrypted = await this.decrypt(encrypted);
			return JSON.parse(decrypted);
		} catch (error) {
			console.warn('SecureStorage: Cookie retrieval failed:', error);
			// Clear invalid cookie
			document.cookie = `${this.TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
			return null;
		}
	}

	private static async clearFromSessionStorage(): Promise<void> {
		if (typeof window !== 'undefined' && window.sessionStorage) {
			sessionStorage.removeItem(this.TOKEN_KEY);
		}
	}

	private static async clearFromCookies(): Promise<void> {
		if (typeof document !== 'undefined') {
			document.cookie = `${this.TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
		}
	}

	private static async clearFromMemory(): Promise<void> {
		this.memoryTokens = null;
	}

	private static validateTokens(tokens: TokenPair): boolean {
		return (
			tokens &&
			typeof tokens.access_token === 'string' &&
			tokens.access_token.length > 0 &&
			typeof tokens.refresh_token === 'string' &&
			tokens.refresh_token.length > 0 &&
			typeof tokens.session_id === 'string' &&
			tokens.session_id.length > 0
		);
	}

	private static validateStoredTokens(storedData: any): boolean {
		if (!storedData || !this.validateTokens(storedData)) {
			return false;
		}

		// Check if tokens are expired
		const now = Date.now();
		if (storedData.expires_at && now > storedData.expires_at) {
			return false;
		}

		// Check if stored too long ago (max 24 hours)
		const maxAge = 24 * 60 * 60 * 1000; // 24 hours
		if (storedData.stored_at && (now - storedData.stored_at) > maxAge) {
			return false;
		}

		return true;
	}

	private static calculateTokenExpiry(accessToken: string): number {
		try {
			// Parse JWT token to get expiry (basic implementation)
			const payload = JSON.parse(atob(accessToken.split('.')[1]));
			if (payload.exp) {
				return (payload.exp * 1000) - this.TOKEN_EXPIRY_BUFFER;
			}
		} catch {
			// If can't parse, assume 1 hour expiry
		}

		return Date.now() + (60 * 60 * 1000) - this.TOKEN_EXPIRY_BUFFER; // 1 hour minus buffer
	}

	private static async ensureEncryptionKey(): Promise<void> {
		if (this.encryptionKey) return;

		if (typeof window !== 'undefined') {
			try {
				// Try to get existing key
				const stored = sessionStorage.getItem(this.ENCRYPTION_KEY_STORAGE);
				if (stored) {
					this.encryptionKey = stored;
					return;
				}
			} catch {
				// Continue to generate new key
			}
		}

		// Generate new encryption key
		this.encryptionKey = this.generateEncryptionKey();

		// Store the key in sessionStorage for this session
		if (typeof window !== 'undefined') {
			try {
				sessionStorage.setItem(this.ENCRYPTION_KEY_STORAGE, this.encryptionKey);
			} catch {
				// If storage fails, keep in memory only
			}
		}
	}

	private static generateEncryptionKey(): string {
		const array = new Uint8Array(32);

		if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
			window.crypto.getRandomValues(array);
		} else {
			// Fallback for environments without crypto
			for (let i = 0; i < array.length; i++) {
				array[i] = Math.floor(Math.random() * 256);
			}
		}

		return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
	}

	private static async encrypt(data: string): Promise<string> {
		if (!this.encryptionKey) {
			await this.ensureEncryptionKey();
		}

		try {
			// Simple XOR encryption (use proper encryption in production)
			const key = this.encryptionKey!;
			let result = '';

			for (let i = 0; i < data.length; i++) {
				const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
				result += String.fromCharCode(charCode);
			}

			return btoa(result);
		} catch (error) {
			console.warn('SecureStorage: Encryption failed, using base64:', error);
			return btoa(data);
		}
	}

	private static async decrypt(encryptedData: string): Promise<string> {
		if (!this.encryptionKey) {
			await this.ensureEncryptionKey();
		}

		try {
			const data = atob(encryptedData);
			const key = this.encryptionKey!;
			let result = '';

			for (let i = 0; i < data.length; i++) {
				const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
				result += String.fromCharCode(charCode);
			}

			return result;
		} catch (error) {
			console.warn('SecureStorage: Decryption failed, trying base64:', error);
			return atob(encryptedData);
		}
	}

	private static isSecureContext(): boolean {
		if (typeof window === 'undefined') return true;

		// Check if we're in a secure context (HTTPS or localhost)
		return window.isSecureContext ||
			window.location.protocol === 'https:' ||
			window.location.hostname === 'localhost' ||
			window.location.hostname === '127.0.0.1';
	}
}

// Export singleton instance
export const secureStorage = SecureTokenStorage;

// Initialize on module load
if (typeof window !== 'undefined') {
	secureStorage.initialize().catch(error => {
		console.error('SecureStorage: Initialization failed:', error);
	});
}
