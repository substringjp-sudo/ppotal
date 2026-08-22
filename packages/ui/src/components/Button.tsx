"use client";

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { DESIGN_TOKENS } from '../styles/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-md' | 'icon-lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}, ref) => {
  const isIconButton = size.startsWith('icon');
  const baseClasses = "inline-flex items-center justify-center font-medium transition-all select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed";
  
  const sizeClasses = DESIGN_TOKENS.button.sizes[size] || DESIGN_TOKENS.button.sizes.md;
  const variantClasses = DESIGN_TOKENS.button.variants[variant] || DESIGN_TOKENS.button.variants.primary;
  const radiusClasses = isIconButton 
    ? (size === 'icon-sm' ? 'rounded-lg' : 'rounded-xl') 
    : (size === 'sm' ? DESIGN_TOKENS.button.radius.sm : DESIGN_TOKENS.button.radius.md);

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${radiusClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0 items-center justify-center">{leftIcon}</span>}
          {children && <span>{children}</span>}
          {rightIcon && <span className="inline-flex shrink-0 items-center justify-center">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';
