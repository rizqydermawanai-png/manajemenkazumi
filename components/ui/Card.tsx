// components/ui/Card.tsx
import React from 'react';
import { motion } from 'framer-motion';

// FIX: Changed from `interface extends` to a `type` intersection with `ComponentProps`
// to provide more robust type inference for motion.div props, resolving errors with `className` and `children`.
type CardProps = {
    children: React.ReactNode;
} & React.ComponentProps<typeof motion.div>;

export const Card = ({ children, className = '', ...props }: CardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -3, boxShadow: "0px 15px 25px -5px rgba(0,0,0,0.08)" }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`bg-white p-6 rounded-xl shadow-lg border border-slate-200/80 ${className}`}
            {...props}
        >
            {children}
        </motion.div>
    );
};
