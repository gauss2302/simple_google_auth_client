import React from 'react';
import { clsx } from 'clsx';

interface LoadingProps {
	size?: 'sm' | 'md' | 'lg';
	variant?: 'spinner' | 'dots' | 'pulse';
	text?: string;
	className?: string;
}

const Loading: React.FC<LoadingProps> = ({
											 size = 'md',
											 variant = 'spinner',
											 text,
											 className,
										 }) => {
	const sizeClasses = {
		sm: 'w-4 h-4',
		md: 'w-8 h-8',
		lg: 'w-12 h-12',
	};

	const textSizeClasses = {
		sm: 'text-sm',
		md: 'text-base',
		lg: 'text-lg',
	};

	const renderSpinner = () => (
		<div
			className={clsx(
				'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
				sizeClasses[size]
			)}
		/>
	);

	const renderDots = () => (
		<div className="flex space-x-1">
			{[0, 1, 2].map((i) => (
				<div
					key={i}
					className={clsx(
						'bg-blue-600 rounded-full animate-pulse',
						{
							'w-2 h-2': size === 'sm',
							'w-3 h-3': size === 'md',
							'w-4 h-4': size === 'lg',
						}
					)}
					style={{
						animationDelay: `${i * 0.15}s`,
						animationDuration: '1s',
					}}
				/>
			))}
		</div>
	);

	const renderPulse = () => (
		<div
			className={clsx(
				'bg-gray-300 rounded animate-pulse',
				sizeClasses[size]
			)}
		/>
	);

	const renderVariant = () => {
		switch (variant) {
			case 'dots':
				return renderDots();
			case 'pulse':
				return renderPulse();
			default:
				return renderSpinner();
		}
	};

	return (
		<div className={clsx('flex flex-col items-center justify-center', className)}>
			{renderVariant()}
			{text && (
				<p className={clsx('mt-2 text-gray-600', textSizeClasses[size])}>
					{text}
				</p>
			)}
		</div>
	);
};

export default Loading;
