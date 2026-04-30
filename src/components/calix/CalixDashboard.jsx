import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useCalixNavigation } from '@/pages/CalixSmxSupport';
import { Activity, AlertCircle, AlertTriangle, Router, Zap, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * CalixDashboard — High-level network overview
 * Shows summary metrics, health status, and navigation to OLT drill-down
 */

export default function CalixDashboard({ onNavigate }) {
  const { reportData, filteredOnts } = useCalixNavigation();

  // Aggregate statistics
  const stats = useMemo(() => {
    if (!reportData?.onts) return null;

    const onts = reportData.onts;
    let critical = 0, warning = 0, ok = 0, offline = 0;

    onts.forEach(ont => {
      if (ont._analysis?.status === 'critical') critical++;
      else if (ont._analysis?.status === 'warning') warning++;
      else if (ont._analysis?.status === 'offline') offline++;
      else ok++;
    });

    // OLT-level aggregation
    const oltMap = new Map();
    onts.forEach(ont => {
      const oltName = ont.OLTName || 'Unknown';
      if (!oltMap.has(oltName)) {
        oltMap.set(oltName, {
          name: oltName,
          count: 0,
          critical: 0,
          warning: 0,
          offline: 0,
          ok: 0,
          avgRx: [],
        });
      }
      const olt = oltMap.get(oltName);
      olt.count++;
      if (ont._analysis?.status === 'critical') olt.critical++;
      else if (ont._analysis?.status === 'warning') olt.warning++;
      else if (ont._analysis?.status === 'offline') olt.offline++;
      else olt.ok++;
      if (ont.OntRxOptPwr) olt.avgRx.push(parseFloat(ont.OntRxOptPwr));
    });

    const olts = Array.from(oltMap.values()).map(olt => ({
      ...olt,
      avgRx: olt.avgRx.length > 0 ? (olt.avgRx.reduce((a, b) => a + b, 0) / olt.avgRx.length).toFixed(1) : 'N/A',
    }));

    return {
      totalOnts: onts.length,
      critical,
      warning,
      ok,
      offline,
      oltCount: oltMap.size,
      olts: olts.sort((a, b) => (b.critical + b.warning) - (a.critical + a.warning)),
    };
  }, [reportData]);

  if (!stats) return null;

  const healthPercent = ((stats.ok / stats.totalOnts) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="border-0 shadow">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalOnts}
            </div>
            <div className="text-xs text-gray-500">Total ONTs</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow cursor-pointer hover:ring-2 hover:ring-red-300 transition-all">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-xs text-gray-500">Critical</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow cursor-pointer hover:ring-2 hover:ring-amber-300 transition-all">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.warning}</div>
            <div className="text-xs text-gray-500">Warnings</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow cursor-pointer hover:ring-2 hover:ring-purple-300 transition-all">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.offline}</div>
            <div className="text-xs text-gray-500">Offline</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow cursor-pointer hover:ring-2 hover:ring-green-300 transition-all">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.ok}</div>
            <div className="text-xs text-gray-500">Healthy</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.oltCount}</div>
            <div className="text-xs text-gray-500">OLTs</div>
          </CardContent>
        </Card>
      </div>

      {/* Health Overview Bar */}
      <Card className="border-0 shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Network Health</span>
            <span className="text-sm text-gray-500">{healthPercent}% healthy</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
            <div
              className="bg-green-500"
              style={{ width: `${(stats.ok / stats.totalOnts) * 100}%` }}
            />
            <div
              className="bg-amber-500"
              style={{ width: `${(stats.warning / stats.totalOnts) * 100}%` }}
            />
            <div
              className="bg-red-500"
              style={{ width: `${(stats.critical / stats.totalOnts) * 100}%` }}
            />
            <div
              className="bg-purple-500"
              style={{ width: `${(stats.offline / stats.totalOnts) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* OLT Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Router className="h-5 w-5 text-blue-500" />
          Optical Line Terminals
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.olts.map(olt => {
            const totalIssues = olt.critical + olt.warning;
            const healthColor = olt.critical > 0 ? 'red' : olt.warning > 0 ? 'amber' : 'green';

            return (
              <Card
                key={olt.name}
                className={`border-0 shadow cursor-pointer hover:shadow-lg transition-all ${
                  olt.critical > 0 ? 'ring-2 ring-red-300' : olt.warning > 0 ? 'ring-2 ring-amber-300' : ''
                }`}
                onClick={() => onNavigate({ view: 'olt', oltName: olt.name })}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="truncate">{olt.name}</span>
                    {olt.critical > 0 && (
                      <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {olt.critical}
                      </Badge>
                    )}
                    {olt.warning > 0 && olt.critical === 0 && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {olt.warning}
                      </Badge>
                    )}
                    {olt.critical === 0 && olt.warning === 0 && (
                      <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">OK</Badge>
                    )}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Mini Health Bar */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">{olt.count} ONTs</div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-200">
                      <div
                        className="bg-green-500"
                        style={{ width: `${(olt.ok / olt.count) * 100}%` }}
                      />
                      <div
                        className="bg-amber-500"
                        style={{ width: `${(olt.warning / olt.count) * 100}%` }}
                      />
                      <div
                        className="bg-red-500"
                        style={{ width: `${(olt.critical / olt.count) * 100}%` }}
                      />
                      {olt.offline > 0 && (
                        <div
                          className="bg-purple-500"
                          style={{ width: `${(olt.offline / olt.count) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                      <div className="text-green-600 font-semibold">{olt.ok}</div>
                      <div className="text-gray-500">Healthy</div>
                    </div>
                    {olt.warning > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                        <div className="text-amber-600 font-semibold">{olt.warning}</div>
                        <div className="text-gray-500">Warn</div>
                      </div>
                    )}
                    {olt.critical > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        <div className="text-red-600 font-semibold">{olt.critical}</div>
                        <div className="text-gray-500">Crit</div>
                      </div>
                    )}
                    {olt.offline > 0 && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                        <div className="text-purple-600 font-semibold">{olt.offline}</div>
                        <div className="text-gray-500">Off</div>
                      </div>
                    )}
                  </div>

                  {/* Avg Rx Power */}
                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-500">Avg ONT Rx</div>
                    <div className="text-sm font-mono font-semibold text-blue-600">{olt.avgRx} dBm</div>
                  </div>

                  {/* CTA Button */}
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}