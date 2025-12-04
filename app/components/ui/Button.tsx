'use client';

import React from 'react';
import Spinner from './Spinner';

type ButtonVariant = 'blue' | 'orange' | 'gray' | 'red' | 'default';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  blue: 'bg-blue-600 hover:bg-blue-700 text-white',
  orange: 'bg-orange-500 hover:bg-orange-600 text-white',
  gray: 'bg-gray-500 hover:bg-gray-600 text-white',
  red: 'bg-red-600 hover:bg-red-700 text-white',
  default: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
};

export default function Button({
  variant = 'default',
  children,
  className = '',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const spinnerColor = variant === 'default' ? 'gray' : 'white';

  return (
    <button
      className={`
        px-4 py-2 rounded-md font-medium
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-offset-2
        flex items-center justify-center gap-2
        ${variantStyles[variant]}
        ${variant === 'blue' ? 'focus:ring-blue-500' : ''}
        ${variant === 'orange' ? 'focus:ring-orange-500' : ''}
        ${variant === 'gray' ? 'focus:ring-gray-500' : ''}
        ${variant === 'red' ? 'focus:ring-red-500' : ''}
        ${variant === 'default' ? 'focus:ring-gray-500' : ''}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading && <Spinner size="sm" color={spinnerColor} />}
      {children}
    </button>
  );
}










