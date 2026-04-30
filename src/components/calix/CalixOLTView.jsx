import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCalixNavigation } from '@/pages/CalixSmxSupport';
import { Zap, AlertCircle, AlertTriangle, Router } from 'lucide-react';

/**
 * CalixOLTView — OLT drill-down showing all ports within selected OLT
 */

export default function CalixOLTView({ oltName, onNavigate }) {
  const { reportData } = useCalixNavigation();

  // Filter ONTs by OLT
  const oltData = useMemo(() => {
    if (!reportData?.onts) return null;

    const onts = reportData.onts.filter(o => o.OLTName === oltName);
    const portMap = new Map();

    onts.forEach(ont => {
      const portKey = ont['Shelf/Slot/Port'] || 'Unknown';
      if (!portMap.has(portKey)) {
        portMap.set(portKey, {
          key: portKey,
          count: 0,
          critical: 0,
          warning: 0,
          offline: 0,
          ok: 0,
          avgRx: [],
          onts: [],
        });
      }
      const port = portMap.get(portKey);
      port.count++;
      port.onts.push(ont);
      if (ont._analysis?.status === 'critical') port.critical++;
      else if (ont._analysis?.status === 'warning') port.warning++;
      else if (ont._analysis?.status === 'offline') port.offline++;
      else port.ok++;
      if (ont.OntRxOptPwr) port.avgRx.push(parseFloat(ont.OntRxOptPwr));
    });

    const ports = Array.from(portMap.values()).map(p => ({
      ...p,
      avgRx: p.avgRx.length > 0 ? (p.avgRx.reduce((a, b) => a + b, 0) / p.avgRx.length).toFixed(1) : 'N/A',
    }));

    const stats = {
      totalOnts: onts.length,
      critical: onts.filter(o => o._analysis?.status === 'critical').length,
      warning: onts.filter(o => o._analysis?.status === 'warning').length,
      offline: onts.filter(o => o._analysis?.status === 'offline').length,
      ok: onts.filter(o => o._analysis?.status === 'ok').length,
    };

    return {
      oltName,
      ports: ports.sort((a, b) => {
        const aPriority = (b.critical + b.warning) - (a.critical + a.warning);
        if (aPriority !== 0) return aPriority;
        return b.count - a.count;
      }),
      stats,
    };
  }, [reportData, oltName]);

  if (!oltData) return null;

  return (
    <div className="space-y-6">
      {/* OLT Header */}
      <Card className="border-0 shadow bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{oltName}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {oltData.stats.totalOnts} ONTs across {oltData.ports.length} ports
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {oltData.stats.critical > 0 && (
                <Badge className="bg-red-100 text-red-800 border-red-300 px-3 py-1">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {oltData.stats.critical} Critical
                </Badge>
              )}
              {oltData.stats.warning > 0 && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 px-3 py-1">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {oltData.stats.warning} Warning
                </Badge>
              )}
              {oltData.stats.offline > 0 && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-300 px-3 py-1">
                  {oltData.stats.offline} Offline
                </Badge>
              )}
              {oltData.stats.ok > 0 && (
                <Badge className="bg-green-100 text-green-800 border-green-300 px-3 py-1">
                  {oltData.stats.ok} OK
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ports Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4">PON Ports</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {oltData.ports.map(port => (
            <Card
              key={port.key}
              className={`border-0 shadow cursor-pointer hover:shadow-lg transition-all ${
                port.critical > 0 ? 'ring-2 ring-red-300' : port.warning > 0 ? 'ring-2 ring-amber-300' : ''
              }`}
              onClick={() => onNavigate({ view: 'port', oltName, portKey: port.key })}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="font-mono">{port.key}</span>
                  {port.critical > 0 && (
                    <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">
                      {port.critical}
                    </Badge>
                  )}
                  {port.warning > 0 && port.critical === 0 && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                      {port.warning}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Mini Health Bar */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">{port.count} ONTs</div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
                    <div
                      className="bg-green-500"
                      style={{ width: `${(port.ok / port.count) * 100}%` }}
                    />
                    <div
                      className="bg-amber-500"
                      style={{ width: `${(port.warning / port.count) * 100}%` }}
                    />
                    <div
                      className="bg-red-500"
                      style={{ width: `${(port.critical / port.count) * 100}%` }}
                    />
                    {port.offline > 0 && (
                      <div
                        className="bg-purple-500"
                        style={{ width: `${(port.offline / port.count) * 100}%` }}
                      />
                    )}
                  </div>
                </div>

                {/* Mini Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {port.ok > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                      <div className="text-green-600 font-semibold">{port.ok}</div>
                      <div className="text-gray-500">OK</div>
                    </div>
                  )}
                  {port.warning > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                      <div className="text-amber-600 font-semibold">{port.warning}</div>
                      <div className="text-gray-500">Warn</div>
                    </div>
                  )}
                  {port.critical > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      <div className="text-red-600 font-semibold">{port.critical}</div>
                      <div className="text-gray-500">Crit</div>
                    </div>
                  )}
                  {port.offline > 0 && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                      <div className="text-purple-600 font-semibold">{port.offline}</div>
                      <div className="text-gray-500">Off</div>
                    </div>
                  )}
                </div>

                {/* Avg Rx */}
                <div className="pt-2 border-t">
                  <div className="text-xs text-gray-500">Avg ONT Rx</div>
                  <div className="text-sm font-mono font-semibold text-blue-600">{port.avgRx} dBm</div>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  View {port.count} ONTs
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}