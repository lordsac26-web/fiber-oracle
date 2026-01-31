import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

export default function PremiumDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogContent className={`backdrop-blur-md bg-slate-900/95 border-slate-700/50 ${className}`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader>
                <DialogTitle className="text-white text-lg font-bold">{title}</DialogTitle>
                {description && (
                  <DialogDescription className="text-slate-400">
                    {description}
                  </DialogDescription>
                )}
              </DialogHeader>
              <div className="mt-4">{children}</div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}