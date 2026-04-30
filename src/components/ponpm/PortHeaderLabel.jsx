/**
 * PortHeaderLabel
 * Shows the port key, optic type badge (XGS-ONLY, XGS-COMBO, XGS-COMBO-EXT based on optic model),
 * ONT count, and LCP/Splitter info.
 * 
 * Model mapping:
 *   100-05730 → XGS-ONLY (pure XGS laser)
 *   100-05764 → XGS-COMBO (combo optic, supports XGS+GPON)
 *   100-05929 → XGS-COMBO-EXT (extended combo optic)
 *   Other/GPON → GPON
 */
import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

export default function PortHeaderLabel({ portKey, portStats, portOnts }) {
  const lcpOnt = portOnts.find(o => o._lcpNumber);

  // Detect port type from optic model number (from LCP enrichment)
  const detectedType = useMemo(() => {
    // Get optic model from any ONT with LCP data (all ONTs on same port share same optic)
    const ontWithOptic = portOnts.find(o => o._opticModel);
    const opticModel = ontWithOptic?._opticModel?.trim();
    
    if (opticModel === '100-05730') return 'XGS-ONLY';
    if (opticModel === '100-05764') return 'XGS-COMBO';
    if (opticModel === '100-05929') return 'XGS-COMBO-EXT';
    
    // Fallback: detect from ONT tech type if no optic model
    const hasXgs = portOnts.some(o => o._techType?.includes('XGS-PON'));
    if (hasXgs) return 'XGS-ONLY'; // Conservative default for detected XGS
    return 'GPON';
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