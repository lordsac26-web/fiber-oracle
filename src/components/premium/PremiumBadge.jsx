import React from 'react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function PremiumBadge({
  children,
  variant = 'default',
  className,
  pulse = false,
  animated = true,
  icon: Icon = null,
  ...props
}) {
  const pulseClasses = pulse ? 'animate-pulse' : '';

  const content = (
    <Badge
      variant={variant}
      className={cn(
        'relative overflow-hidden font-medium',
        pulseClasses,
        className
      )}
      {...props}
    >
      <span className="relative flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {children}
      </span>
    </Badge>
  );

  return animated ? (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="inline-block"
    >
      {content}
    </motion.div>
  ) : (
    content
  );
}