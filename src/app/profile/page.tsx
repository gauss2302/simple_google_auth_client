'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/context/AuthContext';
import { authService } from '../../lib/api/auth';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Loading from '../../components/ui/Loading';
import { Session } from '../../types/auth';

const ProfilePage = () => {
	const { user, updateUser, logout } = useAuth();
	const router = useRouter();

	// Profile editing state
	const [isEditing, setIsEditing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [profileData, setProfileData] = useState({
		name: user?.name || '',
		picture: user?.picture || '',
	});
	const [profileError, setProfileError] = useState<string | null>(null);

	// Sessions state
	const [sessions, setSessions] = useState<Session[]>([]);
	const [sessionsLoading, setSessionsLoading] = useState(true);
	const [sessionsError, setSessionsError] = useState<string | null>(null);

	// Update profile data when user changes
	useEffect(() => {
		if (user) {
			setProfileData({
				name: user.name || '',
				picture: user.picture || '',
			});
		}
	}, [user]);

	// Load sessions
	const loadSessions = async () => {
		try {
			setSessionsLoading(true);
			setSessionsError(null);
			const response = await authService.getSessions();
			setSessions(response.sessions || []);
		} catch (error: any) {
			console.error('Failed to load sessions:', error);
			setSessionsError('Failed to load active sessions');
		} finally {
			setSessionsLoading(false);
		}
	};

	useEffect(() => {
		loadSessions();
	}, []);

	// Handle profile form changes
	const handleProfileChange = (field: string, value: string) => {
		setProfileData(prev => ({
			...prev,
			[field]: value
		}));
		setProfileError(null);
	};

	// Save profile changes
	const handleSaveProfile = async () => {
		if (!profileData.name.trim()) {
			setProfileError('Name is required');
			return;
		}

		try {
			setIsLoading(true);
			setProfileError(null);

			const updateData = {
				name: profileData.name.trim(),
				...(profileData.picture && { picture: profileData.picture })
			};

			const response = await authService.updateProfile(updateData);

			if (response.user) {
				updateUser(response.user);
				setIsEditing(false);
				console.log('Profile updated successfully');
			}
		} catch (error: any) {
			console.error('Profile update failed:', error);
			setProfileError(
				error.response?.data?.message ||
				'Failed to update profile. Please try again.'
			);
		} finally {
			setIsLoading(false);
		}
	};

	// Cancel editing
	const handleCancelEdit = () => {
		setProfileData({
			name: user?.name || '',
			picture: user?.picture || '',
		});
		setIsEditing(false);
		setProfileError(null);
	};

	// Revoke session
	const handleRevokeSession = async (sessionId: string) => {
		if (!confirm('Are you sure you want to revoke this session?')) {
			return;
		}

		try {
			await authService.revokeSession(sessionId);
			await loadSessions();
			console.log('Session revoked successfully');
		} catch (error: any) {
			console.error('Failed to revoke session:', error);
			setSessionsError('Failed to revoke session');
		}
	};

	// Revoke all sessions
	const handleRevokeAllSessions = async () => {
		if (!confirm('Are you sure you want to revoke all other sessions? This will log you out from all other devices.')) {
			return;
		}

		try {
			await authService.revokeAllSessions();
			await loadSessions();
			console.log('All sessions revoked successfully');
		} catch (error: any) {
			console.error('Failed to revoke all sessions:', error);
			setSessionsError('Failed to revoke sessions');
		}
	};

	// Format date
	const formatDate = (dateString: string) => {
		try {
			return new Date(dateString).toLocaleString();
		} catch {
			return 'Unknown';
		}
	};

	// Get device type from user agent
	const getDeviceType = (userAgent: string) => {
		if (!userAgent) return 'Unknown Device';

		const ua = userAgent.toLowerCase();
		if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
			return 'Mobile Device';
		}
		if (ua.includes('chrome')) return 'Chrome Browser';
		if (ua.includes('firefox')) return 'Firefox Browser';
		if (ua.includes('safari')) return 'Safari Browser';
		if (ua.includes('edge')) return 'Edge Browser';

		return 'Desktop Browser';
	};

	if (!user) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loading variant="spinner" size="lg" text="Loading profile..." />
			</div>
		);
	}

	return (
		<ProtectedRoute>
			<div className="min-h-screen bg-gray-50">
				<Header />

				<main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
					<div className="space-y-8">
						{/* Page Header */}
						<div className="text-center">
							<h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
							<p className="mt-2 text-gray-600">
								Manage your account information and security settings
							</p>
						</div>

						{/* Profile Information */}
						<Card className="p-6">
							<div className="flex items-center justify-between mb-6">
								<h2 className="text-xl font-semibold text-gray-900">
									Profile Information
								</h2>
								{!isEditing ? (
									<Button
										onClick={() => setIsEditing(true)}
										variant="outline"
									>
										Edit Profile
									</Button>
								) : (
									<div className="flex space-x-2">
										<Button
											onClick={handleSaveProfile}
											disabled={isLoading}
										>
											{isLoading ? <Loading variant="spinner" size="sm" /> : 'Save'}
										</Button>
										<Button
											onClick={handleCancelEdit}
											variant="outline"
											disabled={isLoading}
										>
											Cancel
										</Button>
									</div>
								)}
							</div>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								{/* Profile Picture */}
								<div className="flex flex-col items-center">
									<div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 mb-4">
										{user.picture ? (
											<img
												src={user.picture}
												alt={user.name}
												className="w-full h-full object-cover"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center">
                                                <span className="text-2xl font-bold text-gray-400">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </span>
											</div>
										)}
									</div>

									{isEditing && (
										<Input
											label="Profile Picture URL"
											value={profileData.picture || ''}
											onChange={(e) => handleProfileChange('picture', e.target.value)}
											placeholder="https://example.com/image.jpg"
											className="w-full"
										/>
									)}
								</div>

								{/* Profile Details */}
								<div className="md:col-span-2 space-y-4">
									{isEditing ? (
										<Input
											label="Full Name"
											value={profileData.name}
											onChange={(e) => handleProfileChange('name', e.target.value)}
											placeholder="Enter your full name"
											error={profileError}
										/>
									) : (
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												Full Name
											</label>
											<p className="text-lg text-gray-900">{user.name}</p>
										</div>
									)}

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Email Address
										</label>
										<p className="text-gray-900">{user.email}</p>
										<p className="text-sm text-gray-500 mt-1">
											Connected with Google OAuth
										</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Member Since
										</label>
										<p className="text-gray-900">
											{formatDate(user.created_at)}
										</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											User ID
										</label>
										<p className="text-sm text-gray-500 font-mono">{user.id}</p>
									</div>
								</div>
							</div>
						</Card>

						{/* Active Sessions */}
						<Card className="p-6">
							<div className="flex items-center justify-between mb-6">
								<h2 className="text-xl font-semibold text-gray-900">
									Active Sessions
								</h2>
								<Button
									onClick={handleRevokeAllSessions}
									variant="outline"
									className="text-red-600 border-red-300 hover:bg-red-50"
								>
									Revoke All Others
								</Button>
							</div>

							{sessionsLoading ? (
								<div className="text-center py-8">
									<Loading variant="spinner" size="md" text="Loading sessions..." />
								</div>
							) : sessionsError ? (
								<div className="text-center py-8">
									<div className="text-red-600 mb-4">{sessionsError}</div>
									<Button onClick={loadSessions} variant="outline">
										Retry
									</Button>
								</div>
							) : sessions.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									No active sessions found
								</div>
							) : (
								<div className="space-y-4">
									{sessions.map((session) => (
										<div
											key={session.id}
											className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
										>
											<div>
												<div className="flex items-center space-x-2">
													<p className="font-medium text-gray-900">
														{getDeviceType(session.user_agent)}
													</p>
													{session.id === user.id && (
														<span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                            Current
                                                        </span>
													)}
												</div>
												<div className="mt-1 text-sm text-gray-500">
													<p>IP: {session.ip_address}</p>
													<p>Last used: {formatDate(session.last_used_at)}</p>
												</div>
											</div>

											{session.id !== user.id && (
												<Button
													onClick={() => handleRevokeSession(session.id)}
													variant="outline"
													size="sm"
													className="text-red-600 border-red-300 hover:bg-red-50"
												>
													Revoke
												</Button>
											)}
										</div>
									))}
								</div>
							)}
						</Card>

						{/* Account Actions */}
						<Card className="p-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-6">
								Account Actions
							</h2>

							<div className="space-y-4">
								<div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
									<div>
										<h3 className="font-medium text-gray-900">Sign Out</h3>
										<p className="text-sm text-gray-500">
											Sign out from this device
										</p>
									</div>
									<Button
										onClick={async () => {
											await logout();
											router.push('/');
										}}
										variant="outline"
									>
										Sign Out
									</Button>
								</div>

								<div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
									<div>
										<h3 className="font-medium text-red-900">Sign Out Everywhere</h3>
										<p className="text-sm text-red-600">
											Sign out from all devices and revoke all sessions
										</p>
									</div>
									<Button
										onClick={async () => {
											if (confirm('This will sign you out from all devices. Continue?')) {
												try {
													await authService.revokeAllSessions();
													await logout();
													router.push('/');
												} catch (error) {
													console.error('Failed to revoke all sessions:', error);
												}
											}
										}}
										variant="outline"
										className="text-red-600 border-red-300 hover:bg-red-100"
									>
										Sign Out Everywhere
									</Button>
								</div>
							</div>
						</Card>
					</div>
				</main>

				<Footer />
			</div>
		</ProtectedRoute>
	);
};

export default ProfilePage;
