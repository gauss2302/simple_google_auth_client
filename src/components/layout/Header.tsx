'use client'

import React, { useState, useEffect } from 'react'
import { Menu, X, LogOut, User } from 'lucide-react'
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from '../../lib/context/AuthContext';
import Button from '../ui/Button';
import {Navigation} from "@/src/lib/utils/constants";

const navigation = Navigation

export default function Header() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const [showUserMenu, setShowUserMenu] = useState(false)
	const path = usePathname()
	const router = useRouter()
	const { user, isAuthenticated, logout, isLoading } = useAuth()

	// Close mobile menu when clicking outside
	useEffect(() => {
		if (mobileMenuOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}

		return () => {
			document.body.style.overflow = 'unset'
		}
	}, [mobileMenuOpen])

	const isActiveRoute = (href: string): boolean => {
		return path === href || (href !== '/' && path.startsWith(href))
	}

	const handleLogout = async () => {
		await logout()
		setShowUserMenu(false)
		router.push('/')
	}

	const filteredNavigation = isAuthenticated
		? navigation
		: navigation.filter(item => item.href === '/')

	return (
		<>
			<header className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-700 shadow-lg">
				<nav aria-label="Global" className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
					<div className="flex lg:flex-1">
						<Link href="/" className="-m-1.5 p-1.5">
							<span className="sr-only">OAuth Demo App</span>
							<div className="text-white font-bold text-xl">
								OAuth App
							</div>
						</Link>
					</div>

					{/* Desktop Navigation */}
					<div className="hidden lg:flex lg:gap-x-12">
						{filteredNavigation.map((item) => (
							<Link
								key={item.name}
								href={item.href}
								className={`
                              relative text-sm font-semibold transition-all duration-200 group
                              ${isActiveRoute(item.href)
									? 'text-white'
									: 'text-gray-300 hover:text-white'
								}
                          `}
							>
								{item.name}
								{/* Active and hover underline effect */}
								<span className={`
                              absolute bottom-[-4px] left-0 h-0.5 bg-gradient-to-r from-indigo-400 to-purple-500
                              transition-all duration-300 ease-out
                              ${isActiveRoute(item.href)
									? 'w-full opacity-100'
									: 'w-0 opacity-0 group-hover:w-full group-hover:opacity-100'
								}
                          `} />
							</Link>
						))}
					</div>

					{/* Desktop Auth Section */}
					<div className="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-4">
						{!isLoading && (
							isAuthenticated ? (
								<div className="relative">
									<button
										onClick={() => setShowUserMenu(!showUserMenu)}
										className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
									>
										{user?.picture ? (
											<img
												src={user.picture}
												alt={user.name}
												className="w-8 h-8 rounded-full"
											/>
										) : (
											<User className="w-5 h-5" />
										)}
										<span className="text-sm font-medium">{user?.name}</span>
									</button>

									{showUserMenu && (
										<div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
											<Link
												href="/profile"
												className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
												onClick={() => setShowUserMenu(false)}
											>
												Profile
											</Link>
											<Link
												href="/dashboard"
												className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
												onClick={() => setShowUserMenu(false)}
											>
												Dashboard
											</Link>
											<button
												onClick={handleLogout}
												className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
											>
												<LogOut className="w-4 h-4 inline mr-2" />
												Sign out
											</button>
										</div>
									)}
								</div>
							) : (
								<Button
									onClick={() => router.push('/auth/login')}
									className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 hover:scale-105"
								>
									Sign In
								</Button>
							)
						)}
					</div>

					{/* Mobile menu button */}
					<div className="flex lg:hidden">
						<button
							type="button"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
							aria-expanded={mobileMenuOpen}
							aria-label="Toggle navigation menu"
						>
							{mobileMenuOpen ? (
								<X className="w-6 h-6" />
							) : (
								<Menu className="w-6 h-6" />
							)}
						</button>
					</div>
				</nav>
			</header>

			{/* Mobile Menu Overlay */}
			{mobileMenuOpen && (
				<>
					{/* Backdrop */}
					<div
						className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
						onClick={() => setMobileMenuOpen(false)}
						aria-hidden="true"
					/>

					{/* Mobile Menu Panel */}
					<div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-gray-900 px-6 py-6 shadow-xl ring-1 ring-gray-700 lg:hidden">
						<div className="flex items-center justify-between">
							<Link href="/" className="-m-1.5 p-1.5">
								<span className="sr-only">OAuth Demo App</span>
								<div className="text-white font-bold text-lg">
									OAuth App
								</div>
							</Link>
							<button
								type="button"
								onClick={() => setMobileMenuOpen(false)}
								className="-m-2.5 rounded-md p-2.5 text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white"
								aria-label="Close menu"
							>
								<X className="w-6 h-6" />
							</button>
						</div>

						<div className="mt-6 flow-root">
							<div className="-my-6 divide-y divide-gray-500/25">
								{/* User Info Section */}
								{isAuthenticated && user && (
									<div className="py-6">
										<div className="flex items-center gap-3 mb-4">
											{user.picture ? (
												<img
													src={user.picture}
													alt={user.name}
													className="w-10 h-10 rounded-full"
												/>
											) : (
												<User className="w-10 h-10 text-gray-300" />
											)}
											<div>
												<p className="text-white font-medium">{user.name}</p>
												<p className="text-gray-400 text-sm">{user.email}</p>
											</div>
										</div>
									</div>
								)}

								<div className="space-y-2 py-6">
									{filteredNavigation.map((item) => (
										<Link
											key={item.name}
											href={item.href}
											onClick={() => setMobileMenuOpen(false)}
											className={`
                                        -mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold transition-all duration-200
                                        ${isActiveRoute(item.href)
												? 'text-white bg-indigo-600/20 border-l-4 border-indigo-500'
												: 'text-gray-300 hover:text-white hover:bg-gray-800/50'
											}
                                    `}
										>
											{item.name}
										</Link>
									))}
								</div>

								{/* Mobile Auth Section */}
								<div className="py-6">
									{!isLoading && (
										isAuthenticated ? (
											<button
												onClick={() => {
													handleLogout()
													setMobileMenuOpen(false)
												}}
												className="flex items-center w-full rounded-md bg-red-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600"
											>
												<LogOut className="w-4 h-4 mr-2" />
												Sign Out
											</button>
										) : (
											<Button
												onClick={() => {
													router.push('/auth/login')
													setMobileMenuOpen(false)
												}}
												className="block w-full rounded-md bg-indigo-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600"
											>
												Sign In
											</Button>
										)
									)}
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</>
	)
}
