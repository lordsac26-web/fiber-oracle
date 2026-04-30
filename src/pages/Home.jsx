import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Calculator, Stethoscope, Sparkles, ImageIcon, BookOpen, Activity, Zap,
  Settings, ChevronRight, Wifi, WifiOff, Moon, Sun, Cable, GraduationCap,
  FileText, LayoutGrid, Eye, EyeOff, X, Check, FileSearch, FlaskConical,
  ClipboardList, Info, HelpCircle, TrendingUp, Zap as ZapIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUserPreferences } from '@/components/UserPreferencesContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import ModuleCard from '@/components/home/ModuleCard';

// ─── Data ────────────────────────────────────────────────────────────────────

const MODULES = [
  { id: 'opticalcalc', title: 'Optical Calculator', description: 'Link loss, PON power & dB converter', icon: Calculator, color: 'from-indigo-500 to-purple-600', page: 'OpticalCalculator', badge: 'Calculators', isNew: true },
  { id: 'powercalc', title: 'Power Calculator', description: 'Estimate ONT Rx power for GPON & XGS-PON', icon: Zap, color: 'from-emerald-500 to-teal-600', page: 'PowerLevelCalc', badge: 'Calculators' },
  { id: 'calculator', title: 'Loss Budget', description: 'Calculate total link loss (TIA-568-D)', icon: Calculator, color: 'from-blue-500 to-indigo-600', page: 'LossBudget', badge: 'Calculators' },
  { id: 'splitterloss', title: 'Splitter Loss', description: 'Instant loss values by split ratio', icon: Activity, color: 'from-purple-500 to-pink-600', page: 'SplitterLoss', badge: 'Calculators' },
  { id: 'bendradius', title: 'Bend Radius', description: 'Minimum bend radius by cable type', icon: Cable, color: 'from-amber-500 to-orange-600', page: 'BendRadius', badge: 'Calculators' },
  { id: 'calixsmx', title: 'Calix SMx ONT Analysis', description: 'NOC-style PON PM, LCP & utilization hub', icon: Activity, color: 'from-cyan-500 to-blue-700', page: 'CalixSmxAnalysis', badge: 'Testing', isNew: true },

  { id: 'olts', title: 'OLTS Tier-1', description: 'Method B bidirectional power testing', icon: Activity, color: 'from-emerald-500 to-teal-600', page: 'OLTSTest', badge: 'Testing' },
  { id: 'otdr', title: 'OTDR Tier-2', description: 'Bidirectional trace characterization', icon: Activity, color: 'from-indigo-500 to-purple-600', page: 'OTDRTest', badge: 'Testing' },
  { id: 'cleaning', title: 'Cleaning & Inspection', description: 'IEC 61300-3-35 procedures', icon: Sparkles, color: 'from-cyan-500 to-blue-600', page: 'Cleaning', badge: 'Testing' },
  { id: 'doctor', title: 'Fiber Doctor', description: 'Interactive troubleshooting flowchart', icon: Stethoscope, color: 'from-rose-500 to-pink-600', page: 'FiberDoctor', badge: 'Troubleshoot' },
  { id: 'otdranalysis', title: 'AI OTDR Analysis', description: 'AI-powered trace diagnostics', icon: FileSearch, color: 'from-purple-600 to-indigo-700', page: 'OTDRAnalysis', badge: 'Troubleshoot', isBeta: true },
  { id: 'impairments', title: 'Impairment Library', description: 'Visual defect reference guide', icon: ImageIcon, color: 'from-violet-500 to-purple-600', page: 'Impairments', badge: 'Troubleshoot' },
  { id: 'fiberlocator', title: 'Fiber Locator', description: 'TIA-598 color code identifier', icon: Cable, color: 'from-orange-500 to-amber-600', page: 'FiberLocator', badge: 'Reference' },
  { id: 'pon', title: 'PON Power Levels', description: 'GPON & XGS-PON specifications', icon: Activity, color: 'from-cyan-500 to-blue-600', page: 'PONLevels', badge: 'Reference' },
  { id: 'tables', title: 'Reference Tables', description: 'Attenuation, connectors, splices & more', icon: BookOpen, color: 'from-slate-500 to-gray-600', page: 'ReferenceTables', badge: 'Reference' },

  { id: 'kmlparser', title: 'KML/KMZ Parser', description: 'Extract GPS coordinates from Google Earth', icon: FileText, color: 'from-emerald-500 to-teal-600', page: 'KMLParser', badge: 'Reference', isNew: true },
  { id: 'links', title: 'Industry Links', description: 'Vendors, standards & resources', icon: BookOpen, color: 'from-gray-500 to-slate-600', page: 'IndustryLinks', badge: 'Reference' },
  { id: 'education', title: 'Education Center', description: 'Fiber 101, 102, 103 courses', icon: GraduationCap, color: 'from-green-500 to-emerald-600', page: 'Education', badge: 'Learn' },
  { id: 'userguide', title: 'User Guide', description: 'Complete how-to documentation', icon: BookOpen, color: 'from-blue-500 to-indigo-600', page: 'UserGuide', badge: 'Learn' },
  { id: 'jobreports', title: 'Job Reports', description: 'Track & document fiber jobs', icon: ClipboardList, color: 'from-slate-500 to-gray-600', page: 'JobReports', badge: 'Testing' },
];

const QUICK_REFS = [
  { label: 'SMF @1310nm', value: '0.35 dB/km' },
  { label: 'SMF @1550nm', value: '0.25 dB/km' },
  { label: 'Elite Connector', value: '≤0.15 dB' },
  { label: 'Fusion Splice', value: '≤0.10 dB' },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'Calculators', label: 'Calculate', icon: Calculator, description: 'Loss budgets, power levels & conversions' },
  { id: 'Testing', label: 'Test', icon: Activity, description: 'OLTS, OTDR & inspection procedures' },
  { id: 'Troubleshoot', label: 'Troubleshoot', icon: Stethoscope, description: 'Diagnostics & problem solving' },
  { id: 'Reference', label: 'Reference', icon: BookOpen, description: 'Standards, specs & lookup tables' },
  { id: 'Learn', label: 'Learn', icon: GraduationCap, description: 'Courses & documentation' },
];

const CATEGORY_COLORS = {
  Calculators: 'from-blue-500 to-indigo-600',
  Testing: 'from-emerald-500 to-teal-600',
  Troubleshoot: 'from-rose-500 to-pink-600',
  Reference: 'from-slate-500 to-gray-600',
  Learn: 'from-green-500 to-emerald-600',
};

// ─── Scroll-fade hook ─────────────────────────────────────────────────────────
function useFadeInOnScroll() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function FadeSection({ children, className = '' }) {
  const [ref, visible] = useFadeInOnScroll();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);

  const { preferences, updatePreferences } = useUserPreferences();
  const darkMode = preferences.darkMode;
  const hiddenModules = preferences.hiddenModules || [];

  useEffect(() => {
    const t = setTimeout(() => setHeaderVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const toggleModuleVisibility = (moduleId) => {
    const newHidden = hiddenModules.includes(moduleId)
      ? hiddenModules.filter((id) => id !== moduleId)
      : [...hiddenModules, moduleId];
    updatePreferences({ hiddenModules: newHidden });
  };

  const setDarkMode = (value) => updatePreferences({ darkMode: value });

  const visibleModules = useMemo(() => MODULES.filter((m) => {
    return !hiddenModules.includes(m.id) && (!m.requiresPreference || preferences[m.requiresPreference]);
  }), [hiddenModules, preferences]);

  const filteredModules = useMemo(() => (
    selectedCategory === 'all'
      ? visibleModules
      : visibleModules.filter((m) => m.badge === selectedCategory)
  ), [selectedCategory, visibleModules]);

  const groupedModules = useMemo(() => (
    CATEGORIES.filter((c) => c.id !== 'all').reduce((acc, cat) => {
      acc[cat.id] = visibleModules.filter((m) => m.badge === cat.id);
      return acc;
    }, {})
  ), [visibleModules]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-950' : 'bg-white'}`}>
      {/* ── Header ── */}
      <header className={`sticky top-0 z-50 backdrop-blur-2xl border-b transition-colors ${darkMode ? 'bg-slate-950/80 border-slate-800/50' : 'bg-white/80 border-slate-200/50'}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/66efc74e1_fiberoraclenew.png"
                alt="Fiber Oracle"
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div>
                <h1 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Fiber Oracle</h1>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Fiber Intelligence Suite</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`hidden md:flex text-xs gap-1 ${isOnline ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/40 text-amber-400 bg-amber-500/10'}`}>
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isOnline ? 'Online' : 'Offline'}
              </Badge>

              <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
                <DialogTrigger asChild>
                  <button className={`h-10 w-10 rounded-lg transition-all hidden md:flex items-center justify-center ${darkMode ? 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'}`}>
                    <Eye className="h-4.5 w-4.5" />
                  </button>
                </DialogTrigger>
                <DialogContent className={`max-w-md max-h-[80vh] overflow-y-auto ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white'}`}>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Eye className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-blue-600'}`} /> Customize Modules
                    </DialogTitle>
                    <DialogDescription className={darkMode ? 'text-slate-400' : ''}>
                      Toggle modules on/off to customize your dashboard.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-1 mt-2">
                    {MODULES.map((module) => (
                      <div key={module.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${hiddenModules.includes(module.id) ? `${darkMode ? 'bg-slate-800' : 'bg-slate-100'} opacity-50` : `${darkMode ? 'bg-slate-800' : 'bg-slate-50'}`}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center`}>
                            <module.icon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{module.title}</p>
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{module.badge}</p>
                          </div>
                        </div>
                        <Switch checked={!hiddenModules.includes(module.id)} onCheckedChange={() => toggleModuleVisibility(module.id)} />
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              <button onClick={() => setDarkMode(!darkMode)} className={`h-10 w-10 rounded-lg transition-all flex items-center justify-center ${darkMode ? 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'}`}>
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <Link to={createPageUrl('Settings')}>
                <button className={`h-10 w-10 rounded-lg transition-all hidden md:flex items-center justify-center ${darkMode ? 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'}`}>
                  <Settings className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className={`relative overflow-hidden ${darkMode ? 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950' : 'bg-gradient-to-b from-slate-50 via-white to-white'}`}>
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 ${darkMode ? 'bg-cyan-500' : 'bg-blue-300'}`} />
          <div className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 ${darkMode ? 'bg-purple-500' : 'bg-purple-300'}`} />
        </div>

        <div className={`relative max-w-7xl mx-auto px-4 lg:px-8 py-24 md:py-32 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <div className="inline-block">
              <Badge className={`${darkMode ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' : 'bg-blue-100 text-blue-700 border-blue-300'} border px-4 py-2`}>
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                Fiber Intelligence Suite
              </Badge>
            </div>

            <h1 className={`text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              When You Need to Know,
              <br />
              <span className={`bg-clip-text text-transparent bg-gradient-to-r ${darkMode ? 'from-cyan-400 to-purple-500' : 'from-blue-600 to-purple-600'}`}>
                Ask the Oracle
              </span>
            </h1>

            <p className={`text-lg md:text-xl max-w-2xl mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Professional-grade fiber optic calculators, diagnostics, and reference tools. Built for field engineers, NOC technicians, and installers.
            </p>

            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Link to={createPageUrl('OpticalCalculator')}>
                <Button size="lg" className={`${darkMode ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
                  <ZapIcon className="h-5 w-5 mr-2" />
                  Launch Calculator
                </Button>
              </Link>
              <Link to={createPageUrl('Settings')}>
                <Button size="lg" variant="outline" className={darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}>
                  Explore All Tools
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Reference Bar ── */}
      <section className={`relative ${darkMode ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <FadeSection>
            <div className={`rounded-2xl backdrop-blur-xl border p-6 ${darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white/50 border-slate-200/50'}`}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Quick Reference</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {QUICK_REFS.map((ref, i) => (
                  <div key={i} className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{ref.label}</p>
                    <p className={`text-sm font-mono font-bold mt-1 ${darkMode ? 'text-cyan-300' : 'text-blue-600'}`}>{ref.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── Category Filter ── */}
      <section className={`${darkMode ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <FadeSection>
            <div className="hidden md:flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const count = cat.id === 'all' ? visibleModules.length : visibleModules.filter((m) => m.badge === cat.id).length;
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 border ${active
                      ? darkMode
                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-600/20 border-cyan-400/50 text-cyan-300'
                        : 'bg-blue-600 border-blue-700 text-white'
                      : darkMode
                        ? 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <cat.icon className="h-4 w-4" />
                    {cat.label}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${active ? (darkMode ? 'bg-cyan-400/20 text-cyan-300' : 'bg-white/30 text-white') : (darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500')}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── Module Grid ── */}
      <section className={`${darkMode ? 'bg-slate-950' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 space-y-8">
          {selectedCategory === 'all' ? (
            CATEGORIES.filter((c) => c.id !== 'all').map((category) => {
              const mods = groupedModules[category.id];
              if (!mods || mods.length === 0) return null;
              return (
                <FadeSection key={category.id}>
                  <section id={`section-${category.id}`}>
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${CATEGORY_COLORS[category.id]} flex items-center justify-center`}>
                          <category.icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{category.label}</h2>
                          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{category.description}</p>
                        </div>
                        <Badge variant="outline" className={`ml-auto ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100'}`}>
                          {mods.length} tools
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {mods.map((module) => (
                          <ModuleCard key={module.id} module={module} compact darkMode={darkMode} />
                        ))}
                      </div>
                    </div>
                  </section>
                </FadeSection>
              );
            })
          ) : (
            <>
              <FadeSection>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredModules.map((module) => (
                    <ModuleCard key={module.id} module={module} compact={false} darkMode={darkMode} />
                  ))}
                </div>
              </FadeSection>

              {filteredModules.length === 0 && (
                <FadeSection>
                  <div className="text-center py-16">
                    <EyeOff className={`h-12 w-12 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>No modules visible</h3>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      All modules in this category are hidden.
                    </p>
                  </div>
                </FadeSection>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <section className={`border-t ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Standards</p>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>TIA-568-D, TIA-526-14-C, IEC 61300, IEEE 802.3</p>
            </div>
            <div>
              <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Data</p>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{visibleModules.length} tools available</p>
            </div>
            <div>
              <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Version</p>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>2.0.0 • Updated 2026</p>
            </div>
          </div>
          <div className={`pt-6 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <p className={`text-center text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Fiber Oracle © 2026 • All standards current as of publication date
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}