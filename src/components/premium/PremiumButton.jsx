import React from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function PremiumButton({
  children,
  variant = 'default',
  size = 'default',
  className,
  isLoading = false,
  glow = false,
  animated = true,
  onClick,
  ...props
}) {
  const glowClasses = glow ? 'shadow-lg shadow-blue-500/50 dark:shadow-blue-400/30' : '';
  
  const content = (
    <Button
      variant={variant}
      size={size}
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        glowClasses,
        className
      )}
      onClick={onClick}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {/* Animated background shimmer effect */}
      {animated && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      )}
      
      <span className="relative flex items-center gap-2">
        {isLoading && (
          <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
        )}
        {children}
      </span>
    </Button>
  );

  return animated ? (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className="inline-block"
    >
      {content}
    </motion.div>
  ) : (
    content
  );
}