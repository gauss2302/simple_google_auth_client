import { apiClient } from './client';
import { AuthResponse, Session, TokenPair } from '../../types/auth';

export class AuthService {
	async getGoogleAuthUrl(): Promise<{ auth_url: string }> {
		console.log('Getting Google auth URL...');
		const response = await apiClient.get<{ auth_url: string }>('/auth/google');
		console.log('Got auth URL:', response.data.auth_url);
		return response.data;
	}

	async exchangeAuthCode(authCode: string): Promise<AuthResponse> {
		console.log('Exchanging auth code:', authCode);
		try {
			const response = await apiClient.post<AuthResponse>('/auth/exchange-code', {
				auth_code: authCode,
			});
			console.log('Exchange successful');
			return response.data;
		} catch (error: any) {
			console.error('Exchange failed with error:', error);
			console.error('Error response:', error.response?.data);
			console.error('Error status:', error.response?.status);
			console.error('Error headers:', error.response?.headers);
			throw error;
		}
	}

	async handleCallback(code: string, state: string): Promise<AuthResponse> {
		console.log('Handling OAuth callback with code:', code.substring(0, 10) + '...', 'state:', state);
		try {
			const response = await apiClient.get<AuthResponse>(
				`/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
			);
			console.log('Callback handled successfully');
			return response.data;
		} catch (error: any) {
			console.error('Callback failed with error:', error);
			console.error('Error response:', error.response?.data);
			console.error('Error status:', error.response?.status);
			throw error;
		}
	}

	async refreshToken(refreshToken: string): Promise<{ tokens: TokenPair }> {
		const response = await apiClient.post<{ tokens: TokenPair }>('/auth/refresh', {
			refresh_token: refreshToken,
		});
		return response.data;
	}

	async logout(): Promise<void> {
		await apiClient.post('/auth/logout');
	}

	async getSessions(): Promise<{ sessions: Session[] }> {
		const response = await apiClient.get<{ sessions: Session[] }>('/auth/sessions');
		return response.data;
	}

	async revokeSession(sessionId: string): Promise<void> {
		await apiClient.delete(`/auth/sessions/${sessionId}`);
	}

	async revokeAllSessions(): Promise<void> {
		await apiClient.delete('/auth/sessions');
	}

	async getProfile(): Promise<{ user: any }> {
		const response = await apiClient.get<{ user: any }>('/profile');
		return response.data;
	}

	async updateProfile(data: { name: string; picture?: string }): Promise<{ user: any }> {
		const response = await apiClient.put<{ user: any }>('/profile', data);
		return response.data;
	}

	async getCSRFToken(): Promise<{ csrf_token: string }> {
		const response = await apiClient.get<{ csrf_token: string }>('/csrf-token');
		return response.data;
	}

	async getHealth(): Promise<{ status: string; timestamp: number }> {
		const response = await apiClient.get<{ status: string; timestamp: number }>('/health');
		return response.data;
	}
}

export const authService = new AuthService();
