import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getTokens, setTokens, clearTokens } from '../utils/storage';

class ApiClient {
	readonly client: AxiosInstance;
	private isRefreshing = false;
	private csrfToken: string | null = null;
	private failedQueue: Array<{
		resolve: (token: string) => void;
		reject: (error: any) => void;
	}> = [];

	constructor() {
		// Validate required environment variables
		if (!process.env.NEXT_PUBLIC_API_URL) {
			throw new Error('NEXT_PUBLIC_API_URL environment variable is required');
		}

		this.client = axios.create({
			baseURL: process.env.NEXT_PUBLIC_API_URL,
			timeout: 15000, // Increased timeout
			withCredentials: true,
			headers: {
				'Content-Type': 'application/json',
			},
		});

		this.setupInterceptors();
	}

	private setupInterceptors(): void {
		// Request interceptor
		this.client.interceptors.request.use(
			async (config) => {
				try {
					// Add Authorization header
					const tokens = await getTokens();
					if (tokens?.access_token) {
						config.headers.Authorization = `Bearer ${tokens.access_token}`;
					}

					// Add CSRF token for protected routes
					if (this.requiresCSRF(config.url || '', config.method || '')) {
						await this.ensureCSRFToken();
						if (this.csrfToken) {
							config.headers['X-CSRF-Token'] = this.csrfToken;
						}
					}

					return config;
				} catch (error) {
					console.error('Request interceptor error:', error);
					return config;
				}
			},
			(error) => Promise.reject(error)
		);

		// Response interceptor
		this.client.interceptors.response.use(
			(response) => response,
			async (error) => {
				const originalRequest = error.config;

				// Handle 401 Unauthorized (token refresh)
				if (error.response?.status === 401 && !originalRequest._retry) {
					if (this.isRefreshing) {
						return new Promise((resolve, reject) => {
							this.failedQueue.push({ resolve, reject });
						}).then((token) => {
							originalRequest.headers.Authorization = `Bearer ${token}`;
							return this.client(originalRequest);
						});
					}

					originalRequest._retry = true;
					this.isRefreshing = true;

					try {
						const tokens = await getTokens();
						if (!tokens?.refresh_token) {
							throw new Error('No refresh token available');
						}

						const response = await this.refreshTokenRequest(tokens.refresh_token);
						const newTokens = response.data.tokens;

						await setTokens(newTokens);

						this.processQueue(newTokens.access_token, null);

						originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
						return this.client(originalRequest);
					} catch (refreshError) {
						this.processQueue(null, refreshError);
						await clearTokens();

						// Only redirect if we're in browser environment
						if (typeof window !== 'undefined') {
							window.location.href = '/auth/login';
						}

						return Promise.reject(refreshError);
					} finally {
						this.isRefreshing = false;
					}
				}

				// Handle 403 Forbidden (CSRF token issues)
				if (error.response?.status === 403 && !originalRequest._csrfRetry) {
					originalRequest._csrfRetry = true;
					// Force refresh CSRF token and retry
					await this.refreshCSRFToken();
					if (this.csrfToken) {
						originalRequest.headers['X-CSRF-Token'] = this.csrfToken;
						return this.client(originalRequest);
					}
				}

				// Handle network errors with retry logic
				if (this.isRetriableError(error) && !originalRequest._retryCount) {
					originalRequest._retryCount = 1;

					// Wait a bit before retrying
					await new Promise(resolve => setTimeout(resolve, 1000));
					return this.client(originalRequest);
				}

				return Promise.reject(error);
			}
		);
	}

	private requiresCSRF(url: string, method: string): boolean {
		const csrfProtectedRoutes = [
			'/auth/google/callback',
			'/auth/refresh',
			'/auth/logout',
			'/auth/sessions',
			'/profile'
		];

		const unsafeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

		// Check if it's an unsafe method or specifically protected route
		return unsafeMethods.includes(method.toUpperCase()) ||
			csrfProtectedRoutes.some(route => url.includes(route));
	}

	private async ensureCSRFToken(): Promise<void> {
		if (!this.csrfToken) {
			await this.refreshCSRFToken();
		}
	}

	private async refreshCSRFToken(): Promise<void> {
		try {
			const response = await this.client.get('/csrf-token');
			this.csrfToken = response.data.csrf_token;
			console.log('CSRF token refreshed');
		} catch (error) {
			console.error('Failed to get CSRF token:', error);
			this.csrfToken = null;
		}
	}

	private processQueue(token: string | null, error: any): void {
		this.failedQueue.forEach(({ resolve, reject }) => {
			if (error) {
				reject(error);
			} else if (token) {
				resolve(token);
			}
		});

		this.failedQueue = [];
	}

	private async refreshTokenRequest(refreshToken: string) {
		// Ensure we have CSRF token for refresh request
		await this.ensureCSRFToken();

		return this.client.post('/auth/refresh', {
			refresh_token: refreshToken,
		}, {
			headers: this.csrfToken ? { 'X-CSRF-Token': this.csrfToken } : {},
			// Don't retry refresh requests
			_retry: true
		});
	}

	private isRetriableError(error: any): boolean {
		// Retry on network errors or 5xx server errors (except 501, 505)
		return (
			!error.response ||
			(error.response.status >= 500 &&
				error.response.status !== 501 &&
				error.response.status !== 505) ||
			error.code === 'NETWORK_ERROR' ||
			error.code === 'ECONNABORTED'
		);
	}

	// Public method to get CSRF token
	async getCSRFToken(): Promise<string | null> {
		await this.ensureCSRFToken();
		return this.csrfToken;
	}

	// Enhanced HTTP methods with better error handling
	async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		try {
			return await this.client.get<T>(url, config);
		} catch (error) {
			throw this.enhanceError(error, 'GET', url);
		}
	}

	async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		try {
			return await this.client.post<T>(url, data, config);
		} catch (error) {
			throw this.enhanceError(error, 'POST', url);
		}
	}

	async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		try {
			return await this.client.put<T>(url, data, config);
		} catch (error) {
			throw this.enhanceError(error, 'PUT', url);
		}
	}

	async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		try {
			return await this.client.delete<T>(url, config);
		} catch (error) {
			throw this.enhanceError(error, 'DELETE', url);
		}
	}

	async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		try {
			return await this.client.patch<T>(url, data, config);
		} catch (error) {
			throw this.enhanceError(error, 'PATCH', url);
		}
	}

	private enhanceError(error: any, method: string, url: string): any {
		// Enhance error with additional context
		const enhancedError = {
			...error,
			method,
			url,
			timestamp: new Date().toISOString(),
		};

		// Log security-relevant errors
		if (error.response?.status === 401 || error.response?.status === 403) {
			console.warn(`Security error: ${method} ${url} - ${error.response.status}`);
		}

		return enhancedError;
	}

	// Health check method
	async healthCheck(): Promise<boolean> {
		try {
			await this.client.get('/health', { timeout: 5000 });
			return true;
		} catch (error) {
			console.error('Health check failed:', error);
			return false;
		}
	}

	// Method to check if client is properly configured
	isConfigured(): boolean {
		return !!(
			this.client &&
			this.client.defaults.baseURL &&
			process.env.NEXT_PUBLIC_API_URL
		);
	}

	// Method to update base URL if needed
	updateBaseURL(newBaseURL: string): void {
		if (this.client) {
			this.client.defaults.baseURL = newBaseURL;
		}
	}

	// Method to add custom headers
	setDefaultHeader(key: string, value: string): void {
		if (this.client) {
			this.client.defaults.headers.common[key] = value;
		}
	}

	// Method to remove custom headers
	removeDefaultHeader(key: string): void {
		if (this.client && this.client.defaults.headers.common[key]) {
			delete this.client.defaults.headers.common[key];
		}
	}
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export the class for testing purposes
export { ApiClient };
