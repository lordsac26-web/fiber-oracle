import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function KPIStatistics({ result, filteredOnts }) {
  const stats = useMemo(() => {
    if (!filteredOnts || filteredOnts.length === 0) {
      return null;
    }

    // Calculate ONT Rx Power stats
    const ontRxValues = filteredOnts
      .map(o => parseFloat(o.OntRxOptPwr))
      .filter(v => !isNaN(v) && v !== 0);
    
    const avgOntRx = ontRxValues.length > 0 
      ? ontRxValues.reduce((a, b) => a + b, 0) / ontRxValues.length 
      : null;
    const minOntRx = ontRxValues.length > 0 ? Math.min(...ontRxValues) : null;
    const maxOntRx = ontRxValues.length > 0 ? Math.max(...ontRxValues) : null;

    // Calculate OLT Rx Power stats
    const oltRxValues = filteredOnts
      .map(o => parseFloat(o.OLTRXOptPwr))
      .filter(v => !isNaN(v) && v !== 0);
    
    const avgOltRx = oltRxValues.length > 0 
      ? oltRxValues.reduce((a, b) => a + b, 0) / oltRxValues.length 
      : null;

    // Technology breakdown
    const gponOnts = filteredOnts.filter(o => o._techType?.includes('GPON') || !o._techType);
    const xgsOnts = filteredOnts.filter(o => o._techType?.includes('XGS-PON'));

    // Error statistics
    const totalUsBip = filteredOnts.reduce((sum, o) => sum + (parseInt(o.UpstreamBipErrors) || 0), 0);
    const totalDsBip = filteredOnts.reduce((sum, o) => sum + (parseInt(o.DownstreamBipErrors) || 0), 0);
    const totalUsFec = filteredOnts.reduce((sum, o) => sum + (parseInt(o.UpstreamFecUncorrectedCodeWords) || 0), 0);
    const totalDsFec = filteredOnts.reduce((sum, o) => sum + (parseInt(o.DownstreamFecUncorrectedCodeWords) || 0), 0);

    // ONTs with errors
    const ontsWithErrors = filteredOnts.filter(o => 
      (parseInt(o.UpstreamBipErrors) || 0) > 0 ||
      (parseInt(o.DownstreamBipErrors) || 0) > 0 ||
      (parseInt(o.UpstreamFecUncorrectedCodeWords) || 0) > 0 ||
      (parseInt(o.DownstreamFecUncorrectedCodeWords) || 0) > 0
    ).length;

    // Power ranges
    const lowPowerOnts = filteredOnts.filter(o => {
      const rx = parseFloat(o.OntRxOptPwr);
      return !isNaN(rx) && rx < -25;
    }).length;

    const optimalPowerOnts = filteredOnts.filter(o => {
      const rx = parseFloat(o.OntRxOptPwr);
      return !isNaN(rx) && rx >= -25 && rx <= -15;
    }).length;

    return {
      avgOntRx,
      minOntRx,
      maxOntRx,
      avgOltRx,
      gponCount: gponOnts.length,
      xgsCount: xgsOnts.length,
      totalUsBip,
      totalDsBip,
      totalUsFec,
      totalDsFec,
      ontsWithErrors,
      errorRate: filteredOnts.length > 0 ? (ontsWithErrors / filteredOnts.length * 100) : 0,
      lowPowerOnts,
      optimalPowerOnts,
      avgGponRx: gponOnts.length > 0 
        ? gponOnts.map(o => parseFloat(o.OntRxOptPwr)).filter(v => !isNaN(v) && v !== 0).reduce((a, b) => a + b, 0) / gponOnts.filter(o => !isNaN(parseFloat(o.OntRxOptPwr)) && parseFloat(o.OntRxOptPwr) !== 0).length
        : null,
      avgXgsRx: xgsOnts.length > 0 
        ? xgsOnts.map(o => parseFloat(o.OntRxOptPwr)).filter(v => !isNaN(v) && v !== 0).reduce((a, b) => a + b, 0) / xgsOnts.filter(o => !isNaN(parseFloat(o.OntRxOptPwr)) && parseFloat(o.OntRxOptPwr) !== 0).length
        : null,
    };
  }, [filteredOnts]);

  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <Badge variant="outline" className="text-[10px]">Avg</Badge>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.avgOntRx !== null ? `${stats.avgOntRx.toFixed(2)}` : 'N/A'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">ONT Rx Power (dBm)</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              Range: {stats.minOntRx?.toFixed(1)} to {stats.maxOntRx?.toFixed(1)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-4 w-4 text-purple-500" />
              <Badge variant="outline" className="text-[10px]">Avg</Badge>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.avgOltRx !== null ? `${stats.avgOltRx.toFixed(2)}` : 'N/A'}
            </div>
            <div className="text-xs text-gray-500">OLT Rx Power (dBm)</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <Badge variant="outline" className="text-[10px]">Errors</Badge>
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {stats.errorRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">ONTs with Errors</div>
            <div className="text-[10px] text-gray-400 mt-1">
              {stats.ontsWithErrors} / {filteredOnts.length} ONTs
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <Badge variant="outline" className="text-[10px]">Power</Badge>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.optimalPowerOnts}
            </div>
            <div className="text-xs text-gray-500">Optimal Range</div>
            <div className="text-[10px] text-gray-400 mt-1">
              {stats.lowPowerOnts} low power
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technology Comparison */}
      {(stats.gponCount > 0 || stats.xgsCount > 0) && (
        <Card className="border-0 shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Technology Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-blue-800 dark:text-blue-200">GPON</span>
                  <Badge className="bg-blue-600 text-white">{stats.gponCount} ONTs</Badge>
                </div>
                {stats.avgGponRx !== null && (
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    Avg Rx: <span className="font-mono font-bold">{stats.avgGponRx.toFixed(2)} dBm</span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-purple-800 dark:text-purple-200">XGS-PON</span>
                  <Badge className="bg-purple-600 text-white">{stats.xgsCount} ONTs</Badge>
                </div>
                {stats.avgXgsRx !== null && (
                  <div className="text-sm text-purple-700 dark:text-purple-300">
                    Avg Rx: <span className="font-mono font-bold">{stats.avgXgsRx.toFixed(2)} dBm</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Statistics */}
      <Card className="border-0 shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Network Error Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {stats.totalUsBip.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-500">US BIP Errors</div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {stats.totalDsBip.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-500">DS BIP Errors</div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {stats.totalUsFec.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-500">US FEC Uncorrected</div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {stats.totalDsFec.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-500">DS FEC Uncorrected</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}