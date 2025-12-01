import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronRight,
  Calculator,
  Activity,
  Stethoscope,
  BookOpen,
  GraduationCap,
  Cable,
  Zap,
  Sparkles,
  ImageIcon,
  FileText,
  ClipboardList,
  FileSearch,
  RotateCcw
} from 'lucide-react';
import { useUserPreferences } from '@/components/UserPreferencesContext';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Define all modules and their sections
const MODULE_CONFIG = {
  opticalcalc: {
    title: 'Optical Calculator',
    icon: Calculator,
    color: 'from-indigo-500 to-purple-600',
    sections: [
      { id: 'linkloss', name: 'Link Loss Calculator' },
      { id: 'ponpower', name: 'PON Power Calculator' },
      { id: 'converter', name: 'dB Converter' },
    ]
  },
  powercalc: {
    title: 'Power Calculator',
    icon: Zap,
    color: 'from-emerald-500 to-teal-600',
    sections: []
  },
  calculator: {
    title: 'Loss Budget',
    icon: Calculator,
    color: 'from-blue-500 to-indigo-600',
    sections: []
  },
  splitterloss: {
    title: 'Splitter Loss',
    icon: Activity,
    color: 'from-purple-500 to-pink-600',
    sections: []
  },
  bendradius: {
    title: 'Bend Radius',
    icon: Cable,
    color: 'from-amber-500 to-orange-600',
    sections: [
      { id: 'drop', name: 'Drop Cables' },
      { id: 'indoor', name: 'Indoor Cables' },
      { id: 'outdoor', name: 'Outdoor Cables' },
      { id: 'patchcord', name: 'Patch Cords' },
    ]
  },
  olts: {
    title: 'OLTS Tier-1',
    icon: Activity,
    color: 'from-emerald-500 to-teal-600',
    sections: []
  },
  otdr: {
    title: 'OTDR Tier-2',
    icon: Activity,
    color: 'from-indigo-500 to-purple-600',
    sections: []
  },
  cleaning: {
    title: 'Cleaning & Inspection',
    icon: Sparkles,
    color: 'from-cyan-500 to-blue-600',
    sections: [
      { id: 'procedures', name: 'Cleaning Procedures' },
      { id: 'inspection', name: 'Inspection Zones' },
      { id: 'grades', name: 'Pass/Fail Grades' },
    ]
  },
  doctor: {
    title: 'Fiber Doctor',
    icon: Stethoscope,
    color: 'from-rose-500 to-pink-600',
    sections: []
  },
  otdranalysis: {
    title: 'AI OTDR Analysis',
    icon: FileSearch,
    color: 'from-purple-600 to-indigo-700',
    sections: []
  },
  impairments: {
    title: 'Impairment Library',
    icon: ImageIcon,
    color: 'from-violet-500 to-purple-600',
    sections: [
      { id: 'dust', name: 'Dust & Particles' },
      { id: 'scratches', name: 'Scratches' },
      { id: 'damage', name: 'Physical Damage' },
      { id: 'contamination', name: 'Contamination' },
    ]
  },
  fiberlocator: {
    title: 'Fiber Locator',
    icon: Cable,
    color: 'from-orange-500 to-amber-600',
    sections: [
      { id: 'loosetube', name: 'Loose Tube' },
      { id: 'ribbon', name: 'Ribbon' },
    ]
  },
  pon: {
    title: 'PON Power Levels',
    icon: Activity,
    color: 'from-cyan-500 to-blue-600',
    sections: [
      { id: 'gpon', name: 'GPON' },
      { id: 'xgspon', name: 'XGS-PON' },
      { id: 'ngpon', name: '25G/50G-PON' },
    ]
  },
  tables: {
    title: 'Reference Tables',
    icon: BookOpen,
    color: 'from-slate-500 to-gray-600',
    sections: [
      { id: 'attenuation', name: 'Attenuation' },
      { id: 'connectors', name: 'Connectors' },
      { id: 'splices', name: 'Splices' },
      { id: 'standards', name: 'Standards' },
      { id: 'otdrevents', name: 'OTDR Events' },
      { id: 'colors', name: 'Fiber Colors' },
      { id: 'glossary', name: 'Glossary' },
    ]
  },
  education: {
    title: 'Education Center',
    icon: GraduationCap,
    color: 'from-green-500 to-emerald-600',
    sections: [
      { id: 'fiber101', name: 'Fiber 101' },
      { id: 'fiber102', name: 'Fiber 102' },
      { id: 'fiber103', name: 'Fiber 103' },
      { id: 'certifications', name: 'Certifications' },
    ]
  },
  manual: {
    title: 'User Manual',
    icon: FileText,
    color: 'from-blue-500 to-indigo-600',
    sections: []
  },
  jobreports: {
    title: 'Job Reports',
    icon: ClipboardList,
    color: 'from-slate-500 to-gray-600',
    sections: []
  },
};

export default function ModuleVisibilitySettings() {
  const { preferences, updatePreferences } = useUserPreferences();
  const [expandedModules, setExpandedModules] = useState([]);

  const hiddenModules = preferences.hiddenModules || [];
  const hiddenSections = preferences.hiddenSections || {};

  const toggleModuleExpand = (moduleId) => {
    setExpandedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const toggleModuleVisibility = (moduleId) => {
    const newHidden = hiddenModules.includes(moduleId)
      ? hiddenModules.filter(id => id !== moduleId)
      : [...hiddenModules, moduleId];
    updatePreferences({ hiddenModules: newHidden });
  };

  const toggleSectionVisibility = (moduleId, sectionId) => {
    const moduleSections = hiddenSections[moduleId] || [];
    const newModuleSections = moduleSections.includes(sectionId)
      ? moduleSections.filter(id => id !== sectionId)
      : [...moduleSections, sectionId];
    
    updatePreferences({
      hiddenSections: {
        ...hiddenSections,
        [moduleId]: newModuleSections
      }
    });
  };

  const resetAllVisibility = () => {
    updatePreferences({
      hiddenModules: [],
      hiddenSections: {}
    });
  };

  const totalHiddenModules = hiddenModules.length;
  const totalHiddenSections = Object.values(hiddenSections).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Module Visibility
            </CardTitle>
            <CardDescription>Show or hide modules and their sections</CardDescription>
          </div>
          {(totalHiddenModules > 0 || totalHiddenSections > 0) && (
            <Button variant="outline" size="sm" onClick={resetAllVisibility}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset All
            </Button>
          )}
        </div>
        
        {(totalHiddenModules > 0 || totalHiddenSections > 0) && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm">
              <EyeOff className="h-4 w-4" />
              <span>
                {totalHiddenModules > 0 && `${totalHiddenModules} module${totalHiddenModules > 1 ? 's' : ''} hidden`}
                {totalHiddenModules > 0 && totalHiddenSections > 0 && ', '}
                {totalHiddenSections > 0 && `${totalHiddenSections} section${totalHiddenSections > 1 ? 's' : ''} hidden`}
              </span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(MODULE_CONFIG).map(([moduleId, module]) => {
          const isModuleHidden = hiddenModules.includes(moduleId);
          const moduleSectionsHidden = hiddenSections[moduleId] || [];
          const isExpanded = expandedModules.includes(moduleId);
          const hasSections = module.sections.length > 0;

          return (
            <div 
              key={moduleId}
              className={`rounded-lg border transition-colors ${
                isModuleHidden 
                  ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  {hasSections && (
                    <button
                      onClick={() => toggleModuleExpand(moduleId)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      {isExpanded 
                        ? <ChevronDown className="h-4 w-4 text-gray-500" />
                        : <ChevronRight className="h-4 w-4 text-gray-500" />
                      }
                    </button>
                  )}
                  {!hasSections && <div className="w-6" />}
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center`}>
                    <module.icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <span className={`font-medium ${isModuleHidden ? 'line-through text-gray-400' : ''}`}>
                      {module.title}
                    </span>
                    {moduleSectionsHidden.length > 0 && !isModuleHidden && (
                      <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-300">
                        {moduleSectionsHidden.length} hidden
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={!isModuleHidden}
                  onCheckedChange={() => toggleModuleVisibility(moduleId)}
                />
              </div>

              {hasSections && isExpanded && !isModuleHidden && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700">
                  <div className="pl-10 space-y-2">
                    {module.sections.map((section) => {
                      const isSectionHidden = moduleSectionsHidden.includes(section.id);
                      return (
                        <div 
                          key={section.id}
                          className={`flex items-center justify-between py-2 px-3 rounded ${
                            isSectionHidden 
                              ? 'bg-gray-50 dark:bg-gray-700/50 opacity-60' 
                              : 'bg-gray-50 dark:bg-gray-700/50'
                          }`}
                        >
                          <span className={`text-sm ${isSectionHidden ? 'line-through text-gray-400' : ''}`}>
                            {section.name}
                          </span>
                          <Switch
                            checked={!isSectionHidden}
                            onCheckedChange={() => toggleSectionVisibility(moduleId, section.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Export the config for use in other components
export { MODULE_CONFIG };