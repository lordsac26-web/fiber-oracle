/**
 * PortHeaderLabel
 * Shows the port key, optional combo badge, ONT count, and LCP/Splitter info
 * extracted from the port-level collapsible header in PONPMAnalysis.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';

export default function PortHeaderLabel({ portKey, portStats, portOnts }) {
  const lcpOnt = portOnts.find(o => o._lcpNumber);

  return (
    <div className="text-left">
      <div className="font-semibold text-sm flex items-center gap-2">
        {portKey}
        {portStats.isCombo && (
          <Badge variant="outline" className="text-[10px] bg-purple-50 border-purple-300 text-purple-700">
            {portStats.techType}
          </Badge>
        )}
      </div>
      <div className="text-xs text-gray-500 flex items-center gap-2">
        <span>{portStats.count} ONTs</span>
        {lcpOnt && (
          <span className="text-blue-600">
            • LCP {lcpOnt._lcpNumber}{lcpOnt._splitterNumber ? ` / Splitter ${lcpOnt._splitterNumber}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}