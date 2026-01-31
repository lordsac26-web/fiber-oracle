import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calculator,
  FileText,
  Microscope,
  Wrench,
  BookOpen,
  Map,
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Search,
  Grid3x3,
  Zap
} from 'lucide-react';

const TOOL_CATEGORIES = [
  {
    name: 'Calculators',
    icon: Calculator,
    color: 'blue',
    tools: [
      { id: 'loss-budget', name: 'Loss Budget', page: 'LossBudget' },
      { id: 'power-level', name: 'Power Level', page: 'PowerLevelCalc' },
      { id: 'splitter-loss', name: 'Splitter Loss', page: 'SplitterLoss' },
      { id: 'bend-radius', name: 'Bend Radius', page: 'BendRadius' },
    ]
  },
  {
    name: 'Testing',
    icon: Microscope,
    color: 'green',
    tools: [
      { id: 'otdr', name: 'OTDR Analysis', page: 'OTDRAnalysis' },
      { id: 'olts', name: 'OLTS Wizard', page: 'OLTSTest' },
      { id: 'test-reports', name: 'Test Reports', page: 'ReportManagement' },
    ]
  },
  {
    name: 'Troubleshooting',
    icon: Wrench,
    color: 'red',
    tools: [
      { id: 'fiber-doctor', name: 'Fiber Doctor', page: 'FiberDoctor' },
      { id: 'impairments', name: 'Impairments', page: 'Impairments' },
      { id: 'cleaning', name: 'Cleaning Guide', page: 'Cleaning' },
    ]
  },
  {
    name: 'Reference',
    icon: BookOpen,
    color: 'purple',
    tools: [
      { id: 'reference-tables', name: 'Reference Tables', page: 'ReferenceTables' },
      { id: 'standards', name: 'Industry Links', page: 'IndustryLinks' },
      { id: 'documents', name: 'Document Search', page: 'DocumentSearch' },
    ]
  },
  {
    name: 'Data Management',
    icon: Map,
    color: 'amber',
    tools: [
      { id: 'pon-pm', name: 'PON PM Analysis', page: 'PONPMAnalysis' },
      { id: 'lcp-info', name: 'LCP Database', page: 'LCPInfo' },
      { id: 'job-reports', name: 'Job Reports', page: 'JobReports' },
    ]
  },
];

export default function AIModeSidebar({ isOpen, onClose, isMobile = false }) {
  const [expandedCategory, setExpandedCategory] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredCategories = React.useMemo(() => {
    if (!searchQuery) return TOOL_CATEGORIES;
    
    const query = searchQuery.toLowerCase();
    return TOOL_CATEGORIES.map(category => ({
      ...category,
      tools: category.tools.filter(tool => 
        tool.name.toLowerCase().includes(query)
      )
    })).filter(category => category.tools.length > 0);
  }, [searchQuery]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-xl border-r border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Grid3x3 className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-white">Tools & Modules</h2>
          </div>
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4 text-white" />
            </Button>
          )}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-400/50"
          />
        </div>
      </div>

      {/* Tool Categories */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            const isExpanded = expandedCategory === category.name;
            
            return (
              <div key={category.name} className="space-y-1">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.name)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{category.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {category.tools.length}
                    </Badge>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-6 space-y-0.5 py-1">
                        {category.tools.map((tool) => (
                          <Link
                            key={tool.id}
                            to={createPageUrl(tool.page)}
                            onClick={isMobile ? onClose : undefined}
                            className="block px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                          >
                            {tool.name}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <Link to={createPageUrl('Settings')}>
          <Button variant="ghost" className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </Link>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 z-50"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      initial={{ width: isOpen ? 280 : 0 }}
      animate={{ width: isOpen ? 280 : 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="relative overflow-hidden"
    >
      {isOpen && sidebarContent}
    </motion.div>
  );
}