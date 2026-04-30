import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, AlertTriangle, Activity, Zap, User, MapPin, Cpu } from 'lucide-react';

/**
 * CalixONTDetail — Comprehensive ONT detail view with multiple tabs
 */

export default function CalixONTDetail({ ont }) {
  if (!ont) return null;

  const statusColor =
    ont._analysis?.status === 'critical' ? 'bg-red-100 text-red-800 border-red-300' :
    ont._analysis?.status === 'warning' ? 'bg-amber-100 text-amber-800 border-amber-300' :
    ont._analysis?.status === 'offline' ? 'bg-purple-100 text-purple-800 border-purple-300' :
    'bg-green-100 text-green-800 border-green-300';

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className={`border-2 shadow-lg ${statusColor}`}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-sm text-gray-500">ONT ID: {ont.OntID}</div>
                <h2 className="text-2xl font-bold font-mono mt-1">{ont.SerialNumber || 'Unknown'}</h2>
              </div>
              <Badge className={`${statusColor} px-3 py-1.5 text-base`}>
                {ont._analysis?.status?.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-gray-500">OLT</div>
                <div className="text-sm font-semibold">{ont.OLTName || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Port</div>
                <div className="text-sm font-mono font-semibold">{ont['Shelf/Slot/Port'] || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Model</div>
                <div className="text-sm font-semibold">{ont.subscriber_model || ont.model || 'Unknown'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Uptime</div>
                <div className="text-sm font-semibold text-blue-600">{ont.upTime || 'N/A'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-6">
          <TabsTrigger value="performance" className="text-xs md:text-sm">Perf</TabsTrigger>
          <TabsTrigger value="errors" className="text-xs md:text-sm">Errors</TabsTrigger>
          <TabsTrigger value="subscriber" className="text-xs md:text-sm">Customer</TabsTrigger>
          <TabsTrigger value="issues" className="text-xs md:text-sm">Issues</TabsTrigger>
          <TabsTrigger value="lcp" className="text-xs md:text-sm hidden md:flex">LCP</TabsTrigger>
          <TabsTrigger value="raw" className="text-xs md:text-sm hidden md:flex">Raw</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card className="border-0 shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Optical Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">ONT Rx Power</div>
                    <div className="text-3xl font-bold font-mono">
                      {ont.OntRxOptPwr} <span className="text-lg text-gray-500">dBm</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {parseFloat(ont.OntRxOptPwr) < -27 ? '🔴 Critical' : parseFloat(ont.OntRxOptPwr) < -25 ? '🟡 Warning' : '🟢 Optimal'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-1">ONT Tx Power</div>
                    <div className="text-2xl font-bold font-mono">{ont.OntTxPwr || 'N/A'}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">OLT Rx Power</div>
                    <div className="text-3xl font-bold font-mono">
                      {ont.OLTRXOptPwr} <span className="text-lg text-gray-500">dBm</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-1">Link Budget</div>
                    <div className="text-lg text-gray-600">
                      {ont.OntRxOptPwr && ont.OLTRXOptPwr ? (Math.abs(parseFloat(ont.OntRxOptPwr) - parseFloat(ont.OLTRXOptPwr))).toFixed(1) : 'N/A'} dB
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors">
          <Card className="border-0 shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Error Counters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">Upstream BIP Errors</div>
                    <div className="text-2xl font-bold">{ont.UpstreamBipErrors || 0}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">Upstream FEC Uncorrected</div>
                    <div className="text-2xl font-bold">{ont.UpstreamFecUncorrectedCodeWords || 0}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">Upstream Missed Bursts</div>
                    <div className="text-2xl font-bold">{ont.UpstreamMissedBursts || 0}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">Upstream GEM HEC Errors</div>
                    <div className="text-2xl font-bold">{ont.UpstreamGemHecErrors || 0}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">Downstream BIP Errors</div>
                    <div className="text-2xl font-bold">{ont.DownstreamBipErrors || 0}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">Downstream FEC Uncorrected</div>
                    <div className="text-2xl font-bold">{ont.DownstreamFecUncorrectedCodeWords || 0}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">Downstream FEC Corrected</div>
                    <div className="text-2xl font-bold text-blue-600">{ont.DownstreamFecCorrectedCodeWords || 0}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-xs text-gray-500">Upstream FEC Corrected</div>
                    <div className="text-2xl font-bold text-blue-600">{ont.UpstreamFecCorrectedCodeWords || 0}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriber Tab */}
        <TabsContent value="subscriber">
          <Card className="border-0 shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-green-500" />
                Subscriber Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ont.subscriber_account_name ? (
                <>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Account Name</div>
                    <div className="text-lg font-semibold">{ont.subscriber_account_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Address</div>
                    <div className="text-sm">{ont.subscriber_address}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Provisioned Model</div>
                    <div className="text-sm font-mono">{ont.subscriber_model}</div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm">No subscriber data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues">
          <Card className="border-0 shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ont._analysis?.issues && ont._analysis.issues.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-red-700">Critical Issues:</h4>
                  {ont._analysis.issues.map((issue, idx) => (
                    <div key={idx} className="bg-red-50 dark:bg-red-900/20 border border-red-300 rounded-lg p-3">
                      <div className="font-semibold text-sm text-red-700">{issue.field}</div>
                      <div className="text-sm text-red-600 mt-1">{issue.message}</div>
                      <div className="text-xs text-red-500 mt-1 font-mono">Value: {issue.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No critical issues</p>
              )}

              {ont._analysis?.warnings && ont._analysis.warnings.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h4 className="font-semibold text-amber-700">Warnings:</h4>
                  {ont._analysis.warnings.map((warning, idx) => (
                    <div key={idx} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 rounded-lg p-3">
                      <div className="font-semibold text-sm text-amber-700">{warning.field}</div>
                      <div className="text-sm text-amber-600 mt-1">{warning.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LCP Tab */}
        <TabsContent value="lcp">
          <Card className="border-0 shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-purple-500" />
                LCP / Distribution Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ont._lcpNumber ? (
                <>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">LCP Number</div>
                    <div className="text-lg font-semibold">{ont._lcpNumber}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Splitter Number</div>
                    <div className="text-sm">{ont._splitterNumber || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Location</div>
                    <div className="text-sm">{ont._lcpLocation || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Address</div>
                    <div className="text-sm">{ont._lcpAddress || 'N/A'}</div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm">No LCP data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raw Data Tab */}
        <TabsContent value="raw">
          <Card className="border-0 shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-gray-500" />
                Raw Data Export
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto text-xs">
                {JSON.stringify(ont, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}