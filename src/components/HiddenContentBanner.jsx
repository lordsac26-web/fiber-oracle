import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EyeOff, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function HiddenContentBanner({ hiddenCount, moduleId, onShowAll }) {
  if (hiddenCount === 0) return null;

  return (
    <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
      <EyeOff className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-amber-800 dark:text-amber-200">
          {hiddenCount} {hiddenCount === 1 ? 'section is' : 'sections are'} hidden in this module.
        </span>
        <div className="flex gap-2">
          {onShowAll && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onShowAll}
              className="text-amber-700 border-amber-300 hover:bg-amber-100"
            >
              Show All
            </Button>
          )}
          <Link to={createPageUrl('Settings') + '?tab=visibility'}>
            <Button variant="outline" size="sm" className="text-amber-700 border-amber-300 hover:bg-amber-100">
              <Settings className="h-3 w-3 mr-1" />
              Manage
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}