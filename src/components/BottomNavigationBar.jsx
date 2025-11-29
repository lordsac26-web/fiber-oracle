import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Zap,
  Activity,
  BookOpen,
  GraduationCap,
  Settings,
  LayoutGrid,
  Stethoscope
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'all', label: 'All', icon: LayoutGrid, category: 'all' },
  { id: 'quick', label: 'Quick', icon: Zap, category: 'Quick Access' },
  { id: 'diag', label: 'Diagnose', icon: Stethoscope, category: 'Diagnostics' },
  { id: 'test', label: 'Test', icon: Activity, category: 'Testing' },
  { id: 'ref', label: 'Ref', icon: BookOpen, category: 'Reference' },
];

export default function BottomNavigationBar({ selectedCategory, onCategoryChange }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 md:hidden safe-area-bottom">
      <div className="flex h-16 items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.category === selectedCategory;
          return (
            <button
              key={item.id}
              onClick={() => onCategoryChange(item.category)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors
                ${isActive 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400 active:text-blue-500'}
              `}
            >
              <item.icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
        <Link
          to={createPageUrl('Settings')}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-gray-500 dark:text-gray-400 active:text-blue-500"
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px] font-medium">Settings</span>
        </Link>
      </div>
    </div>
  );
}