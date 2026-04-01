import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Calculator, Stethoscope, Sparkles, ImageIcon, BookOpen, Activity, Zap,
  Settings, ChevronRight, Wifi, WifiOff, Moon, Sun, Cable, GraduationCap,
  FileText, LayoutGrid, Eye, EyeOff, X, Check, FileSearch, FlaskConical,
  ClipboardList, Info, HelpCircle, Smartphone, TrendingUp
} from 'lucide-react';
import OnboardingTour from '@/components/OnboardingTour';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BottomNavigationBar from '@/components/BottomNavigationBar';
import SyncStatusIndicator from '@/components/SyncStatusIndicator';
import { useUserPreferences } from '@/components/UserPreferencesContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import AnimatedBackground from '@/components/AnimatedBackground';
import ModuleCard from '@/components/home/ModuleCard';

// ─── Data ────────────────────────────────────────────────────────────────────

const MODULES = [
  { id: 'opticalcalc', title: 'Optical Calculator', description: 'Link loss, PON power & dB converter', icon: Calculator, color: 'from-indigo-500 to-purple-600', page: 'OpticalCalculator', badge: 'Calculators', isNew: true },
  { id: 'powercalc', title: 'Power Calculator', description: 'Estimate ONT Rx power for GPON & XGS-PON', icon: Zap, color: 'from-emerald-500 to-teal-600', page: 'PowerLevelCalc', badge: 'Calculators' },
  { id: 'calculator', title: 'Loss Budget', description: 'Calculate total link loss (TIA-568-D)', icon: Calculator, color: 'from-blue-500 to-indigo-600', page: 'LossBudget', badge: 'Calculators' },
  { id: 'splitterloss', title: 'Splitter Loss', description: 'Instant loss values by split ratio', icon: Activity, color: 'from-purple-500 to-pink-600', page: 'SplitterLoss', badge: 'Calculators' },
  { id: 'bendradius', title: 'Bend Radius', description: 'Minimum bend radius by cable type', icon: Cable, color: 'from-amber-500 to-orange-600', page: 'BendRadius', badge: 'Calculators' },
  { id: 'ponpm', title: 'PON PM Analysis', description: 'Parse & analyze SMx PM exports', icon: FileText, color: 'from-cyan-500 to-blue-600', page: 'PONPMAnalysis', badge: 'Testing', isNew: true },
  { id: 'olts', title: 'OLTS Tier-1', description: 'Method B bidirectional power testing', icon: Activity, color: 'from-emerald-500 to-teal-600', page: 'OLTSTest', badge: 'Testing' },
  { id: 'otdr', title: 'OTDR Tier-2', description: 'Bidirectional trace characterization', icon: Activity, color: 'from-indigo-500 to-purple-600', page: 'OTDRTest', badge: 'Testing' },
  { id: 'cleaning', title: 'Cleaning & Inspection', description: 'IEC 61300-3-35 procedures', icon: Sparkles, color: 'from-cyan-500 to-blue-600', page: 'Cleaning', badge: 'Testing' },
  { id: 'photon', title: 'P.H.O.T.O.N.', description: 'Under construction — AI assistant coming soon', icon: Zap, color: 'from-cyan-400 to-blue-600', page: 'PhotonChat', badge: 'Troubleshoot', isUnderConstruction: true },
  { id: 'fieldmode', title: 'Field Mode', description: 'Mobile-optimized tools for technicians', icon: Smartphone, color: 'from-violet-500 to-purple-600', page: 'FieldMode', badge: 'Troubleshoot', isNew: true, requiresPreference: 'fieldModeEnabled' },
  { id: 'doctor', title: 'Fiber Doctor', description: 'Interactive troubleshooting flowchart', icon: Stethoscope, color: 'from-rose-500 to-pink-600', page: 'FiberDoctor', badge: 'Troubleshoot' },
  { id: 'otdranalysis', title: 'AI OTDR Analysis', description: 'AI-powered trace diagnostics', icon: FileSearch, color: 'from-purple-600 to-indigo-700', page: 'OTDRAnalysis', badge: 'Troubleshoot', isBeta: true },
  { id: 'impairments', title: 'Impairment Library', description: 'Visual defect reference guide', icon: ImageIcon, color: 'from-violet-500 to-purple-600', page: 'Impairments', badge: 'Troubleshoot' },
  { id: 'fiberlocator', title: 'Fiber Locator', description: 'TIA-598 color code identifier', icon: Cable, color: 'from-orange-500 to-amber-600', page: 'FiberLocator', badge: 'Reference' },
  { id: 'pon', title: 'PON Power Levels', description: 'GPON & XGS-PON specifications', icon: Activity, color: 'from-cyan-500 to-blue-600', page: 'PONLevels', badge: 'Reference' },
  { id: 'tables', title: 'Reference Tables', description: 'Attenuation, connectors, splices & more', icon: BookOpen, color: 'from-slate-500 to-gray-600', page: 'ReferenceTables', badge: 'Reference' },
  { id: 'lcp', title: 'LCP / CLCP Info', description: 'Cabinet & splitter database', icon: Cable, color: 'from-teal-500 to-cyan-600', page: 'LCPInfo', badge: 'Reference' },
  { id: 'capacityplanning', title: 'Splitter Utilization', description: 'LCP/CLCP capacity & remaining ports', icon: TrendingUp, color: 'from-orange-500 to-red-600', page: 'CapacityPlanning', badge: 'Reference', isNew: true },
  { id: 'kmlparser', title: 'KML/KMZ Parser', description: 'Extract GPS coordinates from Google Earth', icon: FileText, color: 'from-emerald-500 to-teal-600', page: 'KMLParser', badge: 'Reference', isNew: true },
  { id: 'links', title: 'Industry Links', description: 'Vendors, standards & resources', icon: BookOpen, color: 'from-gray-500 to-slate-600', page: 'IndustryLinks', badge: 'Reference' },
  { id: 'education', title: 'Education Center', description: 'Fiber 101, 102, 103 courses', icon: GraduationCap, color: 'from-green-500 to-emerald-600', page: 'Education', badge: 'Learn' },
  { id: 'userguide', title: 'User Guide', description: 'Complete how-to documentation', icon: BookOpen, color: 'from-blue-500 to-indigo-600', page: 'UserGuide', badge: 'Learn' },
  { id: 'offline', title: 'Offline Documents', description: 'Saved PDFs for offline access', icon: FileText, color: 'from-slate-500 to-gray-600', page: 'OfflineDocuments', badge: 'Reference' },
  { id: 'jobreports', title: 'Job Reports', description: 'Track & document fiber jobs', icon: ClipboardList, color: 'from-slate-500 to-gray-600', page: 'JobReports', badge: 'Testing' },
];

const QUICK_REFS = [
  { label: 'SMF @1310nm', value: '0.35 dB/km' },
  { label: 'SMF @1550nm', value: '0.25 dB/km' },
  { label: 'Elite Connector', value: '≤0.15 dB' },
  { label: 'Fusion Splice', value: '≤0.10 dB' },
  { label: 'UPC Reflectance', value: '<-50 dB' },
  { label: 'APC Reflectance', value: '<-60 dB' },
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
  const [showTour, setShowTour] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);

  const { preferences, updatePreferences } = useUserPreferences();
  const darkMode = preferences.darkMode;
  const hiddenModules = preferences.hiddenModules || [];
  const hasSeenTour = preferences.hasSeenTour || false;

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setHeaderVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hasSeenTour) {
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour]);

  const handleTourComplete = () => { setShowTour(false); updatePreferences({ hasSeenTour: true }); };
  const handleTourClose = () => { setShowTour(false); updatePreferences({ hasSeenTour: true }); };

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tour') === '1') {
      setShowTour(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
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
    <div className={`min-h-screen relative overflow-x-hidden ${darkMode ? '' : 'bg-slate-100'}`} style={darkMode ? { background: '#07071a' } : {}}>
      {/* Animated canvas background — only in dark mode */}
      {darkMode && <AnimatedBackground />}

      {/* ── Header ── */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b shadow-sm ${darkMode ? 'bg-black/30 border-white/10 shadow-[0_1px_0_rgba(0,240,255,0.08)]' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2.5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/66efc74e1_fiberoraclenew.png"
                alt="Fiber Oracle"
                width="56"
                height="56"
                fetchPriority="high"
                className="rounded-xl w-14 h-14 object-cover shadow-[0_0_14px_rgba(0,240,255,0.25)]"
              />
              <div>
                <h1 className={`text-base md:text-lg font-bold tracking-wide ${darkMode ? 'text-white' : 'text-slate-900'}`} style={{ letterSpacing: '0.04em' }}>
                  Fiber Oracle
                </h1>
                <p className={`text-[11px] hidden sm:block ${darkMode ? 'text-cyan-400/70' : 'text-slate-500'}`}>When you need to know, ask the Oracle.</p>
              </div>
            </div>

            {/* Desktop quick refs */}
            <div className="hidden lg:flex items-center gap-2.5 flex-1 justify-center max-w-2xl mx-8">
              {QUICK_REFS.slice(0, 4).map((ref, i) => (
                <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                  <span className={`text-[10px] uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{ref.label}</span>
                  <span className={`text-[11px] font-mono font-bold ${darkMode ? 'text-cyan-300' : 'text-blue-700'}`}>{ref.value}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 md:gap-1.5">
              <Badge
                variant="outline"
                className={`hidden md:flex text-xs gap-1 border ${isOnline ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/40 text-amber-400 bg-amber-500/10'}`}
              >
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isOnline ? 'Online' : 'Offline'}
              </Badge>

              {/* Customize */}
              <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
                <DialogTrigger asChild>
                  <button aria-label="Customize modules" className="h-11 w-11 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition-all hidden md:flex items-center justify-center" title="Customize modules">
                    <Eye className="h-4.5 w-4.5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-slate-900 border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                      <Eye className="h-5 w-5 text-cyan-400" /> Customize Modules
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Toggle modules on/off to customize your dashboard.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-1 mt-2">
                    {MODULES.map((module) => (
                      <div key={module.id} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${hiddenModules.includes(module.id) ? 'bg-white/5 opacity-50' : 'bg-white/8 border border-white/10'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center`}>
                            <module.icon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-white">{module.title}</p>
                            <p className="text-xs text-slate-400">{module.badge}</p>
                          </div>
                        </div>
                        <Switch checked={!hiddenModules.includes(module.id)} onCheckedChange={() => toggleModuleVisibility(module.id)} />
                      </div>
                    ))}
                  </div>
                  {hiddenModules.length > 0 && (
                    <Button variant="outline" className="w-full mt-4 border-white/20 text-white hover:bg-white/10" onClick={() => updatePreferences({ hiddenModules: [] })}>
                      Show All Modules
                    </Button>
                  )}
                </DialogContent>
              </Dialog>

              <button aria-label="Toggle theme" onClick={() => setDarkMode(!darkMode)} title="Toggle theme"
                className={`h-11 w-11 rounded-lg transition-all flex items-center justify-center ${darkMode ? 'text-slate-400 hover:text-cyan-300 hover:bg-white/10' : 'text-slate-600 hover:text-blue-700 hover:bg-slate-200'}`}>
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button aria-label="Start app tour" onClick={() => setShowTour(true)} title="Start Tour"
                className={`h-11 w-11 rounded-lg transition-all hidden md:flex items-center justify-center ${darkMode ? 'text-slate-400 hover:text-cyan-300 hover:bg-white/10' : 'text-slate-600 hover:text-blue-700 hover:bg-slate-200'}`}>
                <HelpCircle className="h-4 w-4" />
              </button>

              <Link to={createPageUrl('Brochure')} className="hidden md:block">
                <button aria-label="About Fiber Oracle" className={`h-11 w-11 rounded-lg transition-all flex items-center justify-center ${darkMode ? 'text-slate-400 hover:text-cyan-300 hover:bg-white/10' : 'text-slate-600 hover:text-blue-700 hover:bg-slate-200'}`} title="About">
                  <Info className="h-4 w-4" />
                </button>
              </Link>

              <Link to={createPageUrl('Settings')} className="hidden md:block">
                <button aria-label="Open settings" className={`h-11 w-11 rounded-lg transition-all flex items-center justify-center ${darkMode ? 'text-slate-400 hover:text-cyan-300 hover:bg-white/10' : 'text-slate-600 hover:text-blue-700 hover:bg-slate-200'}`} title="Settings">
                  <Settings className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6 pb-24 md:pb-10">

        {/* Hero tagline — fade in on mount */}
        <div className={`text-center py-4 md:py-6 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className={`text-2xl md:text-4xl font-bold tracking-tight mb-2 bg-clip-text text-transparent ${darkMode ? 'bg-gradient-to-r from-cyan-400 to-purple-500' : 'bg-gradient-to-r from-blue-700 to-violet-600'}`}>
            Fiber Oracle Intelligence Suite
          </h2>
          <p className={`text-sm md:text-base max-w-xl mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Calculators, diagnostics, and reference tools — built for the field.
          </p>
        </div>

        <div className="flex justify-center">
          <SyncStatusIndicator compact />
        </div>

        {/* Category filter pills */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => {
              const count = cat.id === 'all' ? visibleModules.length : visibleModules.filter((m) => m.badge === cat.id).length;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border
                    ${active
                      ? darkMode
                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-600/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                        : 'bg-blue-600 border-blue-700 text-white shadow-md'
                      : darkMode
                        ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? (darkMode ? 'bg-cyan-400/20 text-cyan-300' : 'bg-white/30 text-white') : (darkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {(hiddenModules.length > 0 || Object.values(preferences.hiddenSections || {}).some((arr) => arr.length > 0)) && (
            <Link to={createPageUrl('Settings') + '?tab=visibility'}>
              <Badge variant="outline" className="text-xs cursor-pointer border-amber-400/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20">
                <EyeOff className="h-3 w-3 mr-1" />
                {hiddenModules.length > 0 && `${hiddenModules.length} modules`}
                {hiddenModules.length > 0 && Object.values(preferences.hiddenSections || {}).some((arr) => arr.length > 0) && ' + '}
                {Object.values(preferences.hiddenSections || {}).some((arr) => arr.length > 0) &&
                  `${Object.values(preferences.hiddenSections || {}).reduce((sum, arr) => sum + arr.length, 0)} sections`}
                {' hidden'}
              </Badge>
            </Link>
          )}
        </div>

        {/* Module grid */}
        {selectedCategory === 'all' ? (
          <div className="space-y-8 md:space-y-10">
            {CATEGORIES.filter((c) => c.id !== 'all').map((category) => {
              const mods = groupedModules[category.id];
              if (!mods || mods.length === 0) return null;
              return (
                <FadeSection key={category.id}>
                  <section id={`section-${category.id}`} className="scroll-mt-20">
                    {/* Category header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${CATEGORY_COLORS[category.id]} flex items-center justify-center shadow-md`}>
                        <category.icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h2 className={`text-base md:text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{category.label}</h2>
                        <p className={`text-xs hidden sm:block ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{category.description}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <div className={`h-px flex-1 min-w-[40px] bg-gradient-to-r to-transparent ${darkMode ? 'from-white/10' : 'from-slate-200'}`} />
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${darkMode ? 'text-slate-500 border-white/10' : 'text-slate-500 border-slate-200 bg-white'}`}>{mods.length}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
                      {mods.map((module) => (
                        <ModuleCard key={module.id} module={module} compact darkMode={darkMode} />
                      ))}
                    </div>
                  </section>
                </FadeSection>
              );
            })}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {filteredModules.map((module) => (
                <ModuleCard key={module.id} module={module} compact={false} darkMode={darkMode} />
              ))}
            </div>
            {filteredModules.length === 0 && (
              <div className="text-center py-16">
                <EyeOff className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-400">No modules visible</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {hiddenModules.length > 0 ? 'All modules in this category are hidden.' : 'No modules match this category.'}
                </p>
                {hiddenModules.length > 0 && (
                  <Link to={createPageUrl('Settings') + '?tab=visibility'}>
                    <Button variant="outline" className="mt-4 border-white/20 text-white hover:bg-white/10">
                      <Eye className="h-4 w-4 mr-2" /> Manage Hidden Content
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {/* Quick reference bar */}
        <FadeSection>
          <div className="hidden lg:block">
            <div className={`rounded-2xl border backdrop-blur-sm p-4 ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quick Ref</span>
                  {QUICK_REFS.map((ref, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{ref.label}</span>
                      <span className={`text-xs font-mono font-bold ${darkMode ? 'text-cyan-300' : 'text-blue-700'}`}>{ref.value}</span>
                    </div>
                  ))}
                </div>
                <Link to={createPageUrl('ReferenceTables')}>
                  <button className={`text-xs flex items-center gap-1 transition-colors ${darkMode ? 'text-slate-400 hover:text-cyan-300' : 'text-slate-500 hover:text-blue-700'}`}>
                    All Standards <ChevronRight className="h-3 w-3" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </FadeSection>

        {/* Footer */}
        <div className="text-center py-4">
          <p className={`text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>Fiber Oracle © 2025</p>
        </div>
      </main>

      <BottomNavigationBar selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
      <OnboardingTour isOpen={showTour} onClose={handleTourClose} onComplete={handleTourComplete} />
    </div>
  );
}