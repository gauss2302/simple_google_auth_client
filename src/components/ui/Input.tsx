import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
	helperText?: string;
	variant?: 'default' | 'filled';
	inputSize?: 'sm' | 'md' | 'lg';
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
															label,
															error,
															helperText,
															variant = 'default',
															inputSize = 'md',
															className,
															id,
															...props
														}, ref) => {
	const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

	const baseClasses = 'block w-full rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';

	const variantClasses = {
		default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
		filled: 'border-transparent bg-gray-100 focus:bg-white focus:border-blue-500 focus:ring-blue-500',
	};

	const sizeClasses = {
		sm: 'px-3 py-2 text-sm',
		md: 'px-3 py-2 text-base',
		lg: 'px-4 py-3 text-lg',
	};

	const errorClasses = error
		? 'border-red-500 focus:border-red-500 focus:ring-red-500'
		: '';

	return (
		<div className="w-full">
			{label && (
				<label
					htmlFor={inputId}
					className="block text-sm font-medium text-gray-700 mb-1"
				>
					{label}
				</label>
			)}
			<input
				ref={ref}
				id={inputId}
				className={clsx(
					baseClasses,
					variantClasses[variant],
					sizeClasses[inputSize],
					errorClasses,
					className
				)}
				{...props}
			/>
			{error && (
				<p className="mt-1 text-sm text-red-600">{error}</p>
			)}
			{helperText && !error && (
				<p className="mt-1 text-sm text-gray-500">{helperText}</p>
			)}
		</div>
	);
});

Input.displayName = 'Input';

export default Input;
