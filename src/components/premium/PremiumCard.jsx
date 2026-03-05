import React from 'react';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function PremiumCard({
  children,
  className,
  hover = true,
  glow = false,
  ...props
}) {
  const glowClasses = glow
    ? 'shadow-lg shadow-blue-500/20 dark:shadow-blue-400/10'
    : 'shadow-md';

  const content = (
    <Card
      className={cn(
        'border-slate-200/50 dark:border-slate-700/50 transition-all duration-300',
        glowClasses,
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );

  if (!hover) return content;

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="h-full"
    >
      {content}
    </motion.div>
  );
}