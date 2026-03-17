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
      <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
        <span>{portStats.count} ONTs</span>
        {lcpOnt && (
          <span className="text-blue-600">
            • LCP {lcpOnt._lcpNumber}{lcpOnt._splitterNumber ? ` / Splitter ${lcpOnt._splitterNumber}` : ''}
          </span>
        )}
        {lcpOnt?._opticType && (
          <Badge variant="outline" className={`text-[10px] py-0 px-1 ${
            lcpOnt._opticType === 'XGS-DD' ? 'bg-purple-50 border-purple-300 text-purple-700' :
            lcpOnt._opticType === 'XGS-COMBO' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' :
            lcpOnt._opticType === 'XGS-COMBO-EXT' ? 'bg-amber-50 border-amber-300 text-amber-700' :
            'bg-gray-50 border-gray-300 text-gray-700'
          }`}>
            {lcpOnt._opticType}
          </Badge>
        )}
      </div>
    </div>
  );
}