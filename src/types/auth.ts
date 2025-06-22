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
