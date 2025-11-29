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
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BottomNavigationBar from '@/components/BottomNavigationBar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MODULES = [
  {
    id: 'powercalc',
    title: 'Power Level Calculator',
    description: 'GPON & XGS-PON ONT Rx estimator',
    icon: Zap,
    color: 'from-emerald-500 to-teal-600',
    page: 'PowerLevelCalc',
    badge: 'Quick Access'
  },
  {
    id: 'splitterloss',
    title: 'Splitter Loss Reference',
    description: 'Tap any ratio for instant loss values',
    icon: Activity,
    color: 'from-purple-500 to-pink-600',
    page: 'SplitterLoss',
    badge: 'Quick Access'
  },
  {
    id: 'bendradius',
    title: 'Macrobend Radius Guide',
    description: 'Min bend radius by cable type',
    icon: Cable,
    color: 'from-amber-500 to-orange-600',
    page: 'BendRadius',
    badge: 'Quick Access'
  },
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
    id: 'otdr',
    title: 'OTDR Tier-2 Wizard',
    description: 'Bidirectional trace characterization',
    icon: Activity,
    color: 'from-indigo-500 to-purple-600',
    page: 'OTDRTest',
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
  {
    id: 'fiber101',
    title: 'Fiber 101',
    description: 'Quick start guide for beginners',
    icon: GraduationCap,
    color: 'from-green-500 to-emerald-600',
    page: 'Fiber101',
    badge: 'Learn'
  },
  {
    id: 'manual',
    title: 'User Manual',
    description: 'Comprehensive documentation',
    icon: FileText,
    color: 'from-gray-500 to-slate-600',
    page: 'Manual',
    badge: 'Learn'
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
  { name: 'TIA-455 (FOTP)', url: 'https://tiaonline.org/what-we-do/standards/', category: 'TIA', description: 'Fiber Optic Test Procedures' },
  { name: 'TIA-758-B', url: 'https://tiaonline.org/what-we-do/standards/', category: 'TIA', description: 'Customer-Owned Outside Plant' },
  { name: 'TIA/EIA-568', url: 'https://tiaonline.org/what-we-do/standards/', category: 'TIA', description: 'Ethernet Wiring Standards (T568A/T568B)' },
  // IEC Standards
  { name: 'IEC 61300-3-35', url: 'https://webstore.iec.ch/publication/5191', category: 'IEC', description: 'Connector End Face Visual Inspection' },
  { name: 'IEC 61280', url: 'https://webstore.iec.ch/publication/5160', category: 'IEC', description: 'Fiber Optic Communication Test Procedures' },
  { name: 'IEC 61073', url: 'https://webstore.iec.ch/publication/4420', category: 'IEC', description: 'Mechanical Splices and Fusion Splice Protectors' },
  // IEEE Standards
  { name: 'IEEE 802.3', url: 'https://standards.ieee.org/ieee/802.3/10422/', category: 'IEEE', description: 'Ethernet Standard (10M to 400G)' },
  { name: 'IEEE 802.11', url: 'https://standards.ieee.org/ieee/802.11/7028/', category: 'IEEE', description: 'Wireless LAN (Wi-Fi) Standards' },
  // ITU-T Standards
  { name: 'ITU-T G.652', url: 'https://www.itu.int/rec/T-REC-G.652', category: 'ITU-T', description: 'Single-Mode Optical Fiber Characteristics' },
  { name: 'ITU-T G.657', url: 'https://www.itu.int/rec/T-REC-G.657', category: 'ITU-T', description: 'Bend-Insensitive Single-Mode Fiber' },
  { name: 'ITU-T G.984', url: 'https://www.itu.int/rec/T-REC-G.984.1', category: 'ITU-T', description: 'GPON (Gigabit PON) Standard' },
  { name: 'ITU-T G.9807', url: 'https://www.itu.int/rec/T-REC-G.9807.1', category: 'ITU-T', description: 'XGS-PON (10G Symmetric PON)' },
  { name: 'ITU-T G.9804', url: 'https://www.itu.int/rec/T-REC-G.9804.1', category: 'ITU-T', description: '25G/50G Higher Speed PON' },
  // Telcordia Standards
  { name: 'Telcordia GR-326', url: 'https://telecom-info.njdepot.ericsson.net/site-cgi/ido/docs.cgi?ID=SEARCH&DOCUMENT=GR-326', category: 'Telcordia', description: 'Single-Mode Optical Connectors & Jumpers' },
  { name: 'Telcordia GR-20', url: 'https://telecom-info.njdepot.ericsson.net/site-cgi/ido/docs.cgi?ID=SEARCH&DOCUMENT=GR-20', category: 'Telcordia', description: 'Generic Requirements for Optical Fiber' },
];

const CATEGORIES = [
  { id: 'all', label: 'All Tools', icon: LayoutGrid },
  { id: 'Quick Access', label: 'Quick Access', icon: Zap },
  { id: 'Core', label: 'Core Tools', icon: Activity },
  { id: 'Reference', label: 'Reference', icon: BookOpen },
  { id: 'Tools', label: 'Field Tools', icon: Cable },
  { id: 'Learn', label: 'Learning', icon: GraduationCap },
];

export default function Home() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);
  
  // Load hidden modules from localStorage
  const [hiddenModules, setHiddenModules] = useState(() => {
    const saved = localStorage.getItem('hiddenModules');
    return saved ? JSON.parse(saved) : [];
  });

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

  // Save hidden modules to localStorage
  useEffect(() => {
    localStorage.setItem('hiddenModules', JSON.stringify(hiddenModules));
  }, [hiddenModules]);

  const toggleModuleVisibility = (moduleId) => {
    setHiddenModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const visibleModules = MODULES.filter(m => !hiddenModules.includes(m.id));
  
  const filteredModules = selectedCategory === 'all'
    ? visibleModules
    : visibleModules.filter(m => m.badge === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">FiberTech Pro</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">Field Reference Tool v2.0</p>
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
                      onClick={() => setHiddenModules([])}
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
          
          {hiddenModules.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <EyeOff className="h-3 w-3 mr-1" />
              {hiddenModules.length} hidden
            </Badge>
          )}
        </div>

        {/* Mobile: Quick Reference Bar */}
        <div className="md:hidden overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-2 min-w-max">
            {QUICK_REFS.map((ref, i) => (
              <div 
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <span className="text-xs text-gray-500">{ref.label}</span>
                <span className="text-xs font-mono font-semibold text-gray-900 dark:text-white">{ref.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {filteredModules.map((module) => (
            <Link key={module.id} to={createPageUrl(module.page)}>
              <Card className="group relative overflow-hidden border-0 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-white dark:bg-gray-800 h-full">
                {/* Hover gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <CardContent className="p-3 md:p-5">
                  {/* Mobile: Compact layout */}
                  <div className="flex flex-col items-center text-center md:items-start md:text-left">
                    <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center shadow-lg mb-2 md:mb-3 group-hover:scale-110 transition-transform duration-300`}>
                      <module.icon className="h-5 w-5 md:h-7 md:w-7 text-white" />
                    </div>
                    
                    <h3 className="font-semibold text-sm md:text-base text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {module.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden md:block line-clamp-2">
                      {module.description}
                    </p>
                    
                    {/* Desktop: Show category badge */}
                    <Badge variant="outline" className="mt-3 text-[10px] hidden md:inline-flex opacity-60 group-hover:opacity-100 transition-opacity">
                      {module.badge}
                    </Badge>
                  </div>
                </CardContent>
                
                {/* Hover arrow indicator - desktop only */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                  <ChevronRight className="h-5 w-5 text-blue-500" />
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Empty state if all modules hidden */}
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
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowCustomizeDialog(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Manage Hidden Modules
              </Button>
            )}
          </div>
        )}

        {/* Standards Footer - Desktop only, more compact */}
        <div className="hidden lg:block mt-8">
          <Card className="border-0 shadow-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Reference Standards</h3>
                <Badge variant="outline" className="text-xs">
                  {STANDARDS_LINKS.length} standards
                </Badge>
              </div>
              
              <div className="grid grid-cols-5 gap-4">
                {['TIA', 'IEC', 'IEEE', 'ITU-T', 'Telcordia'].map(category => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">{category}</p>
                    <div className="flex flex-col gap-1">
                      {STANDARDS_LINKS.filter(s => s.category === category).map((std) => (
                        <a 
                          key={std.name} 
                          href={std.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title={std.description}
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
                        >
                          {std.name}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* App Info - Minimal */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            FiberTech Pro © 2025
          </p>
        </div>
      </main>

      {/* Bottom Navigation - Mobile only */}
      <BottomNavigationBar 
        selectedCategory={selectedCategory} 
        onCategoryChange={setSelectedCategory} 
      />
    </div>
  );
}