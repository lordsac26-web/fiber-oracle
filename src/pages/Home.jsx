import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Cable,
  GraduationCap,
  FileText,
  LayoutGrid,
  Eye,
  EyeOff,
  X,
  Check,
  FileSearch,
  FlaskConical,
  ClipboardList,
  Info,
  HelpCircle
} from 'lucide-react';
import OnboardingTour from '@/components/OnboardingTour';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BottomNavigationBar from '@/components/BottomNavigationBar';
import { useUserPreferences } from '@/components/UserPreferencesContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MODULES = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATORS - Mathematical tools for planning and estimation
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'opticalcalc',
    title: 'Optical Calculator',
    description: 'Link loss, PON power & dB converter',
    icon: Calculator,
    color: 'from-indigo-500 to-purple-600',
    page: 'OpticalCalculator',
    badge: 'Calculators',
    isNew: true
  },
  {
    id: 'powercalc',
    title: 'Power Calculator',
    description: 'Estimate ONT Rx power for GPON & XGS-PON',
    icon: Zap,
    color: 'from-emerald-500 to-teal-600',
    page: 'PowerLevelCalc',
    badge: 'Calculators'
  },
  {
    id: 'calculator',
    title: 'Loss Budget',
    description: 'Calculate total link loss (TIA-568-D)',
    icon: Calculator,
    color: 'from-blue-500 to-indigo-600',
    page: 'LossBudget',
    badge: 'Calculators'
  },
  {
    id: 'splitterloss',
    title: 'Splitter Loss',
    description: 'Instant loss values by split ratio',
    icon: Activity,
    color: 'from-purple-500 to-pink-600',
    page: 'SplitterLoss',
    badge: 'Calculators'
  },
  {
    id: 'bendradius',
    title: 'Bend Radius',
    description: 'Minimum bend radius by cable type',
    icon: Cable,
    color: 'from-amber-500 to-orange-600',
    page: 'BendRadius',
    badge: 'Calculators'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TESTING - Test procedures and wizards
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ponpm',
    title: 'PON PM Analysis',
    description: 'Parse & analyze SMx PM exports',
    icon: FileText,
    color: 'from-cyan-500 to-blue-600',
    page: 'PONPMAnalysis',
    badge: 'Testing',
    isNew: true
  },
  {
    id: 'olts',
    title: 'OLTS Tier-1',
    description: 'Method B bidirectional power testing',
    icon: Activity,
    color: 'from-emerald-500 to-teal-600',
    page: 'OLTSTest',
    badge: 'Testing'
  },
  {
    id: 'otdr',
    title: 'OTDR Tier-2',
    description: 'Bidirectional trace characterization',
    icon: Activity,
    color: 'from-indigo-500 to-purple-600',
    page: 'OTDRTest',
    badge: 'Testing'
  },
  {
    id: 'cleaning',
    title: 'Cleaning & Inspection',
    description: 'IEC 61300-3-35 procedures',
    icon: Sparkles,
    color: 'from-cyan-500 to-blue-600',
    page: 'Cleaning',
    badge: 'Testing'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TROUBLESHOOTING - Diagnostic and analysis tools
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'doctor',
    title: 'Fiber Doctor',
    description: 'Interactive troubleshooting flowchart',
    icon: Stethoscope,
    color: 'from-rose-500 to-pink-600',
    page: 'FiberDoctor',
    badge: 'Troubleshoot'
  },
  {
    id: 'otdranalysis',
    title: 'AI OTDR Analysis',
    description: 'AI-powered trace diagnostics',
    icon: FileSearch,
    color: 'from-purple-600 to-indigo-700',
    page: 'OTDRAnalysis',
    badge: 'Troubleshoot',
    isBeta: true
  },
  {
    id: 'impairments',
    title: 'Impairment Library',
    description: 'Visual defect reference guide',
    icon: ImageIcon,
    color: 'from-violet-500 to-purple-600',
    page: 'Impairments',
    badge: 'Troubleshoot'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERENCE - Lookup tables, specs, and standards
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'fiberlocator',
    title: 'Fiber Locator',
    description: 'TIA-598 color code identifier',
    icon: Cable,
    color: 'from-orange-500 to-amber-600',
    page: 'FiberLocator',
    badge: 'Reference'
  },
  {
    id: 'pon',
    title: 'PON Power Levels',
    description: 'GPON & XGS-PON specifications',
    icon: Activity,
    color: 'from-cyan-500 to-blue-600',
    page: 'PONLevels',
    badge: 'Reference'
  },
  {
    id: 'tables',
    title: 'Reference Tables',
    description: 'Attenuation, connectors, splices & more',
    icon: BookOpen,
    color: 'from-slate-500 to-gray-600',
    page: 'ReferenceTables',
    badge: 'Reference'
  },
  {
    id: 'lcp',
    title: 'LCP / CLCP Info',
    description: 'Cabinet & splitter database',
    icon: Cable,
    color: 'from-teal-500 to-cyan-600',
    page: 'LCPInfo',
    badge: 'Reference'
  },
  {
    id: 'links',
    title: 'Industry Links',
    description: 'Vendors, standards & resources',
    icon: BookOpen,
    color: 'from-gray-500 to-slate-600',
    page: 'IndustryLinks',
    badge: 'Reference'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARN - Education and documentation
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'education',
    title: 'Education Center',
    description: 'Fiber 101, 102, 103 courses',
    icon: GraduationCap,
    color: 'from-green-500 to-emerald-600',
    page: 'Education',
    badge: 'Learn'
  },
  {
    id: 'userguide',
    title: 'User Guide',
    description: 'Complete how-to documentation',
    icon: BookOpen,
    color: 'from-blue-500 to-indigo-600',
    page: 'UserGuide',
    badge: 'Learn'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERENCE - Offline Documents (added)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'offline',
    title: 'Offline Documents',
    description: 'Saved PDFs for offline access',
    icon: FileText,
    color: 'from-slate-500 to-gray-600',
    page: 'OfflineDocuments',
    badge: 'Reference'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TESTING - Job Reports (added to Testing category)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'jobreports',
    title: 'Job Reports',
    description: 'Track & document fiber jobs',
    icon: ClipboardList,
    color: 'from-slate-500 to-gray-600',
    page: 'JobReports',
    badge: 'Testing'
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

const STANDARDS_LINKS = [
    // TIA Standards
    { name: 'TIA-568-D', url: 'https://tiaonline.org/what-we-do/standards/', category: 'TIA', description: 'Generic Telecommunications Cabling for Customer Premises' },
    { name: 'TIA-526-7', url: 'https://tiaonline.org/what-we-do/standards/', category: 'TIA', description: 'Optical Power Loss - Single-Mode Fiber' },
    { name: 'TIA-526-14-C', url: 'https://tiaonline.org/what-we-do/standards/', category: 'TIA', description: 'Optical Power Loss - Multimode Fiber' },
    { name: 'TIA-598-D', url: 'https://tiaonline.org/what-we-do/standards/', category: 'TIA', description: 'Optical Fiber Cable Color Coding' },
    { name: 'TIA-758-B', url: 'https://tiaonline.org/what-we-do/standards/', category: 'TIA', description: 'Customer-Owned Outside Plant' },
    // IEC Standards
    { name: 'IEC 61300-3-35', url: 'https://webstore.iec.ch/publication/5191', category: 'IEC', description: 'Connector End Face Visual Inspection' },
    { name: 'IEC 61280', url: 'https://webstore.iec.ch/publication/5160', category: 'IEC', description: 'Fiber Optic Communication Test Procedures' },
    { name: 'IEC 60794', url: 'https://webstore.iec.ch/publication/4420', category: 'IEC', description: 'Optical Fiber Cables - Generic Specification' },
    // ITU-T Standards
    { name: 'ITU-T G.652', url: 'https://www.itu.int/rec/T-REC-G.652', category: 'ITU-T', description: 'Single-Mode Optical Fiber Characteristics' },
    { name: 'ITU-T G.657', url: 'https://www.itu.int/rec/T-REC-G.657', category: 'ITU-T', description: 'Bend-Insensitive Single-Mode Fiber' },
    { name: 'ITU-T G.984', url: 'https://www.itu.int/rec/T-REC-G.984.1', category: 'ITU-T', description: 'GPON (Gigabit PON) Standard' },
    { name: 'ITU-T G.9807', url: 'https://www.itu.int/rec/T-REC-G.9807.1', category: 'ITU-T', description: 'XGS-PON (10G Symmetric PON)' },
    // FOA Guidelines
    { name: 'FOA Reference', url: 'https://www.thefoa.org/tech/ref/contents.html', category: 'FOA', description: 'Comprehensive Technical Reference Guide' },
    { name: 'FOA Testing', url: 'https://www.thefoa.org/tech/testing.htm', category: 'FOA', description: 'Testing Best Practices & Methods' },
    { name: 'FOA Standards', url: 'https://www.thefoa.org/tech/standards.htm', category: 'FOA', description: 'Industry Standards Overview' },
    // Other Standards
    { name: 'Telcordia GR-326', url: 'https://telecom-info.njdepot.ericsson.net/', category: 'Other', description: 'Single-Mode Optical Connectors' },
    { name: 'NEC Article 770', url: 'https://www.nfpa.org/', category: 'Other', description: 'Optical Fiber Cables & Raceways' },
    { name: 'OSHA 1926', url: 'https://www.osha.gov/', category: 'Other', description: 'Construction Safety Standards' },
  ];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'Calculators', label: 'Calculate', icon: Calculator, description: 'Loss budgets, power levels & conversions' },
  { id: 'Testing', label: 'Test', icon: Activity, description: 'OLTS, OTDR & inspection procedures' },
  { id: 'Troubleshoot', label: 'Troubleshoot', icon: Stethoscope, description: 'Diagnostics & problem solving' },
  { id: 'Reference', label: 'Reference', icon: BookOpen, description: 'Standards, specs & lookup tables' },
  { id: 'Learn', label: 'Learn', icon: GraduationCap, description: 'Courses & documentation' },
];

export default function Home() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  const [showTour, setShowTour] = useState(false);
  
  // Use user preferences context
  const { preferences, updatePreferences } = useUserPreferences();
  const darkMode = preferences.darkMode;
  const hiddenModules = preferences.hiddenModules || [];
  const hasSeenTour = preferences.hasSeenTour || false;

  // Show tour for first-time users
  useEffect(() => {
    if (!hasSeenTour) {
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour]);

  const handleTourComplete = () => {
    setShowTour(false);
    updatePreferences({ hasSeenTour: true });
  };

  const handleTourClose = () => {
    setShowTour(false);
    updatePreferences({ hasSeenTour: true });
  };

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

  // Check for tour param from settings
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tour') === '1') {
      setShowTour(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const toggleModuleVisibility = (moduleId) => {
    const newHidden = hiddenModules.includes(moduleId) 
      ? hiddenModules.filter(id => id !== moduleId)
      : [...hiddenModules, moduleId];
    updatePreferences({ hiddenModules: newHidden });
  };
  
  const setDarkMode = (value) => {
    updatePreferences({ darkMode: value });
  };

  const visibleModules = MODULES.filter(m => !hiddenModules.includes(m.id));

  const filteredModules = selectedCategory === 'all'
    ? visibleModules
    : visibleModules.filter(m => m.badge === selectedCategory);

  // Group modules by category for sectioned view
  const groupedModules = CATEGORIES.filter(c => c.id !== 'all').reduce((acc, cat) => {
    acc[cat.id] = visibleModules.filter(m => m.badge === cat.id);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/1652e0384_oracle.jpg" 
                  alt="Fiber Oracle" 
                  className="w-10 h-10 rounded-xl object-cover shadow-lg"
                />
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Fiber Oracle</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">When you need to know, ask the Oracle.</p>
                </div>
              </div>

            {/* Desktop Quick Reference - Inline in header */}
            <div className="hidden lg:flex items-center gap-3 flex-1 justify-center max-w-2xl mx-8">
              {QUICK_REFS.slice(0, 4).map((ref, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100/80 dark:bg-gray-800/80"
                >
                  <span className="text-[10px] text-gray-500 uppercase tracking-wide">{ref.label}</span>
                  <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">{ref.value}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-1 md:gap-2">
              <Badge 
                variant="outline" 
                className={`hidden md:flex ${isOnline ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-amber-300 text-amber-700 bg-amber-50'}`}
              >
                {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                {isOnline ? 'Online' : 'Offline'}
              </Badge>

              {/* Customize Button - Desktop only */}
              <Dialog open={showCustomizeDialog} onOpenChange={setShowCustomizeDialog}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full h-9 w-9 hidden md:flex"
                    title="Customize visible modules"
                  >
                    <Eye className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Customize Modules
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-gray-500 mb-4">Toggle modules on/off to customize your dashboard. Hidden modules won't appear in the grid.</p>
                  <div className="space-y-1">
                    {MODULES.map((module) => (
                      <div 
                        key={module.id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                          hiddenModules.includes(module.id) 
                            ? 'bg-gray-100 dark:bg-gray-800 opacity-60' 
                            : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center`}>
                            <module.icon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{module.title}</p>
                            <p className="text-xs text-gray-500">{module.badge}</p>
                          </div>
                        </div>
                        <Switch
                          checked={!hiddenModules.includes(module.id)}
                          onCheckedChange={() => toggleModuleVisibility(module.id)}
                        />
                      </div>
                    ))}
                  </div>
                  {hiddenModules.length > 0 && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => updatePreferences({ hiddenModules: [] })}
                    >
                      Show All Modules
                    </Button>
                  )}
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setDarkMode(!darkMode)}
                className="rounded-full h-9 w-9"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              
              <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="rounded-full h-9 w-9 hidden md:flex"
                                    title="Start Tour"
                                    onClick={() => setShowTour(true)}
                                  >
                                    <HelpCircle className="h-5 w-5" />
                                  </Button>

                                  <Link to={createPageUrl('Brochure')} className="hidden md:block">
                                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" title="About Fiber Oracle">
                                      <Info className="h-5 w-5" />
                                    </Button>
                                  </Link>

                                  <Link to={createPageUrl('Settings')} className="hidden md:block">
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6 pb-24 md:pb-8">
        {/* Desktop: Category Pills + Module Count */}
        <div className="hidden md:flex items-center justify-between">
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => {
              const count = cat.id === 'all' 
                ? visibleModules.length 
                : visibleModules.filter(m => m.badge === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    selectedCategory === cat.id 
                      ? 'bg-white/20' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          
          {(hiddenModules.length > 0 || Object.values(preferences.hiddenSections || {}).some(arr => arr.length > 0)) && (
            <Link to={createPageUrl('Settings') + '?tab=visibility'}>
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-amber-50 border-amber-300 text-amber-700">
                <EyeOff className="h-3 w-3 mr-1" />
                {hiddenModules.length > 0 && `${hiddenModules.length} modules`}
                {hiddenModules.length > 0 && Object.values(preferences.hiddenSections || {}).some(arr => arr.length > 0) && ' + '}
                {Object.values(preferences.hiddenSections || {}).some(arr => arr.length > 0) && 
                  `${Object.values(preferences.hiddenSections || {}).reduce((sum, arr) => sum + arr.length, 0)} sections`
                }
                {' hidden'}
              </Badge>
            </Link>
          )}
        </div>



        {/* Sectioned View (All categories) */}
        {selectedCategory === 'all' ? (
          <div className="space-y-6 md:space-y-8">
            {CATEGORIES.filter(c => c.id !== 'all').map((category) => {
              const categoryModules = groupedModules[category.id];
              if (!categoryModules || categoryModules.length === 0) return null;

              return (
                <section key={category.id} className="scroll-mt-20" id={`section-${category.id}`}>
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-3 md:mb-4">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${
                      category.id === 'Calculators' ? 'from-blue-500 to-indigo-600' :
                      category.id === 'Testing' ? 'from-emerald-500 to-teal-600' :
                      category.id === 'Troubleshoot' ? 'from-rose-500 to-pink-600' :
                      category.id === 'Reference' ? 'from-slate-500 to-gray-600' :
                      'from-green-500 to-emerald-600'
                    } flex items-center justify-center shadow-md`}>
                      <category.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">{category.label}</h2>
                      <p className="text-xs text-gray-500 hidden sm:block">{category.description}</p>
                    </div>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {categoryModules.length}
                    </Badge>
                  </div>

                  {/* Module Grid for this category */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
                    {categoryModules.map((module) => (
                      <Link key={module.id} to={createPageUrl(module.page)}>
                        <Card className="group relative overflow-hidden border-0 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer bg-white dark:bg-gray-800 h-full">
                          <CardContent className="p-2.5 md:p-4">
                            <div className="flex items-start gap-2 md:gap-3">
                              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center shadow flex-shrink-0 group-hover:scale-105 transition-transform`}>
                                <module.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-xs md:text-sm text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                  {module.title}
                                </h3>
                                <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1 md:line-clamp-2">
                                  {module.description}
                                </p>
                                {(module.isBeta || module.isNew) && (
                                  <div className="mt-1">
                                    {module.isBeta && (
                                      <Badge className="bg-amber-500 text-[8px] md:text-[9px] px-1 py-0">
                                        <FlaskConical className="h-2 w-2 mr-0.5 inline" />
                                        BETA
                                      </Badge>
                                    )}
                                    {module.isNew && (
                                      <Badge className="bg-emerald-500 text-[8px] md:text-[9px] px-1 py-0">
                                        NEW
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          /* Filtered View (Single category) */
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {filteredModules.map((module) => (
                <Link key={module.id} to={createPageUrl(module.page)}>
                  <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-white dark:bg-gray-800 h-full">
                    <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                    <CardContent className="p-3 md:p-5">
                      <div className="flex flex-col items-center text-center md:items-start md:text-left">
                        <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center shadow-lg mb-2 md:mb-3 group-hover:scale-110 transition-transform duration-300`}>
                          <module.icon className="h-5 w-5 md:h-7 md:w-7 text-white" />
                        </div>

                        <h3 className="font-semibold text-sm md:text-base text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {module.title}
                          {module.isBeta && (
                            <Badge className="ml-1 bg-amber-500 text-[9px] px-1 py-0 align-middle">
                              <FlaskConical className="h-2 w-2 mr-0.5 inline" />
                              BETA
                            </Badge>
                          )}
                          {module.isNew && (
                            <Badge className="ml-1 bg-emerald-500 text-[9px] px-1 py-0 align-middle">
                              NEW
                            </Badge>
                          )}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden md:block line-clamp-2">
                          {module.description}
                        </p>
                      </div>
                    </CardContent>

                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                      <ChevronRight className="h-5 w-5 text-blue-500" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {filteredModules.length === 0 && (
              <div className="text-center py-12">
                <EyeOff className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">No modules visible</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {hiddenModules.length > 0 
                    ? "All modules in this category are hidden." 
                    : "No modules match this category."}
                </p>
                {hiddenModules.length > 0 && (
                  <Link to={createPageUrl('Settings') + '?tab=visibility'}>
                    <Button variant="outline" className="mt-4">
                      <Eye className="h-4 w-4 mr-2" />
                      Manage Hidden Content
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        {/* Quick Reference Card - Compact */}
        <div className="hidden lg:block mt-6">
          <Card className="border-0 shadow-md bg-white/70 dark:bg-gray-800/70 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Quick Ref:</span>
                  {QUICK_REFS.map((ref, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">{ref.label}</span>
                      <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">{ref.value}</span>
                    </div>
                  ))}
                </div>
                <Link to={createPageUrl('ReferenceTables')}>
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    All Standards <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* App Info - Minimal */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            Fiber Oracle © 2025
          </p>
        </div>
      </main>

      {/* Bottom Navigation - Mobile only */}
              <BottomNavigationBar 
                selectedCategory={selectedCategory} 
                onCategoryChange={setSelectedCategory} 
              />

              {/* Onboarding Tour */}
              <OnboardingTour 
                isOpen={showTour} 
                onClose={handleTourClose} 
                onComplete={handleTourComplete} 
              />
            </div>
          );
        }