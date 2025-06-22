'use client';

import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../lib/context/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useRouter } from 'next/navigation';
import React from "react";
import Header from "@/src/components/layout/Header";
import Footer from "@/src/components/layout/Footer";

const DashboardPage = () => {
	const { user, logout } = useAuth();
	const router = useRouter();

	const handleLogout = async () => {
		await logout();
		router.push('/auth/login');
	};

	return (
		<ProtectedRoute>
			<div className="min-h-screen bg-gray-50">
				{/*<header className="bg-white shadow">*/}
				{/*	<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">*/}
				{/*		<div className="flex justify-between items-center py-6">*/}
				{/*			<h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>*/}
				{/*			<div className="flex items-center space-x-4">*/}
				{/*				<span className="text-gray-700">Welcome, {user?.name}</span>*/}
				{/*				<Button variant="outline" onClick={() => router.push('/profile')}>*/}
				{/*					Profile*/}
				{/*				</Button>*/}
				{/*				<Button variant="secondary" onClick={handleLogout}>*/}
				{/*					Logout*/}
				{/*				</Button>*/}
				{/*			</div>*/}
				{/*		</div>*/}
				{/*	</div>*/}
				{/*</header>*/}
				<Header/>

				<main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
					<div className="px-4 py-6 sm:px-0">
						<Card className="p-6">
							<h2 className="text-xl font-semibold mb-4">User Information</h2>
							<div className="space-y-2">
								<p><strong>Email:</strong> {user?.email}</p>
								<p><strong>Name:</strong> {user?.name}</p>
								<p><strong>Member
									since:</strong> {new Date(user?.created_at || '').toLocaleDateString()}</p>
							</div>
						</Card>
					</div>
				</main>
			</div>
			<footer>
				<Footer/>
			</footer>
		</ProtectedRoute>
	);
};

export default DashboardPage;
