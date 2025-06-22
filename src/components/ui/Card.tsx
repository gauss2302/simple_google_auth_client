import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: 'default' | 'bordered' | 'elevated';
	padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({
									   children,
									   variant = 'default',
									   padding = 'md',
									   className,
									   ...props
								   }) => {
	const baseClasses = 'bg-white rounded-lg';

	const variantClasses = {
		default: 'border border-gray-200',
		bordered: 'border-2 border-gray-300',
		elevated: 'shadow-lg border border-gray-100',
	};

	const paddingClasses = {
		none: '',
		sm: 'p-3',
		md: 'p-4',
		lg: 'p-6',
	};

	return (
		<div
			className={clsx(
				baseClasses,
				variantClasses[variant],
				paddingClasses[padding],
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
};

export default Card;
