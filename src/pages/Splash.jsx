import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Calculator, 
  Stethoscope, 
  GraduationCap, 
  Activity,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';

const FEATURES = [
  { icon: Calculator, label: 'Loss Budget Calculator', color: 'text-blue-500' },
  { icon: Zap, label: 'Power Level Estimator', color: 'text-emerald-500' },
  { icon: Stethoscope, label: 'Fiber Doctor Diagnostics', color: 'text-rose-500' },
  { icon: Activity, label: 'OTDR & OLTS Testing', color: 'text-purple-500' },
  { icon: GraduationCap, label: 'Certification Training', color: 'text-amber-500' },
];

export default function Splash() {
  const handleLogin = () => {
    base44.auth.redirectToLogin('/Home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/1652e0384_oracle.jpg" 
              alt="Fiber Oracle" 
              className="w-32 h-32 md:w-40 md:h-40 rounded-3xl object-cover shadow-2xl mx-auto ring-4 ring-white/20"
            />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-4xl md:text-6xl font-bold text-white mb-4"
          >
            Fiber Oracle
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-xl md:text-2xl text-blue-200 mb-2"
          >
            When you need to know, ask the Oracle.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-gray-400 mb-8 max-w-xl mx-auto space-y-4"
          >
            <p>
              The complete FTTH & PON technician toolkit — calculators, diagnostics, testing guides, and certification training.
            </p>
            <div className="text-left bg-white/5 rounded-xl p-5 border border-white/10 text-sm space-y-3">
              <p className="text-gray-300">
                <span className="text-blue-400 font-semibold">Purpose:</span> A comprehensive field reference and training platform for fiber optic installation, testing, and troubleshooting.
              </p>
              <p className="text-gray-300">
                <span className="text-blue-400 font-semibold">Audience:</span> FTTH technicians, network installers, field engineers, and anyone working with GPON/XGS-PON systems.
              </p>
              <p className="text-gray-300">
                <span className="text-blue-400 font-semibold">Built From:</span> Industry standards including TIA-568-D, TIA-526-14-C, IEC 61300-3-35, ITU-T G.984/G.9807, and real-world technician workflows.
              </p>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button 
              onClick={handleLogin}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-8 py-6 text-lg rounded-xl shadow-xl shadow-blue-500/25 group"
            >
              Sign In
              <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Link to={createPageUrl('Brochure')}>
              <Button 
                variant="outline"
                size="lg"
                className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                Learn More
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 w-full max-w-4xl mx-auto"
        >
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {FEATURES.map((feature, idx) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.9 + idx * 0.1 }}
              >
                <Badge 
                  variant="outline" 
                  className="px-4 py-2 bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors cursor-default"
                >
                  <feature.icon className={`h-4 w-4 mr-2 ${feature.color}`} />
                  {feature.label}
                </Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="relative z-10 text-center py-6 text-gray-500 text-sm"
      >
        <p>© {new Date().getFullYear()} Fiber Oracle. Built for fiber technicians.</p>
      </motion.footer>
    </div>
  );
}