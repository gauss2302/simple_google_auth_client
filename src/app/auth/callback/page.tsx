'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/context/AuthContext';
import { authService } from '../../../lib/api/auth';
import Loading from '../../../components/ui/Loading';

const CallbackPage = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { login } = useAuth();
	const [isProcessing, setIsProcessing] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const handleCallback = async () => {
			try {
				setIsProcessing(true);
				setError(null);

				// Log all URL parameters for debugging
				console.log('Callback URL params:', Object.fromEntries(searchParams.entries()));

				// Check for error first
				const errorParam = searchParams.get('error');
				if (errorParam) {
					console.error('OAuth error:', errorParam);
					setError(errorParam);
					setTimeout(() => router.push(`/auth/login?error=${errorParam}`), 2000);
					return;
				}

				// Check for auth code from our secure flow
				const authCode = searchParams.get('auth_code');
				if (authCode) {
					console.log('Found auth_code, exchanging for tokens...');
					try {
						const response = await authService.exchangeAuthCode(authCode);
						console.log('Successfully exchanged auth code');

						await login(response.tokens, response.user);
						console.log('Login completed, redirecting to home...');

						// Small delay to ensure state is updated
						setTimeout(() => router.push('/'), 100);
						return;
					} catch (error: any) {
						console.error('Auth code exchange error:', error);
						setError('exchange_failed');
						setTimeout(() => router.push('/auth/login?error=exchange_failed'), 2000);
						return;
					}
				}

				// Check for direct OAuth callback (code + state)
				const code = searchParams.get('code');
				const state = searchParams.get('state');

				if (code && state) {
					console.log('Found OAuth code and state, calling backend...');
					try {
						const response = await authService.handleCallback(code, state);
						console.log('Successfully handled OAuth callback');

						await login(response.tokens, response.user);
						console.log('Login completed, redirecting to home...');

						// Small delay to ensure state is updated
						setTimeout(() => router.push('/'), 100);
						return;
					} catch (error: any) {
						console.error('OAuth callback error:', error);
						setError('callback_failed');
						setTimeout(() => router.push('/auth/login?error=callback_failed'), 2000);
						return;
					}
				}

				// If we get here, we don't have the expected parameters
				console.error('No expected parameters found in callback URL');
				console.log('Available params:', Array.from(searchParams.keys()));
				setError('no_tokens_received');
				setTimeout(() => router.push('/auth/login?error=no_tokens_received'), 2000);

			} catch (error) {
				console.error('Unexpected error in callback:', error);
				setError('unexpected_error');
				setTimeout(() => router.push('/auth/login?error=unexpected_error'), 2000);
			} finally {
				setIsProcessing(false);
			}
		};

		handleCallback();
	}, [searchParams, router, login]);

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
						<svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<p className="text-gray-600 mb-2">Authentication failed</p>
					<p className="text-sm text-gray-400">Error: {error}</p>
					<p className="text-sm text-gray-400 mt-2">Redirecting to login...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="text-center">
				<Loading variant="spinner" size="lg" />
				<p className="mt-4 text-gray-600">
					{isProcessing ? 'Completing authentication...' : 'Redirecting...'}
				</p>
				<p className="mt-2 text-xs text-gray-400">
					Check browser console for debug info
				</p>
			</div>
		</div>
	);
};

export default CallbackPage;
