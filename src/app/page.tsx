'use client';

import { useAuth } from '../lib/context/AuthContext';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import Footer from "@/src/components/layout/Footer";

const HomePage = () => {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();
    const [showContent, setShowContent] = useState(false);

    // Delay showing content to avoid flash of unauthenticated state
    useEffect(() => {
        if (!isLoading) {
            const timer = setTimeout(() => setShowContent(true), 100);
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    if (isLoading || !showContent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loading variant="spinner" size="lg" text="Loading..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Navigation */}
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex-shrink-0">
                            <h1 className="text-xl font-bold text-gray-900">OAuth App</h1>
                        </div>
                        <div>
                            {isAuthenticated ? (
                                <div className="flex items-center space-x-4">
                  <span className="text-green-600 font-medium">
                    ✓ Signed in as {user?.name}
                  </span>
                                    <Button
                                        onClick={() => router.push('/dashboard')}
                                        variant="primary"
                                    >
                                        Dashboard
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    onClick={() => router.push('/auth/login')}
                                    variant="primary"
                                >
                                    Sign In
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                        <span className="block">Welcome to</span>
                        <span className="block text-blue-600">OAuth Demo App</span>
                    </h1>

                    {isAuthenticated ? (
                        <div className="mt-8">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
                                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-green-900 mb-2">
                                    Successfully Authenticated!
                                </h2>
                                <p className="text-green-700 mb-4">
                                    Welcome back, <strong>{user?.name}</strong>!
                                </p>
                                <div className="text-sm text-green-600 space-y-1">
                                    <p>Email: {user?.email}</p>
                                    <p>User ID: {user?.id}</p>
                                </div>
                            </div>

                            <div className="mt-8 space-x-4">
                                <Button
                                    onClick={() => router.push('/dashboard')}
                                    size="lg"
                                >
                                    Go to Dashboard
                                </Button>
                                <Button
                                    onClick={() => router.push('/profile')}
                                    variant="outline"
                                    size="lg"
                                >
                                    View Profile
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-8">
                            <p className="text-lg text-gray-600 mb-8">
                                Secure authentication with Google OAuth
                            </p>
                            <Button
                                onClick={() => router.push('/auth/login')}
                                size="lg"
                                className="px-8"
                            >
                                Sign In with Google
                            </Button>
                        </div>
                    )}
                </div>
            </main>

            <footer>
                <Footer />
            </footer>
            {/*/!* Footer *!/*/}
            {/*<footer className="bg-gray-800 mt-auto">*/}
            {/*    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">*/}
            {/*        <div className="text-center">*/}
            {/*            <p className="text-gray-400 text-sm">*/}
            {/*                © 2025 OAuth Demo App. Built with Next.js and Go.*/}
            {/*            </p>*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*</footer>*/}
        </div>
    );
};

export default HomePage;
