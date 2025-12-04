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

  // Group ONTs by port for correlation analysis
  const ontsByPort = useMemo(() => {
    const portMap = new Map();
    filteredOnts.forEach(ont => {
      const key = `${ont.olt}|${ont.port}`;
      if (!portMap.has(key)) {
        portMap.set(key, { olt: ont.olt, port: ont.port, onts: [] });
      }
      portMap.get(key).onts.push(ont);
    });
    return Array.from(portMap.values());
  }, [filteredOnts]);

  // Detect correlated degradation (multiple ONTs on same port/OLT degrading)
  const correlatedIssues = useMemo(() => {
    const issues = [];
    ontsByPort.forEach(portGroup => {
      const degradingInPort = portGroup.onts.filter(ont => {
        const rxTrend = calculateTrend(ont.dataPoints, 'OntRxOptPwr');
        return rxTrend && rxTrend.change < -1;
      });
      if (degradingInPort.length >= 2) {
        issues.push({
          type: 'port_correlation',
          olt: portGroup.olt,
          port: portGroup.port,
          affectedCount: degradingInPort.length,
          totalOnts: portGroup.onts.length,
          onts: degradingInPort.map(o => o.serial),
          avgDegradation: degradingInPort.reduce((sum, ont) => {
            const trend = calculateTrend(ont.dataPoints, 'OntRxOptPwr');
            return sum + (trend?.change || 0);
          }, 0) / degradingInPort.length
        });
      }
    });
    return issues;
  }, [ontsByPort]);

  // Predict future performance based on linear regression
  const predictFutureValue = (dataPoints, field, daysAhead = 30) => {
    const validPoints = dataPoints.filter(d => d[field] !== null);
    if (validPoints.length < 2) return null;
    
    // Simple linear regression
    const n = validPoints.length;
    const xValues = validPoints.map((_, i) => i);
    const yValues = validPoints.map(d => d[field]);
    
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Estimate days between data points
    const firstDate = new Date(validPoints[0].date);
    const lastDate = new Date(validPoints[validPoints.length - 1].date);
    const daysBetween = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
    const avgDaysPerPoint = daysBetween / (n - 1) || 1;
    
    // Predict future point
    const futureIndex = n + (daysAhead / avgDaysPerPoint);
    const predictedValue = slope * futureIndex + intercept;
    
    return {
      predicted: predictedValue,
      slope,
      daysToThreshold: slope < 0 ? ((-27 - intercept) / slope - n) * avgDaysPerPoint : null,
      confidence: n >= 4 ? 'high' : n >= 3 ? 'medium' : 'low'
    };
  };

  // Calculate predictions for degrading ONTs
  const predictions = useMemo(() => {
    return degradingOnts.map(ont => {
      const prediction = predictFutureValue(ont.dataPoints, 'OntRxOptPwr', 30);
      return {
        serial: ont.serial,
        olt: ont.olt,
        port: ont.port,
        currentRx: ont.dataPoints[ont.dataPoints.length - 1]?.OntRxOptPwr,
        predicted30Day: prediction?.predicted,
        daysToFailure: prediction?.daysToThreshold,
        confidence: prediction?.confidence,
        riskLevel: prediction?.predicted < -27 ? 'critical' : 
                   prediction?.predicted < -25 ? 'high' : 
                   prediction?.daysToThreshold && prediction.daysToThreshold < 60 ? 'medium' : 'low'
      };
    }).filter(p => p.predicted30Day !== null);
  }, [degradingOnts]);

  // Detect anomalies (sudden changes)
  const detectAnomalies = (dataPoints, field) => {
    const anomalies = [];
    const validPoints = dataPoints.filter(d => d[field] !== null);
    if (validPoints.length < 3) return anomalies;
    
    for (let i = 1; i < validPoints.length; i++) {
      const change = validPoints[i][field] - validPoints[i-1][field];
      // Sudden drop of more than 2 dB
      if (change < -2) {
        anomalies.push({
          index: i,
          date: validPoints[i].date,
          value: validPoints[i][field],
          change,
          type: 'sudden_drop'
        });
      }
      // Sudden improvement (possible maintenance)
      if (change > 2) {
        anomalies.push({
          index: i,
          date: validPoints[i].date,
          value: validPoints[i][field],
          change,
          type: 'sudden_improvement'
        });
      }
    }
    return anomalies;
  };

  // AI Analysis
  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Prepare comprehensive analysis data
      const analysisData = {
        degradingOnts: degradingOnts.slice(0, 15).map(ont => ({
          serial: ont.serial,
          olt: ont.olt,
          port: ont.port,
          dataPoints: ont.dataPoints.map(d => ({
            date: moment(d.date).format('YYYY-MM-DD'),
            ontRx: d.OntRxOptPwr,
            oltRx: d.OLTRXOptPwr,
            usBip: d.UpstreamBipErrors,
            dsBip: d.DownstreamBipErrors
          })),
          anomalies: detectAnomalies(ont.dataPoints, 'OntRxOptPwr')
        })),
        correlatedIssues: correlatedIssues.slice(0, 10),
        predictions: predictions.slice(0, 15),
        networkStats: {
          totalOntsTracked: allOnts.length,
          degradingCount: degradingOnts.length,
          correlatedPortCount: correlatedIssues.length,
          criticalPredictions: predictions.filter(p => p.riskLevel === 'critical').length
        }
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert fiber optic network performance analyst with deep knowledge of PON/FTTH infrastructure. Analyze this comprehensive ONT performance data and provide detailed root cause analysis with confidence scores.

DATA:
${JSON.stringify(analysisData, null, 2)}

ANALYSIS REQUIREMENTS:

1. OVERALL NETWORK HEALTH: Score 0-100 with status and summary.

2. ROOT CAUSE ANALYSIS FOR CORRELATED ISSUES:
When multiple ONTs on the same port/OLT degrade together, provide detailed root cause analysis:
- For each correlated issue, suggest 2-3 possible root causes with confidence percentages (must sum to ~100%)
- Consider these specific causes:
  * Feeder fiber degradation (macrobend, stress point, rodent damage)
  * Splitter degradation or failure (optical splitter aging, water ingress)
  * OLT optic degradation (laser aging, dirty OLT port)
  * LCP/cabinet environmental issues (moisture, temperature extremes, flooding)
  * Upstream connector contamination (dirty SC/APC at splitter input)
  * Splice degradation (fusion splice aging, mechanical splice failure)

3. ROOT CAUSE ANALYSIS FOR INDIVIDUAL ONT DEGRADATION:
For each degrading ONT, suggest specific causes with confidence:
- Dirty drop connector (SC/APC at ONT or at LCP)
- Drop fiber damage (macrobend in drop cable, staple through cable)
- Drop splice issue (if applicable)
- ONT optic degradation
- Patch cord issue at customer premise

4. ANOMALY ROOT CAUSES:
For sudden drops (>2dB change), suggest:
- New physical damage (construction hit, storm damage)
- Connector disturbance (someone unplugged/replugged)
- Environmental event (flooding, extreme temperature)
For sudden improvements:
- Recent maintenance (cleaning, splice repair)
- Environmental recovery (temperature normalization)

5. PREDICTIVE MAINTENANCE with root cause context:
Include what likely needs to be fixed based on degradation pattern.

6. PRIORITIZED ACTION PLAN with specific tools/procedures needed.

Be very specific with serial numbers, locations, confidence percentages, and recommended test equipment.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_health: {
              type: "object",
              properties: {
                score: { type: "number" },
                status: { type: "string" },
                summary: { type: "string" }
              }
            },
            correlated_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  location: { type: "string" },
                  affected_onts: { type: "array", items: { type: "string" } },
                  severity: { type: "string" },
                  evidence: { type: "string" },
                  root_causes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        cause: { type: "string" },
                        confidence: { type: "number" },
                        explanation: { type: "string" },
                        test_to_confirm: { type: "string" }
                      }
                    }
                  }
                }
              }
            },
            ont_root_causes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  serial: { type: "string" },
                  location: { type: "string" },
                  degradation_pattern: { type: "string" },
                  root_causes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        cause: { type: "string" },
                        confidence: { type: "number" },
                        explanation: { type: "string" },
                        fix_procedure: { type: "string" }
                      }
                    }
                  }
                }
              }
            },
            predictive_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  serial: { type: "string" },
                  location: { type: "string" },
                  days_to_failure: { type: "number" },
                  current_rx: { type: "number" },
                  predicted_rx: { type: "number" },
                  priority: { type: "string" },
                  likely_fix: { type: "string" },
                  action: { type: "string" }
                }
              }
            },
            anomaly_explanations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  serial: { type: "string" },
                  date: { type: "string" },
                  type: { type: "string" },
                  change_db: { type: "number" },
                  root_causes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        cause: { type: "string" },
                        confidence: { type: "number" },
                        explanation: { type: "string" }
                      }
                    }
                  }
                }
              }
            },
            systemic_patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string" },
                  affected_area: { type: "string" },
                  evidence: { type: "string" },
                  root_cause: { type: "string" },
                  confidence: { type: "number" },
                  recommendation: { type: "string" }
                }
              }
            },
            action_plan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "number" },
                  action: { type: "string" },
                  location: { type: "string" },
                  root_cause_addressed: { type: "string" },
                  tools_needed: { type: "string" },
                  expected_impact: { type: "string" },
                  urgency: { type: "string" }
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

  // Anomalies for selected ONT
  const selectedOntAnomalies = useMemo(() => {
    if (!selectedOnt) return [];
    return detectAnomalies(selectedOnt.dataPoints, 'OntRxOptPwr');
  }, [selectedOnt]);

  // Prediction for selected ONT
  const selectedOntPrediction = useMemo(() => {
    if (!selectedOnt) return null;
    return predictFutureValue(selectedOnt.dataPoints, 'OntRxOptPwr', 30);
  }, [selectedOnt]);

  // Chart data for selected ONT with anomaly markers
  const chartData = useMemo(() => {
    if (!selectedOnt) return [];
    const anomalyDates = new Set(selectedOntAnomalies.map(a => a.date));
    return selectedOnt.dataPoints.map((d, idx) => ({
      date: moment(d.date).format('MM/DD'),
      fullDate: moment(d.date).format('YYYY-MM-DD HH:mm'),
      'ONT Rx (dBm)': d.OntRxOptPwr,
      'OLT Rx (dBm)': d.OLTRXOptPwr,
      'US BIP Errors': d.UpstreamBipErrors,
      'DS BIP Errors': d.DownstreamBipErrors,
      isAnomaly: anomalyDates.has(d.date),
      anomalyType: selectedOntAnomalies.find(a => a.date === d.date)?.type,
    }));
  }, [selectedOnt, selectedOntAnomalies]);

  // Add prediction point to chart
  const chartDataWithPrediction = useMemo(() => {
    if (!selectedOntPrediction || !chartData.length) return chartData;
    return [
      ...chartData,
      {
        date: '+30d',
        fullDate: 'Predicted (30 days)',
        'ONT Rx (dBm)': null,
        'Predicted Rx': selectedOntPrediction.predicted,
        isPrediction: true,
      }
    ];
  }, [chartData, selectedOntPrediction]);

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

          {/* Correlated Issues Alert */}
          {correlatedIssues.length > 0 && (
            <Card className="border-2 border-orange-300 bg-orange-50 dark:bg-orange-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-4 w-4" />
                  Correlated Degradation Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {correlatedIssues.slice(0, 5).map((issue, idx) => (
                    <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{issue.olt} / {issue.port}</span>
                        <Badge className="bg-orange-100 text-orange-800">
                          {issue.affectedCount}/{issue.totalOnts} ONTs degrading
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Avg degradation: {issue.avgDegradation?.toFixed(1)} dB • 
                        Likely upstream issue (splitter/feeder)
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Predictive Alerts */}
          {predictions.filter(p => p.riskLevel === 'critical' || p.riskLevel === 'high').length > 0 && (
            <Card className="border-2 border-red-300 bg-red-50 dark:bg-red-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-800">
                  <TrendingDown className="h-4 w-4" />
                  Failure Predictions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {predictions.filter(p => p.riskLevel === 'critical' || p.riskLevel === 'high').slice(0, 8).map((pred, idx) => (
                    <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded-lg text-xs flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold">{pred.serial}</span>
                        <span className="text-gray-500 ml-2">{pred.olt}/{pred.port}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {pred.currentRx?.toFixed(1)} → {pred.predicted30Day?.toFixed(1)} dBm
                        </span>
                        {pred.daysToFailure && pred.daysToFailure < 90 && (
                          <Badge className="bg-red-100 text-red-800 text-[10px]">
                            ~{Math.round(pred.daysToFailure)} days to fail
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                {/* Overall Health Score */}
                {aiAnalysis.overall_health && (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs text-gray-500">Network Health</Label>
                      <Badge className={
                        aiAnalysis.overall_health.score >= 80 ? 'bg-green-100 text-green-800' :
                        aiAnalysis.overall_health.score >= 60 ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {aiAnalysis.overall_health.score}/100 - {aiAnalysis.overall_health.status}
                      </Badge>
                    </div>
                    <p className="text-sm">{aiAnalysis.overall_health.summary}</p>
                  </div>
                )}

                {/* Correlated Issues from AI with Root Causes */}
                {aiAnalysis.correlated_issues?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Correlated Issue Analysis</Label>
                    {aiAnalysis.correlated_issues.map((issue, idx) => (
                      <div key={idx} className="p-3 bg-white dark:bg-gray-800 rounded-lg border-l-4 border-orange-500">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm">{issue.location}</span>
                          <Badge className={getSeverityColor(issue.severity)}>{issue.severity}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{issue.evidence}</p>
                        {issue.root_causes?.length > 0 && (
                          <div className="space-y-1.5 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <Label className="text-[10px] text-gray-400 uppercase">Possible Root Causes</Label>
                            {issue.root_causes.map((rc, rcIdx) => (
                              <div key={rcIdx} className="flex items-start gap-2 text-xs">
                                <div className="flex items-center gap-1 min-w-[60px]">
                                  <div 
                                    className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-600"
                                    style={{ width: `${rc.confidence * 0.5}px` }}
                                  />
                                  <span className="font-bold text-orange-700">{rc.confidence}%</span>
                                </div>
                                <div className="flex-1">
                                  <span className="font-medium">{rc.cause}</span>
                                  <p className="text-gray-500 text-[10px]">{rc.explanation}</p>
                                  {rc.test_to_confirm && (
                                    <p className="text-blue-600 text-[10px]">🔍 Test: {rc.test_to_confirm}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Individual ONT Root Causes */}
                {aiAnalysis.ont_root_causes?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Individual ONT Root Cause Analysis</Label>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {aiAnalysis.ont_root_causes.map((ont, idx) => (
                        <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded-lg border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-sm">{ont.serial}</span>
                            <span className="text-xs text-gray-500">{ont.location}</span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">Pattern: {ont.degradation_pattern}</p>
                          {ont.root_causes?.map((rc, rcIdx) => (
                            <div key={rcIdx} className="flex items-start gap-2 text-xs mb-1 pl-2 border-l-2 border-blue-300">
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] min-w-[45px] justify-center ${
                                  rc.confidence >= 70 ? 'bg-green-50 border-green-400 text-green-700' :
                                  rc.confidence >= 40 ? 'bg-amber-50 border-amber-400 text-amber-700' :
                                  'bg-gray-50 border-gray-400 text-gray-700'
                                }`}
                              >
                                {rc.confidence}%
                              </Badge>
                              <div className="flex-1">
                                <span className="font-medium">{rc.cause}</span>
                                {rc.fix_procedure && (
                                  <p className="text-green-600 text-[10px]">✓ Fix: {rc.fix_procedure}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Predictive Alerts from AI */}
                {aiAnalysis.predictive_alerts?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Predictive Maintenance Alerts</Label>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {aiAnalysis.predictive_alerts.map((alert, idx) => (
                        <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded text-xs border-l-4 border-red-400">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold">{alert.serial}</span>
                            <Badge className={getSeverityColor(alert.priority)}>{alert.priority}</Badge>
                          </div>
                          <div className="text-gray-600">
                            {alert.current_rx?.toFixed(1)} → {alert.predicted_rx?.toFixed(1)} dBm in ~{alert.days_to_failure} days
                          </div>
                          <div className="text-blue-600 mt-0.5"><strong>Action:</strong> {alert.action}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Anomaly Explanations with Root Causes */}
                {aiAnalysis.anomaly_explanations?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Anomaly Root Cause Analysis</Label>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {aiAnalysis.anomaly_explanations.map((anomaly, idx) => (
                        <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded-lg border">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold">{anomaly.serial}</span>
                            <span className="text-gray-500 text-xs">{anomaly.date}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] ${
                                anomaly.type === 'sudden_drop' ? 'bg-red-50 border-red-300 text-red-700' : 
                                'bg-green-50 border-green-300 text-green-700'
                              }`}
                            >
                              {anomaly.type === 'sudden_drop' ? '↓' : '↑'} {anomaly.change_db?.toFixed(1) || ''} dB
                            </Badge>
                          </div>
                          {anomaly.root_causes?.length > 0 && (
                            <div className="space-y-1 mt-1">
                              {anomaly.root_causes.map((rc, rcIdx) => (
                                <div key={rcIdx} className="flex items-center gap-2 text-xs pl-2">
                                  <div 
                                    className={`h-1.5 rounded-full ${
                                      anomaly.type === 'sudden_drop' ? 'bg-red-400' : 'bg-green-400'
                                    }`}
                                    style={{ width: `${rc.confidence * 0.4}px` }}
                                  />
                                  <span className="font-medium text-gray-700">{rc.confidence}%</span>
                                  <span>{rc.cause}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Systemic Patterns */}
                {aiAnalysis.systemic_patterns?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Systemic Patterns Detected</Label>
                    {aiAnalysis.systemic_patterns.map((pattern, idx) => (
                      <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded-lg border-l-4 border-purple-500 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{pattern.pattern}</span>
                          <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700">
                            {pattern.confidence}% confidence
                          </Badge>
                        </div>
                        <p className="text-gray-500">Area: {pattern.affected_area}</p>
                        <p className="text-gray-600">{pattern.evidence}</p>
                        <p className="text-purple-700 mt-1"><strong>Root Cause:</strong> {pattern.root_cause}</p>
                        <p className="text-blue-600"><strong>Action:</strong> {pattern.recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Plan with Tools */}
                {aiAnalysis.action_plan?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Prioritized Action Plan</Label>
                    <div className="space-y-1.5">
                      {aiAnalysis.action_plan.slice(0, 6).map((action, idx) => (
                        <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded-lg border text-xs">
                          <div className="flex items-start gap-2">
                            <Badge className={
                              action.urgency === 'immediate' ? 'bg-red-100 text-red-800' :
                              action.urgency === 'soon' ? 'bg-amber-100 text-amber-800' :
                              'bg-blue-100 text-blue-800'
                            }>
                              #{action.priority}
                            </Badge>
                            <div className="flex-1">
                              <p className="font-medium">{action.action}</p>
                              <p className="text-gray-500">{action.location}</p>
                              {action.root_cause_addressed && (
                                <p className="text-orange-600 text-[10px]">
                                  🎯 Addresses: {action.root_cause_addressed}
                                </p>
                              )}
                              {action.tools_needed && (
                                <p className="text-blue-600 text-[10px]">
                                  🛠️ Tools: {action.tools_needed}
                                </p>
                              )}
                              <p className="text-green-600 text-[10px]">
                                📈 Impact: {action.expected_impact}
                              </p>
                            </div>
                          </div>
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
                {/* Prediction & Anomaly Summary */}
                <div className="flex gap-2 mb-3 flex-wrap">
                  {selectedOntPrediction && (
                    <Badge variant="outline" className={
                      selectedOntPrediction.predicted < -27 ? 'bg-red-50 border-red-300 text-red-700' :
                      selectedOntPrediction.predicted < -25 ? 'bg-amber-50 border-amber-300 text-amber-700' :
                      'bg-blue-50 border-blue-300 text-blue-700'
                    }>
                      <TrendingDown className="h-3 w-3 mr-1" />
                      30-day prediction: {selectedOntPrediction.predicted?.toFixed(1)} dBm
                      ({selectedOntPrediction.confidence} confidence)
                    </Badge>
                  )}
                  {selectedOntPrediction?.daysToThreshold && selectedOntPrediction.daysToThreshold < 90 && (
                    <Badge className="bg-red-100 text-red-800">
                      ⚠️ Est. failure in ~{Math.round(selectedOntPrediction.daysToThreshold)} days
                    </Badge>
                  )}
                  {selectedOntAnomalies.length > 0 && (
                    <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700">
                      {selectedOntAnomalies.length} anomalies detected
                    </Badge>
                  )}
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartDataWithPrediction}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="power" domain={[-35, -5]} tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="errors" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip 
                        labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0]?.payload;
                          return (
                            <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-lg border text-xs">
                              <p className="font-medium">{data?.fullDate || label}</p>
                              {data?.isAnomaly && (
                                <p className="text-purple-600 font-bold">
                                  ⚡ Anomaly: {data.anomalyType === 'sudden_drop' ? 'Sudden Drop' : 'Sudden Improvement'}
                                </p>
                              )}
                              {data?.isPrediction && (
                                <p className="text-blue-600 font-bold">📈 Predicted Value</p>
                              )}
                              {payload.map((p, i) => (
                                <p key={i} style={{ color: p.color }}>
                                  {p.name}: {p.value?.toFixed(2)}
                                </p>
                              ))}
                            </div>
                          );
                        }}
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
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          if (payload?.isAnomaly) {
                            return (
                              <g key={`anomaly-${cx}`}>
                                <circle cx={cx} cy={cy} r={6} fill={payload.anomalyType === 'sudden_drop' ? '#ef4444' : '#22c55e'} />
                                <circle cx={cx} cy={cy} r={3} fill="white" />
                              </g>
                            );
                          }
                          return <circle cx={cx} cy={cy} r={3} fill="#3b82f6" />;
                        }}
                      />
                      <Line 
                        yAxisId="power"
                        type="monotone" 
                        dataKey="Predicted Rx" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 5, fill: '#8b5cf6' }}
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

                {/* Anomaly Legend */}
                {selectedOntAnomalies.length > 0 && (
                  <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs">
                    <span className="font-medium text-purple-800">Anomalies: </span>
                    {selectedOntAnomalies.map((a, i) => (
                      <span key={i} className="inline-flex items-center mr-3">
                        <span className={`w-2 h-2 rounded-full mr-1 ${a.type === 'sudden_drop' ? 'bg-red-500' : 'bg-green-500'}`} />
                        {moment(a.date).format('MM/DD')} ({a.change > 0 ? '+' : ''}{a.change.toFixed(1)} dB)
                      </span>
                    ))}
                  </div>
                )}

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