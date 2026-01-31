import React from 'react';
import { motion } from 'framer-motion';

export default function AnimatedLoader({ size = 'md', label = null }) {
  const sizeMap = {
    sm: { container: 'w-8 h-8', dot: 'w-1.5 h-1.5' },
    md: { container: 'w-12 h-12', dot: 'w-2 h-2' },
    lg: { container: 'w-16 h-16', dot: 'w-2.5 h-2.5' }
  };

  const { container, dot } = sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${container} relative`}>
        {/* Outer rotating ring */}
        <motion.div
          className="absolute inset-0 border-2 border-transparent border-t-blue-500 border-r-blue-400 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />

        {/* Inner pulsing orb */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-2 h-2 bg-blue-500 rounded-full blur-sm" />
        </motion.div>

        {/* Rotating dots around the circle */}
        {[0, 120, 240].map((angle) => (
          <motion.div
            key={angle}
            className={`absolute ${dot} bg-blue-400 rounded-full`}
            style={{
              top: '50%',
              left: '50%',
              transformOrigin: `calc(-${size === 'sm' ? 12 : size === 'md' ? 18 : 24}px) 0`,
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </div>

      {label && (
        <motion.p
          className="text-sm text-gray-500 dark:text-gray-400 font-medium"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}