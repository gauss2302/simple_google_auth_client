import { Inter } from 'next/font/google';
import { AuthProvider } from '../lib/context/AuthContext';
import './globals.css';
import React from "react";

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'OAuth Demo App',
    description: 'Secure authentication with Google OAuth, Next.js, and Go',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <body className={inter.className}>
        <AuthProvider>
            {children}
        </AuthProvider>
        </body>
        </html>
    );
}
