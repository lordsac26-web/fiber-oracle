import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown } from 'lucide-react';

/**
 * Full-width health bar showing OK / Warning / Critical / Offline proportions
 * plus optional trend data summary.
 */
export default function NetworkHealthBar({ summary, ontsWithTrendsCount, ontsDegradingCount }) {
  const total = summary.totalOnts || 1; // guard against division by zero
  const healthyPct = summary.totalOnts > 0
    ? ((summary.okCount / summary.totalOnts) * 100).toFixed(1)
    : '0.0';

  return (
    <Card className="border-0 shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Network Health — All ONTs</span>
          <span className="text-sm text-gray-500">{healthyPct}% healthy</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
          <div className="bg-green-500 transition-all" style={{ width: `${(summary.okCount / total) * 100}%` }} />
          <div className="bg-amber-500 transition-all" style={{ width: `${(summary.warningCount / total) * 100}%` }} />
          <div className="bg-red-500 transition-all" style={{ width: `${(summary.criticalCount / total) * 100}%` }} />
          <div className="bg-purple-500 transition-all" style={{ width: `${((summary.offlineCount || 0) / total) * 100}%` }} />
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Healthy: {summary.okCount}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Warning: {summary.warningCount}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Critical: {summary.criticalCount}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Offline: {summary.offlineCount || 0}</span>
          <span className="ml-auto font-medium text-gray-400">Total: {summary.totalOnts} ONTs across {summary.oltCount} OLTs</span>
        </div>
        {ontsWithTrendsCount > 0 && (
          <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
            <span className="text-gray-500">Trend Data Available:</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-300">
                {ontsWithTrendsCount} ONTs tracked
              </Badge>
              {ontsDegradingCount > 0 && (
                <Badge className="text-[10px] bg-red-100 text-red-700 border-red-300">
                  <TrendingDown className="h-2 w-2 mr-1" />
                  {ontsDegradingCount} degrading
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}