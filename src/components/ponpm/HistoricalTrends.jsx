import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Search,
  Activity,
  Loader2,
  Sparkles,
  History,
  X,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import moment from 'moment';

export default function HistoricalTrends({ reports, onClose }) {
  const [selectedOnt, setSelectedOnt] = useState(null);
  const [searchSerial, setSearchSerial] = useState('');
  const [selectedOlt, setSelectedOlt] = useState('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  // Get all unique ONT serials across all reports
  const allOnts = useMemo(() => {
    const ontMap = new Map();
    reports.forEach(report => {
      (report.ont_data || []).forEach(ont => {
        if (ont.SerialNumber) {
          if (!ontMap.has(ont.SerialNumber)) {
            ontMap.set(ont.SerialNumber, {
              serial: ont.SerialNumber,
              ontId: ont.OntID,
              olt: ont._oltName,
              port: ont._port,
              model: ont.model,
              dataPoints: []
            });
          }
          ontMap.get(ont.SerialNumber).dataPoints.push({
            date: report.upload_date,
            reportName: report.report_name,
            OntRxOptPwr: parseFloat(ont.OntRxOptPwr) || null,
            OLTRXOptPwr: parseFloat(ont.OLTRXOptPwr) || null,
            OntTxPwr: parseFloat(ont.OntTxPwr) || null,
            UpstreamBipErrors: parseInt(ont.UpstreamBipErrors) || 0,
            DownstreamBipErrors: parseInt(ont.DownstreamBipErrors) || 0,
            status: ont._analysis?.status || 'ok'
          });
        }
      });
    });
    
    // Sort data points by date for each ONT
    ontMap.forEach(ont => {
      ont.dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));
    });
    
    return Array.from(ontMap.values());
  }, [reports]);

  // Get unique OLTs
  const olts = useMemo(() => {
    const oltSet = new Set();
    allOnts.forEach(ont => {
      if (ont.olt) oltSet.add(ont.olt);
    });
    return Array.from(oltSet).sort();
  }, [allOnts]);

  // Filter ONTs
  const filteredOnts = useMemo(() => {
    return allOnts.filter(ont => {
      const matchesSearch = !searchSerial || 
        ont.serial.toLowerCase().includes(searchSerial.toLowerCase()) ||
        ont.ontId?.toString().includes(searchSerial);
      const matchesOlt = selectedOlt === 'all' || ont.olt === selectedOlt;
      return matchesSearch && matchesOlt && ont.dataPoints.length > 1;
    });
  }, [allOnts, searchSerial, selectedOlt]);

  // Calculate trend for an ONT
  const calculateTrend = (dataPoints, field) => {
    if (dataPoints.length < 2) return null;
    const validPoints = dataPoints.filter(d => d[field] !== null);
    if (validPoints.length < 2) return null;
    
    const first = validPoints[0][field];
    const last = validPoints[validPoints.length - 1][field];
    const change = last - first;
    const percentChange = ((last - first) / Math.abs(first)) * 100;
    
    return { change, percentChange, first, last };
  };

  // Get ONTs with degradation
  const degradingOnts = useMemo(() => {
    return filteredOnts.filter(ont => {
      const rxTrend = calculateTrend(ont.dataPoints, 'OntRxOptPwr');
      // If Rx power dropped more than 1 dB, flag as degrading
      return rxTrend && rxTrend.change < -1;
    }).sort((a, b) => {
      const aTrend = calculateTrend(a.dataPoints, 'OntRxOptPwr');
      const bTrend = calculateTrend(b.dataPoints, 'OntRxOptPwr');
      return (aTrend?.change || 0) - (bTrend?.change || 0);
    });
  }, [filteredOnts]);

  // AI Analysis
  const runAiAnalysis = async () => {
    if (degradingOnts.length === 0) {
      toast.info('No degrading ONTs to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysisData = degradingOnts.slice(0, 20).map(ont => ({
        serial: ont.serial,
        olt: ont.olt,
        port: ont.port,
        dataPoints: ont.dataPoints.map(d => ({
          date: moment(d.date).format('YYYY-MM-DD'),
          ontRx: d.OntRxOptPwr,
          oltRx: d.OLTRXOptPwr,
          usBip: d.UpstreamBipErrors,
          dsBip: d.DownstreamBipErrors
        }))
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these fiber optic ONT performance trends and identify significant patterns, anomalies, or potential issues.

ONT Historical Data:
${JSON.stringify(analysisData, null, 2)}

For each ONT with notable findings, provide:
1. The type of degradation pattern (gradual decline, sudden drop, intermittent, seasonal)
2. Likely root cause (dirty connector, fiber bend, splice degradation, splitter issue, environmental)
3. Severity (low, medium, high, critical)
4. Recommended action

Also provide an overall network health assessment and any systemic issues you identify (e.g., multiple ONTs on same port degrading = possible feeder issue).`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            systemic_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  affected_onts: { type: "array", items: { type: "string" } },
                  severity: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            ont_findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  serial: { type: "string" },
                  pattern: { type: "string" },
                  likely_cause: { type: "string" },
                  severity: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAiAnalysis(result);
      toast.success('AI analysis complete');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Failed to run AI analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Chart data for selected ONT
  const chartData = useMemo(() => {
    if (!selectedOnt) return [];
    return selectedOnt.dataPoints.map(d => ({
      date: moment(d.date).format('MM/DD'),
      fullDate: moment(d.date).format('YYYY-MM-DD HH:mm'),
      'ONT Rx (dBm)': d.OntRxOptPwr,
      'OLT Rx (dBm)': d.OLTRXOptPwr,
      'US BIP Errors': d.UpstreamBipErrors,
      'DS BIP Errors': d.DownstreamBipErrors,
    }));
  }, [selectedOnt]);

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-500" />
            Historical Performance Trends
            <Badge variant="outline" className="ml-2">{reports.length} reports</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by Serial or ONT ID..."
                value={searchSerial}
                onChange={(e) => setSearchSerial(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedOlt} onValueChange={setSelectedOlt}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All OLTs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All OLTs</SelectItem>
                {olts.map(olt => (
                  <SelectItem key={olt} value={olt}>{olt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={runAiAnalysis} disabled={isAnalyzing || degradingOnts.length === 0}>
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              AI Analysis
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{allOnts.length}</div>
                <div className="text-xs text-gray-500">ONTs with History</div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{degradingOnts.length}</div>
                <div className="text-xs text-gray-500">Degrading ONTs</div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredOnts.length - degradingOnts.length}
                </div>
                <div className="text-xs text-gray-500">Stable ONTs</div>
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis Results */}
          {aiAnalysis && (
            <Card className="border-2 border-purple-300 bg-purple-50 dark:bg-purple-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
                  <Sparkles className="h-4 w-4" />
                  AI Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <Label className="text-xs text-gray-500">Overall Assessment</Label>
                  <p className="text-sm mt-1">{aiAnalysis.overall_assessment}</p>
                </div>

                {aiAnalysis.systemic_issues?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Systemic Issues Detected</Label>
                    {aiAnalysis.systemic_issues.map((issue, idx) => (
                      <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded-lg border-l-4 border-amber-500">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <Badge className={getSeverityColor(issue.severity)}>{issue.severity}</Badge>
                        </div>
                        <p className="text-sm">{issue.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          <strong>Recommendation:</strong> {issue.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {aiAnalysis.ont_findings?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Individual ONT Findings</Label>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {aiAnalysis.ont_findings.map((finding, idx) => (
                        <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold">{finding.serial}</span>
                            <Badge className={getSeverityColor(finding.severity)} variant="outline">
                              {finding.severity}
                            </Badge>
                          </div>
                          <div className="text-gray-600 mt-1">
                            <span className="font-medium">Pattern:</span> {finding.pattern} | 
                            <span className="font-medium ml-1">Cause:</span> {finding.likely_cause}
                          </div>
                          <div className="text-blue-600 mt-0.5">{finding.recommendation}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Degrading ONTs List */}
          {degradingOnts.length > 0 && (
            <Card className="border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  ONTs with Performance Degradation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial</TableHead>
                        <TableHead>OLT/Port</TableHead>
                        <TableHead className="text-right">First Rx</TableHead>
                        <TableHead className="text-right">Latest Rx</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {degradingOnts.slice(0, 15).map((ont, idx) => {
                        const rxTrend = calculateTrend(ont.dataPoints, 'OntRxOptPwr');
                        return (
                          <TableRow 
                            key={idx} 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => setSelectedOnt(ont)}
                          >
                            <TableCell className="font-mono text-xs">{ont.serial}</TableCell>
                            <TableCell className="text-xs">{ont.olt}/{ont.port}</TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {rxTrend?.first?.toFixed(1)} dBm
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {rxTrend?.last?.toFixed(1)} dBm
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-red-100 text-red-800 border-red-300">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                {rxTrend?.change?.toFixed(1)} dB
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedOnt(ont); }}>
                                <Activity className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected ONT Detail Chart */}
          {selectedOnt && (
            <Card className="border-2 border-blue-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    {selectedOnt.serial} - Performance History
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedOnt(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-gray-500">
                  {selectedOnt.olt} / {selectedOnt.port} • {selectedOnt.dataPoints.length} data points
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="power" domain={[-35, -5]} tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="errors" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip 
                        labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <ReferenceLine yAxisId="power" y={-27} stroke="red" strokeDasharray="5 5" label={{ value: 'Critical', fontSize: 8 }} />
                      <ReferenceLine yAxisId="power" y={-25} stroke="orange" strokeDasharray="5 5" label={{ value: 'Warning', fontSize: 8 }} />
                      <Line 
                        yAxisId="power"
                        type="monotone" 
                        dataKey="ONT Rx (dBm)" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line 
                        yAxisId="power"
                        type="monotone" 
                        dataKey="OLT Rx (dBm)" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line 
                        yAxisId="errors"
                        type="monotone" 
                        dataKey="US BIP Errors" 
                        stroke="#f59e0b" 
                        strokeWidth={1}
                        dot={{ r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Data points table */}
                <div className="mt-4 max-h-32 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs text-right">ONT Rx</TableHead>
                        <TableHead className="text-xs text-right">OLT Rx</TableHead>
                        <TableHead className="text-xs text-right">US BIP</TableHead>
                        <TableHead className="text-xs text-right">DS BIP</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOnt.dataPoints.map((dp, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs">{moment(dp.date).format('MM/DD/YY HH:mm')}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{dp.OntRxOptPwr?.toFixed(1) || '-'}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{dp.OLTRXOptPwr?.toFixed(1) || '-'}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{dp.UpstreamBipErrors}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{dp.DownstreamBipErrors}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${
                              dp.status === 'critical' ? 'bg-red-50 text-red-700' :
                              dp.status === 'warning' ? 'bg-amber-50 text-amber-700' :
                              'bg-green-50 text-green-700'
                            }`}>
                              {dp.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No data message */}
          {filteredOnts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No ONTs with multiple data points found.</p>
              <p className="text-sm">Upload more reports to see trends.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}