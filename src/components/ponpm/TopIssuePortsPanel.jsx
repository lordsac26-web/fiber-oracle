import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Router } from 'lucide-react';

export default function TopIssuePortsPanel({ onts = [], onPortClick }) {
  const topPorts = useMemo(() => {
    const ports = new Map();

    for (const ont of onts) {
      const status = ont?._analysis?.status;
      if (status !== 'critical' && status !== 'warning' && status !== 'offline') continue;

      const oltName = ont._oltName || ont.OLTName || 'Unknown OLT';
      const portKey = ont._port || ont['Shelf/Slot/Port'] || 'Unknown';
      const key = `${oltName}|${portKey}`;

      if (!ports.has(key)) {
        ports.set(key, { oltName, portKey, critical: 0, warning: 0, offline: 0, totalIssues: 0 });
      }

      const port = ports.get(key);
      port[status] += 1;
      port.totalIssues += 1;
    }

    return Array.from(ports.values())
      .sort((a, b) => b.critical - a.critical || b.warning - a.warning || b.offline - a.offline || b.totalIssues - a.totalIssues)
      .slice(0, 10);
  }, [onts]);

  return (
    <Card className="border-0 shadow h-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Router className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Top 10 Ports with Issues</span>
          </div>
          <Badge variant="outline" className="text-[10px]">{topPorts.length}</Badge>
        </div>

        {topPorts.length === 0 ? (
          <div className="text-sm text-gray-500 py-6 text-center">No ports with warning, critical, or offline ONTs.</div>
        ) : (
          <div className="space-y-2">
            {topPorts.map((port, index) => (
              <button
                key={`${port.oltName}|${port.portKey}`}
                type="button"
                onClick={() => onPortClick?.(port.oltName, port.portKey)}
                className="w-full text-left rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 transition-colors px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-900 truncate">
                      #{index + 1} {port.oltName}
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono truncate">{port.portKey}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {port.critical > 0 && (
                      <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px] px-1.5">
                        <AlertCircle className="h-2.5 w-2.5 mr-0.5" />{port.critical}
                      </Badge>
                    )}
                    {port.warning > 0 && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1.5">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{port.warning}
                      </Badge>
                    )}
                    {port.offline > 0 && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-[10px] px-1.5">
                        {port.offline}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}