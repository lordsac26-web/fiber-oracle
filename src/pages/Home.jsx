import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  Stethoscope, 
  Sparkles, 
  ImageIcon, 
  BookOpen, 
  Activity,
  Zap,
  Settings,
  ChevronRight,
  Wifi,
  WifiOff,
  Moon,
  Sun,
  Cable
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

const MODULES = [
  {
    id: 'calculator',
    title: 'Loss Budget Calculator',
    description: 'Calculate link loss with TIA-568-D values',
    icon: Calculator,
    color: 'from-blue-500 to-indigo-600',
    page: 'LossBudget',
    badge: 'Core'
  },
  {
    id: 'fiberlocator',
    title: 'Fiber Locator',
    description: 'TIA-598 color code fiber identifier',
    icon: Zap,
    color: 'from-purple-500 to-pink-600',
    page: 'FiberLocator',
    badge: 'Core'
  },
  {
    id: 'olts',
    title: 'OLTS Tier-1 Wizard',
    description: 'Method B bidirectional testing',
    icon: Activity,
    color: 'from-emerald-500 to-teal-600',
    page: 'OLTSTest',
    badge: 'Core'
  },
  {
    id: 'doctor',
    title: 'Fiber Doctor',
    description: 'Symptom-based troubleshooting flowchart',
    icon: Stethoscope,
    color: 'from-rose-500 to-pink-600',
    page: 'FiberDoctor',
    badge: 'Core'
  },
  {
    id: 'cleaning',
    title: 'Cleaning & Inspection',
    description: 'IEC 61300-3-35 procedures with checklists',
    icon: Sparkles,
    color: 'from-cyan-500 to-blue-600',
    page: 'Cleaning',
    badge: 'Core'
  },
  {
    id: 'impairments',
    title: 'Impairment Library',
    description: 'Visual reference for scope & OTDR defects',
    icon: ImageIcon,
    color: 'from-violet-500 to-purple-600',
    page: 'Impairments',
    badge: 'Reference'
  },
  {
    id: 'tables',
    title: 'Reference Tables',
    description: 'Attenuation, connectors, splices, standards',
    icon: BookOpen,
    color: 'from-amber-500 to-orange-600',
    page: 'ReferenceTables',
    badge: 'Reference'
  },
  {
    id: 'pon',
    title: 'PON Power Levels',
    description: 'GPON & XGS-PON acceptable levels',
    icon: Activity,
    color: 'from-cyan-500 to-blue-600',
    page: 'PONLevels',
    badge: 'Reference'
  },
  {
    id: 'lcp',
    title: 'LCP / CLCP Info',
    description: 'Cabinet & splitter reference lookup',
    icon: Cable,
    color: 'from-slate-500 to-gray-600',
    page: 'LCPInfo',
    badge: 'Tools'
  },
  {
    id: 'links',
    title: 'Industry Links',
    description: 'Vendors, manufacturers, training resources',
    icon: Zap,
    color: 'from-teal-500 to-cyan-600',
    page: 'IndustryLinks',
    badge: 'Resources'
  },
];

const QUICK_REFS = [
  { label: 'SMF @1310nm', value: '0.35 dB/km' },
  { label: 'SMF @1550nm', value: '0.25 dB/km' },
  { label: 'Elite Connector', value: '≤0.15 dB' },
  { label: 'Fusion Splice', value: '≤0.10 dB' },
  { label: 'UPC Reflectance', value: '<-50 dB' },
  { label: 'APC Reflectance', value: '<-60 dB' },
];

const STANDARDS_LINKS = {
  'TIA-568-D': 'https://tiaonline.org/what-we-do/standards/',
  'TIA-526-14-C': 'https://tiaonline.org/what-we-do/standards/',
  'IEC 61300': 'https://webstore.iec.ch/publication/5191',
  'IEEE 802.3': 'https://standards.ieee.org/ieee/802.3/10422/',
  'ITU-T G.652/G.657': 'https://www.itu.int/rec/T-REC-G.652',
  'Telcordia GR-326': 'https://telecom-info.njdepot.ericsson.net/site-cgi/ido/docs.cgi?ID=SEARCH&DOCUMENT=GR-326'
};

export default function Home() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">FiberTech Pro</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Field Reference Tool v2.0</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className={`${isOnline ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-amber-300 text-amber-700 bg-amber-50'}`}
              >
                {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setDarkMode(!darkMode)}
                className="rounded-full"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              
              <Link to={createPageUrl('Settings')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Quick Reference Bar */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-3 min-w-max">
            {QUICK_REFS.map((ref, i) => (
              <div 
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <span className="text-xs text-gray-500">{ref.label}</span>
                <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{ref.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={createPageUrl(module.page)}>
                <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer bg-white dark:bg-gray-800">
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                  
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center shadow-lg`}>
                        <module.icon className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {module.badge}
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {module.description}
                    </p>
                    
                    <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Open Tool
                      <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Standards Footer */}
        <div className="mt-8 p-6 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur border border-gray-200/50 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Reference Standards</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(STANDARDS_LINKS).map(([std, url]) => (
              <a key={std} href={url} target="_blank" rel="noopener noreferrer">
                <Badge variant="outline" className="bg-white dark:bg-gray-700 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors">
                  {std}
                </Badge>
              </a>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Click standards to view official documentation. All values based on 2024-2025 industry standards.
          </p>
        </div>

        {/* App Info */}
        <div className="text-center py-6">
          <p className="text-xs text-gray-400">
            FiberTech Pro © 2025 • Built for fiber optic professionals
          </p>
          <p className="text-xs text-gray-400 mt-1">
            All calculations use industry-standard values from TIA, IEEE, IEC, and ITU-T
          </p>
        </div>
      </main>
    </div>
  );
}