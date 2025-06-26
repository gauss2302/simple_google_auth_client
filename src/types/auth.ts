export interface User {
	id: string;
	google_id: string;
	email: string;
	name: string;
	picture: string;
	created_at: string;
	updated_at: string;
}

export interface TokenPair {
	access_token: string;
	refresh_token: string;
	session_id: string;
}

export interface Session {
	id: string;
	user_id: string;
	expires_at: string;
	created_at: string;
	last_used_at: string;
	user_agent: string;
	ip_address: string;
}

export interface AuthResponse {
	user: User;
	tokens: TokenPair;
}

export interface ApiError {
	response: any;
	config: any;
	error: string;
	message?: string;
	code: string;
}

export interface AuthState {
	user: User | null;
	tokens: TokenPair | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
	sessions: Session[];
}

export interface AuthActions {
	setUser: (user: User) => void;
	setTokens: (tokens: TokenPair) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	setSessions: (sessions: Session[]) => void;
	login: (authResponse: AuthResponse) => void;
	logout: () => Promise<void>;
	refreshToken: () => Promise<boolean>;
	fetchProfile: () => Promise<void>;
	fetchSessions: () => Promise<void>;
	revokeSession: (sessionId: string) => Promise<void>;
	revokeAllSessions: () => Promise<void>;
	updateProfile: (data: { name: string; picture?: string }) => Promise<void>;
}

// Additional types for profile management
export interface ProfileUpdateRequest {
	name: string;
	picture?: string;
}

export interface ProfileUpdateResponse {
	user: User;
	message: string;
}

export interface SessionsResponse {
	sessions: Session[];
}

export interface SecurityEvent {
	id: string;
	user_id: string;
	event_type: 'login' | 'logout' | 'token_refresh' | 'profile_update' | 'session_revoked';
	ip_address: string;
	user_agent: string;
	created_at: string;
	metadata?: Record<string, any>;
}
