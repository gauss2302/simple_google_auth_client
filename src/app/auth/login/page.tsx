'use client';

import React, { useState } from 'react';
import { authService } from '../../../lib/api/auth';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';

const LoginPage = () => {
	const [isLoading, setIsLoading] = useState(false);

	const handleGoogleLogin = async () => {
		setIsLoading(true);
		try {
			const response = await authService.getGoogleAuthUrl();
			window.location.href = response.auth_url;
		} catch (error) {
			console.error('Login error:', error);
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<Card className="w-full max-w-md p-6">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome</h1>
					<p className="text-gray-600 mb-8">Sign in to your account</p>

					<Button
						onClick={handleGoogleLogin}
						disabled={isLoading}
						className="w-full"
					>
						{isLoading ? 'Redirecting...' : 'Continue with Google'}
					</Button>
				</div>
			</Card>
		</div>
	);
};

export default LoginPage;
