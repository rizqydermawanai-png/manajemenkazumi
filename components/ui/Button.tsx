// components/ui/Button.tsx
import React from 'react';
import { motion } from 'framer-motion';

// A simple variant helper function
const getButtonClasses = ({ variant = 'primary', size = 'md', className = '' }: Pick<ButtonProps, 'variant' | 'size' | 'className'>) => {
    const baseClasses = "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed gap-2";
    
    const variantClasses = {
        primary: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white focus:ring-indigo-500 shadow-md hover:shadow-lg shadow-indigo-500/30 bg-[length:200%_auto] hover:bg-right-center',
        secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 focus:ring-slate-400',
        outline: 'border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-indigo-500',
        ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-indigo-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-md hover:shadow-lg shadow-red-500/30',
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
    };

    return [
        baseClasses,
        variantClasses[variant as keyof typeof variantClasses] || variantClasses.primary,
        sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md,
        className
    ].join(' ');
};

export type ButtonProps = React.ComponentProps<typeof motion.button> & {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        const classes = getButtonClasses({ variant, size, className });
        return (
             <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.98, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className={classes}
                ref={ref}
                {...props}
            />
        );
    }
);