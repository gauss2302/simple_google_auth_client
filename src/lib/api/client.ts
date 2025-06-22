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
		this.client = axios.create({
			baseURL: process.env.NEXT_PUBLIC_API_URL,
			timeout: 10000,
			withCredentials: true,
		});

		this.setupInterceptors();
	}

	private setupInterceptors(): void {
		// Request interceptor
		this.client.interceptors.request.use(
			async (config) => {
				// Add Authorization header
				const tokens = getTokens();
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
						const tokens = getTokens();
						if (!tokens?.refresh_token) {
							throw new Error('No refresh token available');
						}

						const response = await this.refreshTokenRequest(tokens.refresh_token);
						const newTokens = response.data.tokens;

						setTokens(newTokens);

						this.processQueue(newTokens.access_token, null);

						originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
						return this.client(originalRequest);
					} catch (refreshError) {
						this.processQueue(null, refreshError);
						clearTokens();
						window.location.href = '/auth/login';
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

		const unsafeMethods = ['POST', 'PUT', 'DELETE'];

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
			headers: this.csrfToken ? { 'X-CSRF-Token': this.csrfToken } : {}
		});
	}

	// Public method to get CSRF token
	async getCSRFToken(): Promise<string | null> {
		await this.ensureCSRFToken();
		return this.csrfToken;
	}

	async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		return this.client.get<T>(url, config);
	}

	async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		return this.client.post<T>(url, data, config);
	}

	async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		return this.client.put<T>(url, data, config);
	}

	async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
		return this.client.delete<T>(url, config);
	}
}

export const apiClient = new ApiClient();
