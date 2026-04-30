/**
 * PortHeaderLabel
 * Shows the port key, combo type badge (XGS-COMBO, GPON-COMBO, or XGS-ONLY based on ONT loadout),
 * ONT count, and LCP/Splitter info.
 */
import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

export default function PortHeaderLabel({ portKey, portStats, portOnts }) {
  const lcpOnt = portOnts.find(o => o._lcpNumber);

  // Detect port type from ONT loadout: check for mixed XGS/GPON or single tech
  const detectedType = useMemo(() => {
    const hasXgs = portOnts.some(o => o._techType?.includes('XGS-PON'));
    const hasGpon = portOnts.some(o => !o._techType || o._techType.includes('GPON'));
    
    if (hasXgs && hasGpon) return 'XGS-COMBO';
    if (hasXgs) return 'XGS-ONLY';
    return 'GPON'; // Default/fallback
  }, [portOnts]);

  const badgeColor = {
    'XGS-COMBO': 'bg-purple-50 border-purple-300 text-purple-700',
    'GPON-COMBO': 'bg-blue-50 border-blue-300 text-blue-700',
    'XGS-ONLY': 'bg-indigo-50 border-indigo-300 text-indigo-700',
  }[detectedType];

  return (
    <div className="text-left">
      <div className="font-semibold text-sm flex items-center gap-2">
        {portKey}
        <Badge variant="outline" className={`text-[10px] ${badgeColor}`}>
          {detectedType}
        </Badge>
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