// src/components/profile/SecuritySettings.tsx
import React, { useState } from 'react';
import { Shield, Key, Clock, AlertTriangle, Download, LogOut } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface SecuritySettingsProps {
	onRevokeAllSessions: () => void;
	onDownloadData: () => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({
															   onRevokeAllSessions,
															   onDownloadData
														   }) => {
	const [showDangerZone, setShowDangerZone] = useState(false);

	const securityActions = [
		{
			icon: <Key className="w-5 h-5" />,
			title: 'Password Security',
			description: 'Your account is secured with Google OAuth - no password needed',
			action: null,
			disabled: true
		},
		{
			icon: <Clock className="w-5 h-5" />,
			title: 'Session Timeout',
			description: 'Automatic logout after 30 days of inactivity',
			action: null,
			disabled: true
		},
		{
			icon: <Download className="w-5 h-5" />,
			title: 'Download Your Data',
			description: 'Get a copy of your account data and activity',
			action: onDownloadData,
			disabled: false
		},
		{
			icon: <LogOut className="w-5 h-5" />,
			title: 'Sign Out All Devices',
			description: 'Revoke access from all other devices and browsers',
			action: onRevokeAllSessions,
			disabled: false,
			variant: 'destructive' as const
		}
	];

	return (
		<Card className="p-6">
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-xl font-semibold text-gray-900 flex items-center">
					<Shield className="w-5 h-5 mr-2" />
					Security Settings
				</h2>
			</div>

			<div className="space-y-4">
				{securityActions.map((action, index) => (
					<div
						key={index}
						className={`
                            flex items-center justify-between p-4 border rounded-lg
                            ${action.variant === 'destructive'
							? 'border-red-200 bg-red-50'
							: 'border-gray-200'
						}
                            ${action.disabled ? 'opacity-60' : ''}
                        `}
					>
						<div className="flex items-center space-x-3">
							<div className={`
                                ${action.variant === 'destructive'
								? 'text-red-600'
								: 'text-gray-600'
							}
                            `}>
								{action.icon}
							</div>
							<div>
								<h3 className={`
                                    font-medium
                                    ${action.variant === 'destructive'
									? 'text-red-900'
									: 'text-gray-900'
								}
                                `}>
									{action.title}
								</h3>
								<p className={`
                                    text-sm
                                    ${action.variant === 'destructive'
									? 'text-red-600'
									: 'text-gray-500'
								}
                                `}>
									{action.description}
								</p>
							</div>
						</div>

						{action.action && !action.disabled && (
							<Button
								onClick={action.action}
								variant={action.variant === 'destructive' ? 'outline' : 'outline'}
								size="sm"
								className={
									action.variant === 'destructive'
										? 'text-red-600 border-red-300 hover:bg-red-50'
										: ''
								}
							>
								{action.title.includes('Download') ? 'Download' : 'Execute'}
							</Button>
						)}
					</div>
				))}
			</div>

			{/* Danger Zone Toggle */}
			<div className="mt-8 pt-6 border-t border-gray-200">
				<button
					onClick={() => setShowDangerZone(!showDangerZone)}
					className="flex items-center text-red-600 hover:text-red-800 transition-colors"
				>
					<AlertTriangle className="w-4 h-4 mr-2" />
					<span className="text-sm font-medium">
                        {showDangerZone ? 'Hide' : 'Show'} Danger Zone
                    </span>
				</button>

				{showDangerZone && (
					<div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
						<h3 className="font-medium text-red-900 mb-2">Danger Zone</h3>
						<p className="text-sm text-red-600 mb-4">
							These actions cannot be undone. Please proceed with caution.
						</p>

						<div className="space-y-3">
							<Button
								onClick={() => {
									if (window.confirm('This will permanently delete all your data. This action cannot be undone. Are you sure?')) {
										alert('Account deletion would be implemented here');
									}
								}}
								variant="outline"
								size="sm"
								className="text-red-600 border-red-300 hover:bg-red-100"
							>
								Delete Account
							</Button>
						</div>
					</div>
				)}
			</div>
		</Card>
	);
};

export default SecuritySettings;
