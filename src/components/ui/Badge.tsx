import React from 'react';
import { useThemeStore } from '../../stores/themeStore';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'pink' | 'blue' | 'purple' | 'yellow' | 'green' | 'red' | 'default';
}

export const Badge = ({ children, variant = 'default', className = '', ...props }: BadgeProps) => {
  const theme = useThemeStore((s) => s.theme);
  const isModern = theme === 'modern';

  const brutalClasses = {
    pink: 'bg-pastel-pink text-black border-2 border-black',
    blue: 'bg-pastel-blue text-black border-2 border-black',
    purple: 'bg-pastel-purple text-black border-2 border-black',
    yellow: 'bg-pastel-yellow text-black border-2 border-black',
    green: 'bg-pastel-green text-black border-2 border-black',
    red: 'bg-pastel-red text-black border-2 border-black',
    default: 'bg-gray-100 text-black border-2 border-black',
  };

  const modernClasses = {
    pink: 'bg-pink-100 text-pink-800 rounded-full',
    blue: 'bg-blue-100 text-blue-800 rounded-full',
    purple: 'bg-purple-100 text-purple-800 rounded-full',
    yellow: 'bg-yellow-100 text-yellow-800 rounded-full',
    green: 'bg-green-100 text-green-800 rounded-full',
    red: 'bg-red-100 text-red-800 rounded-full',
    default: 'bg-gray-100 text-gray-800 rounded-full',
  };

  const variantClass = isModern ? modernClasses[variant] : brutalClasses[variant];
  const baseClass = isModern 
    ? 'inline-flex items-center px-3 py-1 text-[11px] font-semibold'
    : 'inline-flex items-center px-2 py-0.5 text-xs font-bold';

  return (
    <span 
      className={`${baseClass} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
