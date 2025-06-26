'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, User } from 'lucide-react';
import Button from '../ui/Button';

interface ProfileImageUploadProps {
	currentImage?: string;
	onImageChange: (imageUrl: string) => void;
	disabled?: boolean;
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
																   currentImage,
																   onImageChange,
																   disabled = false
															   }) => {
	const [dragOver, setDragOver] = useState(false);
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileSelect = async (file: File) => {
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith('image/')) {
			alert('Please select an image file');
			return;
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			alert('Image size should be less than 5MB');
			return;
		}

		try {
			setUploading(true);

			// Convert to base64 for demo purposes
			// In production, you'd upload to a service like AWS S3, Cloudinary, etc.
			const reader = new FileReader();
			reader.onload = (e) => {
				const result = e.target?.result as string;
				onImageChange(result);
			};
			reader.readAsDataURL(file);
		} catch (error) {
			console.error('Image upload failed:', error);
			alert('Failed to upload image');
		} finally {
			setUploading(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);

		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0) {
			handleFileSelect(files[0]);
		}
	};

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
	};

	return (
		<div className="flex flex-col items-center space-y-4">
			{/* Current Image Display */}
			<div className="relative">
				<div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-gray-300">
					{currentImage ? (
						<img
							src={currentImage}
							alt="Profile"
							className="w-full h-full object-cover"
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center">
							<User className="w-16 h-16 text-gray-400" />
						</div>
					)}
				</div>

				{currentImage && !disabled && (
					<button
						onClick={() => onImageChange('')}
						className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
						title="Remove image"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>

			{!disabled && (
				<>
					{/* Drop Zone */}
					<div
						className={`
                            w-64 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center
                            transition-colors cursor-pointer
                            ${dragOver
							? 'border-blue-500 bg-blue-50'
							: 'border-gray-300 hover:border-gray-400'
						}
                            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
						onDrop={handleDrop}
						onDragOver={(e) => {
							e.preventDefault();
							setDragOver(true);
						}}
						onDragLeave={() => setDragOver(false)}
						onClick={() => fileInputRef.current?.click()}
					>
						<Upload className="w-8 h-8 text-gray-400 mb-2" />
						<p className="text-sm text-gray-600 text-center">
							{uploading ? 'Uploading...' : 'Drop image here or click to select'}
						</p>
						<p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
					</div>

					{/* Hidden File Input */}
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						onChange={handleFileInput}
						className="hidden"
						disabled={uploading}
					/>

					{/* Action Buttons */}
					<div className="flex space-x-2">
						<Button
							onClick={() => fileInputRef.current?.click()}
							variant="outline"
							size="sm"
							disabled={uploading}
						>
							Choose File
						</Button>
					</div>
				</>
			)}
		</div>
	);
};

export default ProfileImageUpload;


