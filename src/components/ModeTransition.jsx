import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Grid3x3, Sparkles } from 'lucide-react';

export default function ModeTransition({ isTransitioning, mode, onComplete }) {
  React.useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning, onComplete]);

  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900"
        >
          <div className="text-center space-y-6">
            {/* Logo Animation */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-xl opacity-50"
                />
                <div className="relative bg-slate-900 rounded-full p-8">
                  <img 
                    src="https://ucarecdn.com/17a5eb5c-d020-483c-a1d1-a73d39b65e50/FiberOraclelogowithbgremoved.png" 
                    alt="Fiber Oracle Logo" 
                    className="w-32 h-32 object-contain"
                  />
                </div>
              </div>
            </motion.div>

            {/* Mode Indicator */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-center gap-3">
                {mode === 'ai' ? (
                  <>
                    <Sparkles className="w-6 h-6 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">AI-Powered Mode</h2>
                  </>
                ) : (
                  <>
                    <Grid3x3 className="w-6 h-6 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">Traditional Tools</h2>
                  </>
                )}
              </div>
              
              <p className="text-white/70 text-lg">
                {mode === 'ai' 
                  ? 'Loading P.H.O.T.O.N. AI Assistant...'
                  : 'Loading module library...'
                }
              </p>
            </motion.div>

            {/* Loading Animation */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.5 }}
              className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full max-w-xs mx-auto"
            />

            {/* Pulsing Dots */}
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                  className="w-2 h-2 rounded-full bg-white/50"
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}