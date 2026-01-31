import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft,
  Search,
  FileCheck,
  FileText,
  Plus,
  Upload,
  Database,
  Zap,
  Menu,
  Grid3x3,
} from 'lucide-react';

export default function PhotonHeader({
  isAdmin,
  onToggleSidebar,
  showSidebar,
  isAICentricMode,
  onOpenUploadDialog,
  docsCount,
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 backdrop-blur-xl bg-gradient-to-r from-slate-900/80 to-slate-800/80 border-b border-slate-700/50"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            {isAICentricMode ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleSidebar}
                className="text-white hover:bg-slate-700/50 rounded-lg p-2 transition-colors"
              >
                {showSidebar ? (
                  <Grid3x3 className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </motion.button>
            ) : (
              <Link to={createPageUrl('Home')}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-white hover:bg-slate-700/50 rounded-lg p-2 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </motion.button>
              </Link>
            )}

            <div className="flex items-center gap-2 min-w-0">
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/66efc74e1_fiberoraclenew.png"
                alt="Fiber Oracle"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover shadow-lg"
              />
              <div className="hidden sm:block">
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent"
                >
                  P.H.O.T.O.N.
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xs text-slate-400"
                >
                  AI Technical Assistant
                </motion.p>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <Link to={createPageUrl('DocumentSearch')} className="hidden sm:inline-block">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-100 hover:bg-cyan-500/30 font-medium text-sm transition-all"
              >
                <Search className="h-4 w-4 inline mr-2" />
                <span className="hidden md:inline">Search</span>
              </motion.button>
            </Link>

            <Link to={createPageUrl('PhotonAuditLogs')} className="hidden lg:inline-block">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-400 text-blue-100 hover:bg-blue-500/30 font-medium text-sm transition-all"
              >
                <FileCheck className="h-4 w-4 inline mr-2" />
                <span className="hidden md:inline">Audit</span>
              </motion.button>
            </Link>

            {isAdmin && (
              <Link to={createPageUrl('DocumentReview')} className="hidden lg:inline-block">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-400 text-purple-100 hover:bg-purple-500/30 font-medium text-sm transition-all"
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  <span className="hidden md:inline">Review</span>
                </motion.button>
              </Link>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenUploadDialog}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-100 hover:bg-emerald-500/30 font-medium text-sm transition-all"
            >
              <Upload className="h-4 w-4 inline sm:mr-2" />
              <span className="hidden sm:inline">Add</span>
            </motion.button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700">
              <Database className="h-4 w-4 text-slate-400" />
              <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                {docsCount}
              </Badge>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}