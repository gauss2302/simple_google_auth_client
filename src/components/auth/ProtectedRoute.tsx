'use client';

import { useAuth } from '../../lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import Loading from '../ui/Loading';

interface ProtectedRouteProps {
	children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
	const { isAuthenticated, isLoading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			router.push('/auth/login');
		}
	}, [isAuthenticated, isLoading, router]);

	if (isLoading) {
		return <Loading />;
	}

	if (!isAuthenticated) {
		return null;
	}

	return <>{children}</>;
};

export default ProtectedRoute;
