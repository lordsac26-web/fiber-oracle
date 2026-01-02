import React, { useState, useMemo, useEffect } from 'react';
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
  BarChart3,
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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [ontRecords, setOntRecords] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState(['ONT Rx (dBm)', 'OLT Rx (dBm)']);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Load all ONT records for these reports
  useEffect(() => {
    const loadOntRecords = async () => {
      if (reports.length === 0) {
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      try {
        const reportIds = reports.map(r => r.id);
        
        console.log(`Loading ONT records for ${reportIds.length} reports:`, reportIds);
        
        // Fetch ONT records for each report separately to avoid loading stale data
        const allRecordsForTheseReports = [];
        
        for (const reportId of reportIds) {
          try {
            const recordsForReport = await base44.entities.ONTPerformanceRecord.filter({ report_id: reportId });
            console.log(`Report ${reportId}: Found ${recordsForReport.length} ONT records`);
            allRecordsForTheseReports.push(...recordsForReport);
          } catch (err) {
            console.warn(`Failed to load records for report ${reportId}:`, err);
          }
        }
        
        console.log(`Total ONT records loaded: ${allRecordsForTheseReports.length}`);
        
        // Log sample data to verify serial number format
        if (allRecordsForTheseReports.length > 0) {
          console.log('Sample ONT records (first 3):', allRecordsForTheseReports.slice(0, 3).map(r => ({
            serial: r.serial_number,
            reportId: r.report_id,
            ontRx: r.ont_rx_power
          })));
        }
        
        setOntRecords(allRecordsForTheseReports);
      } catch (error) {
        console.error('Failed to load ONT records:', error);
        toast.error('Failed to load historical data');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadOntRecords();
  }, [reports]);

  // Track all unique ONTs and those with history separately
  const { allUniqueOnts, ontsWithHistory } = useMemo(() => {
    if (isLoadingData || ontRecords.length === 0) {
      console.log('allOnts: No data', { isLoadingData, recordCount: ontRecords.length });
      return { allUniqueOnts: 0, ontsWithHistory: [] };
    }

    console.log(`Processing ${ontRecords.length} ONT records from ${reports.length} reports`);

    const ontMap = new Map();
    let skippedNoSerial = 0;
    
    ontRecords.forEach(record => {
      if (record.serial_number) {
        if (!ontMap.has(record.serial_number)) {
          ontMap.set(record.serial_number, {
            serial: record.serial_number,
            ontId: record.ont_id,
            olt: record.olt_name,
            port: record.shelf_slot_port,
            model: record.model,
            dataPoints: []
          });
        }
        const report = reports.find(r => r.id === record.report_id);
        const dataPoint = {
          date: record.report_date || report?.upload_date,
          reportName: report?.report_name,
          reportId: record.report_id,
          OntRxOptPwr: record.ont_rx_power,
          OLTRXOptPwr: record.olt_rx_power,
          OntTxPwr: record.ont_tx_power,
          UpstreamBipErrors: record.us_bip_errors || 0,
          DownstreamBipErrors: record.ds_bip_errors || 0,
          UpstreamFecUncorrected: record.us_fec_uncorrected || 0,
          DownstreamFecUncorrected: record.ds_fec_uncorrected || 0,
          status: record.status || 'ok'
        };
        ontMap.get(record.serial_number).dataPoints.push(dataPoint);
      } else {
        skippedNoSerial++;
      }
    });
    
    console.log(`Found ${ontMap.size} unique ONT serials, skipped ${skippedNoSerial} records without serial`);
    
    // Sort data points by date for each ONT and filter to only those with multiple data points
    const withHistory = [];
    const withSinglePoint = [];
    
    ontMap.forEach(ont => {
      ont.dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Group by unique report IDs to see if ONT appears in multiple reports
      const uniqueReportIds = new Set(ont.dataPoints.map(d => d.reportId));
      
      // Only include ONTs that appear in multiple reports
      if (uniqueReportIds.size > 1) {
        withHistory.push(ont);
      } else {
        withSinglePoint.push(ont);
      }
    });
    
    console.log(`ONTs with history (multiple reports): ${withHistory.length}`);
    console.log(`ONTs with single report: ${withSinglePoint.length}`);
    
    if (withHistory.length > 0) {
      console.log('Sample ONT with history:', {
        serial: withHistory[0].serial,
        dataPointCount: withHistory[0].dataPoints.length,
        uniqueReports: new Set(withHistory[0].dataPoints.map(d => d.reportId)).size,
        reports: withHistory[0].dataPoints.map(d => d.reportName)
      });
    }
    
    if (withSinglePoint.length > 0 && withHistory.length === 0) {
      console.log('All ONTs only appear in one report each. Sample:', {
        serial: withSinglePoint[0].serial,
        dataPointCount: withSinglePoint[0].dataPoints.length,
        reportId: withSinglePoint[0].dataPoints[0].reportId,
        reportName: withSinglePoint[0].dataPoints[0].reportName
      });
      console.log('To see trends, upload the same report multiple times or upload reports with overlapping ONTs');
    }
    
    return { allUniqueOnts: ontMap.size, ontsWithHistory: withHistory };
  }, [reports, ontRecords, isLoadingData]);

  // Use ontsWithHistory as allOnts for backward compatibility
  const allOnts = ontsWithHistory;

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
    const filtered = allOnts.filter(ont => {
      const matchesSearch = !searchSerial || 
        ont.serial.toLowerCase().includes(searchSerial.toLowerCase()) ||
        ont.ontId?.toString().includes(searchSerial);
      const matchesOlt = selectedOlt === 'all' || ont.olt === selectedOlt;
      return matchesSearch && matchesOlt;
    });
    setCurrentPage(1); // Reset to page 1 when filters change
    return filtered;
  }, [allOnts, searchSerial, selectedOlt]);

  // Paginated ONTs
  const paginatedOnts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOnts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOnts, currentPage]);

  const totalPages = Math.ceil(filteredOnts.length / itemsPerPage);

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

  // Advanced anomaly detection with statistical analysis
  const detectAnomalies = (dataPoints, field) => {
    const anomalies = [];
    const validPoints = dataPoints.filter(d => d[field] !== null);
    if (validPoints.length < 3) return anomalies;
    
    const values = validPoints.map(p => p[field]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    for (let i = 1; i < validPoints.length; i++) {
      const currentValue = validPoints[i][field];
      const prevValue = validPoints[i-1][field];
      const change = currentValue - prevValue;
      
      // Z-score anomaly detection (statistical outlier)
      const zScore = Math.abs((currentValue - mean) / (stdDev || 1));
      const isStatisticalOutlier = zScore > 2.5; // 2.5 sigma threshold
      
      // Sudden drop detection (>2 dB drop)
      if (change < -2) {
        anomalies.push({
          index: i,
          date: validPoints[i].date,
          value: currentValue,
          change,
          zScore,
          type: 'sudden_drop',
          severity: change < -5 ? 'critical' : change < -3 ? 'high' : 'medium',
          message: `Sudden drop of ${Math.abs(change).toFixed(1)} dB detected`
        });
      }
      
      // Sudden improvement (possible maintenance/fix)
      if (change > 2) {
        anomalies.push({
          index: i,
          date: validPoints[i].date,
          value: currentValue,
          change,
          zScore,
          type: 'sudden_improvement',
          severity: 'info',
          message: `Sudden improvement of ${change.toFixed(1)} dB (possible maintenance)`
        });
      }
      
      // Statistical outlier detection
      if (isStatisticalOutlier && !anomalies.find(a => a.index === i)) {
        anomalies.push({
          index: i,
          date: validPoints[i].date,
          value: currentValue,
          change,
          zScore,
          type: 'statistical_outlier',
          severity: zScore > 3 ? 'high' : 'medium',
          message: `Statistical outlier detected (z-score: ${zScore.toFixed(2)})`
        });
      }
      
      // Gradual degradation detection (3+ consecutive drops)
      if (i >= 3) {
        const last3Changes = [
          validPoints[i][field] - validPoints[i-1][field],
          validPoints[i-1][field] - validPoints[i-2][field],
          validPoints[i-2][field] - validPoints[i-3][field]
        ];
        if (last3Changes.every(c => c < -0.5)) {
          const totalDrop = last3Changes.reduce((a, b) => a + b, 0);
          if (!anomalies.find(a => a.index === i && a.type === 'gradual_degradation')) {
            anomalies.push({
              index: i,
              date: validPoints[i].date,
              value: currentValue,
              change: totalDrop,
              type: 'gradual_degradation',
              severity: totalDrop < -3 ? 'high' : 'medium',
              message: `Gradual degradation: ${Math.abs(totalDrop).toFixed(1)} dB over 3+ readings`
            });
          }
        }
      }
      
      // Critical threshold breach
      if (field === 'OntRxOptPwr' && currentValue < -27 && prevValue >= -27) {
        anomalies.push({
          index: i,
          date: validPoints[i].date,
          value: currentValue,
          change,
          type: 'threshold_breach',
          severity: 'critical',
          message: `Breached critical threshold: ${currentValue.toFixed(1)} dBm < -27 dBm`
        });
      }
      
      // Erratic behavior (high variance in recent readings)
      if (i >= 4) {
        const last5Values = validPoints.slice(i - 4, i + 1).map(p => p[field]);
        const recentVariance = last5Values.reduce((sum, val) => 
          sum + Math.pow(val - (last5Values.reduce((a, b) => a + b, 0) / last5Values.length), 2), 0
        ) / last5Values.length;
        const recentStdDev = Math.sqrt(recentVariance);
        
        if (recentStdDev > stdDev * 2 && recentStdDev > 2) {
          if (!anomalies.find(a => a.index === i && a.type === 'erratic_behavior')) {
            anomalies.push({
              index: i,
              date: validPoints[i].date,
              value: currentValue,
              type: 'erratic_behavior',
              severity: 'medium',
              message: `Erratic behavior: High variance (σ=${recentStdDev.toFixed(2)})`
            });
          }
        }
      }
    }
    
    return anomalies;
  };

  // Detect all anomalies across network
  const allAnomalies = useMemo(() => {
    const detected = [];
    allOnts.slice(0, 100).forEach(ont => {
      const ontAnomalies = detectAnomalies(ont.dataPoints, 'OntRxOptPwr');
      if (ontAnomalies.length > 0) {
        detected.push({
          serial: ont.serial,
          olt: ont.olt,
          port: ont.port,
          anomalies: ontAnomalies,
          criticalCount: ontAnomalies.filter(a => a.severity === 'critical').length,
          highCount: ontAnomalies.filter(a => a.severity === 'high').length,
          mediumCount: ontAnomalies.filter(a => a.severity === 'medium').length,
        });
      }
    });
    return detected.sort((a, b) => 
      (b.criticalCount * 100 + b.highCount * 10 + b.mediumCount) - 
      (a.criticalCount * 100 + a.highCount * 10 + a.mediumCount)
    );
  }, [allOnts]);

  // AI Analysis
  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Prepare comprehensive analysis data with anomalies
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
        allDetectedAnomalies: allAnomalies.slice(0, 20).map(item => ({
          serial: item.serial,
          olt: item.olt,
          port: item.port,
          anomalies: item.anomalies.map(a => ({
            type: a.type,
            severity: a.severity,
            date: moment(a.date).format('YYYY-MM-DD'),
            value: a.value,
            change: a.change,
            message: a.message
          }))
        })),
        correlatedIssues: correlatedIssues.slice(0, 10),
        predictions: predictions.slice(0, 15),
        networkStats: {
          totalOntsTracked: allOnts.length,
          degradingCount: degradingOnts.length,
          correlatedPortCount: correlatedIssues.length,
          criticalPredictions: predictions.filter(p => p.riskLevel === 'critical').length,
          totalAnomaliesDetected: allAnomalies.reduce((sum, a) => sum + a.anomalies.length, 0),
          criticalAnomalies: allAnomalies.reduce((sum, a) => sum + a.criticalCount, 0)
        }
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert fiber optic network performance analyst with deep knowledge of PON/FTTH infrastructure and anomaly detection. Analyze this comprehensive ONT performance data including detected anomalies and provide detailed root cause analysis with confidence scores.

DATA:
${JSON.stringify(analysisData, null, 2)}

ANOMALY DETECTION SUMMARY:
- Total anomalies detected: ${analysisData.networkStats.totalAnomaliesDetected}
- Critical anomalies: ${analysisData.networkStats.criticalAnomalies}
- Anomaly types include: sudden_drop, sudden_improvement, statistical_outlier, gradual_degradation, threshold_breach, erratic_behavior

ANALYSIS REQUIREMENTS:

1. OVERALL NETWORK HEALTH: Score 0-100 with status and summary, considering anomaly frequency and severity.

2. ANOMALY PATTERN ANALYSIS:
Analyze the detected anomalies and identify patterns:
- Are anomalies clustered by time (indicating network-wide events)?
- Are anomalies clustered by location (indicating localized issues)?
- What types of anomalies are most common?
- Are there cyclic patterns suggesting environmental factors?

3. ROOT CAUSE ANALYSIS FOR CORRELATED ISSUES:
When multiple ONTs on the same port/OLT degrade together, provide detailed root cause analysis:
- For each correlated issue, suggest 2-3 possible root causes with confidence percentages (must sum to ~100%)
- Consider these specific causes:
  * Feeder fiber degradation (macrobend, stress point, rodent damage)
  * Splitter degradation or failure (optical splitter aging, water ingress)
  * OLT optic degradation (laser aging, dirty OLT port)
  * LCP/cabinet environmental issues (moisture, temperature extremes, flooding)
  * Upstream connector contamination (dirty SC/APC at splitter input)
  * Splice degradation (fusion splice aging, mechanical splice failure)

4. ROOT CAUSE ANALYSIS FOR INDIVIDUAL ONT DEGRADATION:
For each degrading ONT, suggest specific causes with confidence:
- Dirty drop connector (SC/APC at ONT or at LCP)
- Drop fiber damage (macrobend in drop cable, staple through cable)
- Drop splice issue (if applicable)
- ONT optic degradation
- Patch cord issue at customer premise

5. ANOMALY ROOT CAUSES (CRITICAL):
For each major anomaly type detected:
- sudden_drop: Likely physical damage, connector disturbance, or environmental event
- sudden_improvement: Recent maintenance, cleaning, or splice repair
- gradual_degradation: Progressive fiber/connector degradation, environmental stress
- threshold_breach: Critical service impacting, immediate action required
- erratic_behavior: Unstable connection, loose connector, intermittent fault
- statistical_outlier: Unusual reading requiring verification

6. PREDICTIVE MAINTENANCE & PROACTIVE ALERTS:
Based on detected anomalies and trends, identify ONTs that will likely fail soon.
Provide specific timeline estimates and recommended preemptive actions.

7. PRIORITIZED ACTION PLAN with specific tools/procedures needed.
Include urgency level (immediate, soon, scheduled) for each action.

Be very specific with serial numbers, locations, confidence percentages, and recommended test equipment.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_health: {
              type: "object",
              properties: {
                score: { type: "number" },
                status: { type: "string" },
                summary: { type: "string" },
                anomaly_impact: { type: "string" }
              }
            },
            anomaly_patterns: {
              type: "object",
              properties: {
                temporal_clustering: { type: "string" },
                spatial_clustering: { type: "string" },
                most_common_types: { type: "array", items: { type: "string" } },
                cyclic_patterns: { type: "string" }
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
                  severity: { type: "string" },
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
                  },
                  recommended_action: { type: "string" },
                  urgency: { type: "string" }
                }
              }
            },
            proactive_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  alert_id: { type: "string" },
                  severity: { type: "string" },
                  affected_onts: { type: "array", items: { type: "string" } },
                  issue_type: { type: "string" },
                  description: { type: "string" },
                  estimated_time_to_failure: { type: "string" },
                  recommended_action: { type: "string" },
                  urgency: { type: "string" }
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

  // Available metrics for selection
  const AVAILABLE_METRICS = [
    { key: 'ONT Rx (dBm)', label: 'ONT Rx Power', yAxisId: 'power', color: '#3b82f6', type: 'power' },
    { key: 'OLT Rx (dBm)', label: 'OLT Rx Power', yAxisId: 'power', color: '#10b981', type: 'power' },
    { key: 'ONT Tx (dBm)', label: 'ONT Tx Power', yAxisId: 'power', color: '#8b5cf6', type: 'power' },
    { key: 'US BIP Errors', label: 'Upstream BIP Errors', yAxisId: 'errors', color: '#f59e0b', type: 'errors' },
    { key: 'DS BIP Errors', label: 'Downstream BIP Errors', yAxisId: 'errors', color: '#ef4444', type: 'errors' },
    { key: 'US FEC Uncorrected', label: 'Upstream FEC Uncorrected', yAxisId: 'errors', color: '#ec4899', type: 'errors' },
    { key: 'DS FEC Uncorrected', label: 'Downstream FEC Uncorrected', yAxisId: 'errors', color: '#f97316', type: 'errors' },
  ];

  // Chart data for selected ONT with anomaly markers
  const chartData = useMemo(() => {
    if (!selectedOnt) return [];
    const anomalyDates = new Set(selectedOntAnomalies.map(a => a.date));
    return selectedOnt.dataPoints.map((d, idx) => ({
      date: moment(d.date).format('MM/DD'),
      fullDate: moment(d.date).format('YYYY-MM-DD HH:mm'),
      'ONT Rx (dBm)': d.OntRxOptPwr,
      'OLT Rx (dBm)': d.OLTRXOptPwr,
      'ONT Tx (dBm)': d.OntTxPwr,
      'US BIP Errors': d.UpstreamBipErrors,
      'DS BIP Errors': d.DownstreamBipErrors,
      'US FEC Uncorrected': d.UpstreamFecUncorrected,
      'DS FEC Uncorrected': d.DownstreamFecUncorrected,
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
            <Button onClick={runAiAnalysis} disabled={isAnalyzing || filteredOnts.length === 0}>
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              AI Analysis
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="border">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-gray-600">{allUniqueOnts.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Total Unique ONTs</div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{allOnts.length}</div>
                <div className="text-xs text-gray-500">With History</div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">{degradingOnts.length}</div>
                <div className="text-xs text-gray-500">Degrading</div>
              </CardContent>
            </Card>
            <Card className="border border-purple-300 bg-purple-50">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {allAnomalies.length}
                </div>
                <div className="text-xs text-purple-700">Anomalies Detected</div>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {allOnts.length > 0 ? allOnts.length - degradingOnts.length : 0}
                </div>
                <div className="text-xs text-gray-500">Stable</div>
              </CardContent>
            </Card>
          </div>

          {/* Anomaly Alerts Banner */}
          {allAnomalies.length > 0 && (
            <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
                  <Sparkles className="h-4 w-4" />
                  Advanced Anomaly Detection Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <Badge className="bg-red-100 text-red-800">
                      {allAnomalies.reduce((sum, a) => sum + a.criticalCount, 0)} Critical
                    </Badge>
                    <Badge className="bg-orange-100 text-orange-800">
                      {allAnomalies.reduce((sum, a) => sum + a.highCount, 0)} High Severity
                    </Badge>
                    <Badge className="bg-amber-100 text-amber-800">
                      {allAnomalies.reduce((sum, a) => sum + a.mediumCount, 0)} Medium
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-700">
                      {allAnomalies.reduce((sum, a) => sum + a.anomalies.length, 0)} Total Anomalies
                    </Badge>
                  </div>
                  <p className="text-sm text-purple-700">
                    Statistical anomaly detection identified {allAnomalies.length} ONTs with unusual behavior patterns. 
                    Run AI Analysis for detailed root cause identification and proactive maintenance recommendations.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {allAnomalies.slice(0, 5).map((item, idx) => (
                      <Badge 
                        key={idx}
                        variant="outline" 
                        className={`text-[10px] cursor-pointer ${
                          item.criticalCount > 0 ? 'bg-red-50 border-red-300 text-red-700' :
                          item.highCount > 0 ? 'bg-orange-50 border-orange-300 text-orange-700' :
                          'bg-amber-50 border-amber-300 text-amber-700'
                        }`}
                        onClick={() => setSearchSerial(item.serial)}
                      >
                        {item.serial}: {item.anomalies.length} anomalies
                      </Badge>
                    ))}
                    {allAnomalies.length > 5 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{allAnomalies.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

                {/* Anomaly Pattern Analysis */}
                {aiAnalysis.anomaly_patterns && (
                  <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200">
                    <Label className="text-xs text-purple-800 font-semibold mb-2 flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      Anomaly Pattern Analysis
                    </Label>
                    <div className="space-y-1.5 text-xs">
                      {aiAnalysis.anomaly_patterns.temporal_clustering && (
                        <div><strong>Time Clustering:</strong> {aiAnalysis.anomaly_patterns.temporal_clustering}</div>
                      )}
                      {aiAnalysis.anomaly_patterns.spatial_clustering && (
                        <div><strong>Location Clustering:</strong> {aiAnalysis.anomaly_patterns.spatial_clustering}</div>
                      )}
                      {aiAnalysis.anomaly_patterns.most_common_types?.length > 0 && (
                        <div><strong>Common Types:</strong> {aiAnalysis.anomaly_patterns.most_common_types.join(', ')}</div>
                      )}
                      {aiAnalysis.anomaly_patterns.cyclic_patterns && (
                        <div><strong>Cyclic Patterns:</strong> {aiAnalysis.anomaly_patterns.cyclic_patterns}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Proactive Alerts */}
                {aiAnalysis.proactive_alerts?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      Proactive Alerts ({aiAnalysis.proactive_alerts.length})
                    </Label>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {aiAnalysis.proactive_alerts.map((alert, idx) => (
                        <div key={idx} className={`p-3 rounded-lg border-l-4 ${
                          alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                          alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                          'bg-amber-50 border-amber-500'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm">{alert.issue_type}</span>
                            <div className="flex items-center gap-2">
                              <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                              <Badge variant="outline" className="text-[10px]">{alert.urgency}</Badge>
                            </div>
                          </div>
                          <p className="text-xs text-gray-700 mb-1">{alert.description}</p>
                          {alert.affected_onts?.length > 0 && (
                            <div className="text-xs text-gray-600 mb-1">
                              <strong>Affected:</strong> {alert.affected_onts.slice(0, 3).join(', ')}
                              {alert.affected_onts.length > 3 && ` +${alert.affected_onts.length - 3} more`}
                            </div>
                          )}
                          {alert.estimated_time_to_failure && (
                            <div className="text-xs text-red-700 font-medium">
                              ⏱️ Est. Time to Failure: {alert.estimated_time_to_failure}
                            </div>
                          )}
                          <div className="text-xs text-blue-700 mt-1">
                            <strong>Action:</strong> {alert.recommended_action}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Anomaly Explanations with Root Causes */}
                {aiAnalysis.anomaly_explanations?.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Detailed Anomaly Root Cause Analysis</Label>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {aiAnalysis.anomaly_explanations.map((anomaly, idx) => (
                        <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded-lg border">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono font-bold text-sm">{anomaly.serial}</span>
                            <span className="text-gray-500 text-xs">{anomaly.date}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] ${
                                anomaly.severity === 'critical' ? 'bg-red-50 border-red-400 text-red-700' :
                                anomaly.severity === 'high' ? 'bg-orange-50 border-orange-400 text-orange-700' :
                                anomaly.type === 'sudden_improvement' ? 'bg-green-50 border-green-300 text-green-700' :
                                'bg-amber-50 border-amber-300 text-amber-700'
                              }`}
                            >
                              {anomaly.type?.replace(/_/g, ' ')}
                              {anomaly.change_db && ` (${anomaly.change_db > 0 ? '+' : ''}${anomaly.change_db.toFixed(1)} dB)`}
                            </Badge>
                            {anomaly.urgency && (
                              <Badge className={`text-[10px] ${
                                anomaly.urgency === 'immediate' ? 'bg-red-100 text-red-800' :
                                anomaly.urgency === 'soon' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {anomaly.urgency}
                              </Badge>
                            )}
                          </div>
                          {anomaly.root_causes?.length > 0 && (
                            <div className="space-y-1 mt-1.5 mb-1.5">
                              {anomaly.root_causes.map((rc, rcIdx) => (
                                <div key={rcIdx} className="flex items-start gap-2 text-xs pl-2">
                                  <div className="flex items-center gap-1 min-w-[50px]">
                                    <div 
                                      className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
                                      style={{ width: `${rc.confidence * 0.4}px` }}
                                    />
                                    <span className="font-bold text-blue-700">{rc.confidence}%</span>
                                  </div>
                                  <div className="flex-1">
                                    <span className="font-medium">{rc.cause}</span>
                                    {rc.explanation && (
                                      <p className="text-gray-500 text-[10px] mt-0.5">{rc.explanation}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {anomaly.recommended_action && (
                            <div className="text-xs text-green-700 bg-green-50 p-1.5 rounded mt-1">
                              <strong>✓ Action:</strong> {anomaly.recommended_action}
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

          {/* ONTs List with Search Results */}
          {filteredOnts.length > 0 && (
            <Card className="border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    {searchSerial ? `Search Results (${filteredOnts.length})` : 'All ONTs with History'}
                  </CardTitle>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-gray-500">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial</TableHead>
                        <TableHead>ONT ID</TableHead>
                        <TableHead>OLT/Port</TableHead>
                        <TableHead className="text-right">First Rx</TableHead>
                        <TableHead className="text-right">Latest Rx</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOnts.map((ont, idx) => {
                        const rxTrend = calculateTrend(ont.dataPoints, 'OntRxOptPwr');
                        const isDegrading = rxTrend && rxTrend.change < -1;
                        return (
                          <TableRow 
                            key={idx} 
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => setSelectedOnt(ont)}
                          >
                            <TableCell className="font-mono text-xs">{ont.serial}</TableCell>
                            <TableCell className="text-xs">{ont.ontId || '-'}</TableCell>
                            <TableCell className="text-xs">{ont.olt}/{ont.port}</TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {rxTrend?.first?.toFixed(1)} dBm
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {rxTrend?.last?.toFixed(1)} dBm
                            </TableCell>
                            <TableCell className="text-right">
                              {rxTrend?.change && (
                                <Badge className={isDegrading ? 'bg-red-100 text-red-800 border-red-300' : 'bg-green-100 text-green-800 border-green-300'}>
                                  {isDegrading ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                                  {rxTrend.change > 0 ? '+' : ''}{rxTrend.change?.toFixed(1)} dB
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`text-[10px] ${
                                ont.dataPoints[ont.dataPoints.length - 1]?.status === 'critical' ? 'bg-red-50 text-red-700 border-red-300' :
                                ont.dataPoints[ont.dataPoints.length - 1]?.status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                                'bg-green-50 text-green-700 border-green-300'
                              }`}>
                                {ont.dataPoints[ont.dataPoints.length - 1]?.status}
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

          {/* No search results message */}
          {!isLoadingData && searchSerial && filteredOnts.length === 0 && (
            <Card className="border border-amber-300 bg-amber-50 dark:bg-amber-900/20">
              <CardContent className="p-6 text-center">
                <Search className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                <h3 className="font-medium text-amber-800 dark:text-amber-200">No results found</h3>
                <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
                  No ONTs found matching "{searchSerial}"
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setSearchSerial('')}
                >
                  Clear Search
                </Button>
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
                {/* Metric Selector */}
                <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Label className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Select Metrics to Display
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_METRICS.map(metric => (
                      <Badge
                        key={metric.key}
                        variant={selectedMetrics.includes(metric.key) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        style={selectedMetrics.includes(metric.key) ? { backgroundColor: metric.color, borderColor: metric.color } : {}}
                        onClick={() => {
                          setSelectedMetrics(prev => 
                            prev.includes(metric.key) 
                              ? prev.filter(m => m !== metric.key)
                              : [...prev, metric.key]
                          );
                        }}
                      >
                        {metric.label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Click to toggle metrics on/off</p>
                </div>

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
                      {selectedMetrics.some(m => AVAILABLE_METRICS.find(am => am.key === m)?.type === 'power') && (
                        <YAxis yAxisId="power" domain={[-35, -5]} tick={{ fontSize: 10 }} label={{ value: 'dBm', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                      )}
                      {selectedMetrics.some(m => AVAILABLE_METRICS.find(am => am.key === m)?.type === 'errors') && (
                        <YAxis yAxisId="errors" orientation="right" tick={{ fontSize: 10 }} label={{ value: 'Errors', angle: 90, position: 'insideRight', fontSize: 10 }} />
                      )}
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
                      {selectedMetrics.includes('ONT Rx (dBm)') && (
                        <>
                          <ReferenceLine yAxisId="power" y={-27} stroke="red" strokeDasharray="5 5" label={{ value: 'Critical', fontSize: 8 }} />
                          <ReferenceLine yAxisId="power" y={-25} stroke="orange" strokeDasharray="5 5" label={{ value: 'Warning', fontSize: 8 }} />
                        </>
                      )}
                      {AVAILABLE_METRICS.filter(m => selectedMetrics.includes(m.key)).map(metric => {
                        if (metric.key === 'Predicted Rx') {
                          return (
                            <Line 
                              key={metric.key}
                              yAxisId={metric.yAxisId}
                              type="monotone" 
                              dataKey={metric.key}
                              stroke={metric.color}
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={{ r: 5, fill: metric.color }}
                            />
                          );
                        }
                        return (
                          <Line 
                            key={metric.key}
                            yAxisId={metric.yAxisId}
                            type="monotone" 
                            dataKey={metric.key}
                            stroke={metric.color}
                            strokeWidth={metric.type === 'power' ? 2 : 1}
                            dot={(props) => {
                              const { cx, cy, payload } = props;
                              if (metric.key === 'ONT Rx (dBm)' && payload?.isAnomaly) {
                                return (
                                  <g key={`anomaly-${cx}`}>
                                    <circle cx={cx} cy={cy} r={6} fill={payload.anomalyType === 'sudden_drop' ? '#ef4444' : '#22c55e'} />
                                    <circle cx={cx} cy={cy} r={3} fill="white" />
                                  </g>
                                );
                              }
                              return <circle cx={cx} cy={cy} r={metric.type === 'power' ? 3 : 2} fill={metric.color} />;
                            }}
                          />
                        );
                      })}
                      {selectedOntPrediction && selectedMetrics.some(m => AVAILABLE_METRICS.find(am => am.key === m)?.type === 'power') && (
                        <Line 
                          yAxisId="power"
                          type="monotone" 
                          dataKey="Predicted Rx" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 5, fill: '#8b5cf6' }}
                        />
                      )}
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
                        <TableHead className="text-xs text-right">ONT Tx</TableHead>
                        <TableHead className="text-xs text-right">US BIP</TableHead>
                        <TableHead className="text-xs text-right">DS BIP</TableHead>
                        <TableHead className="text-xs text-right">US FEC</TableHead>
                        <TableHead className="text-xs text-right">DS FEC</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOnt.dataPoints.map((dp, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs">{moment(dp.date).format('MM/DD/YY HH:mm')}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{dp.OntRxOptPwr?.toFixed(1) || '-'}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{dp.OLTRXOptPwr?.toFixed(1) || '-'}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{dp.OntTxPwr?.toFixed(1) || '-'}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{dp.UpstreamBipErrors}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{dp.DownstreamBipErrors}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{dp.UpstreamFecUncorrected}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{dp.DownstreamFecUncorrected}</TableCell>
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

          {/* Loading state */}
          {isLoadingData && (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-gray-500">Loading historical data...</p>
            </div>
          )}

          {/* No data message */}
          {!isLoadingData && allOnts.length === 0 && (
            <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-8 text-center">
                <History className="h-16 w-16 mx-auto mb-4 text-blue-400" />
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                  {ontRecords.length === 0 ? 'No Historical Data Found' : 'Waiting for Historical Trends'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  {ontRecords.length === 0 
                    ? 'No ONT records have been saved yet. Upload PON PM reports to start tracking performance over time.'
                    : `Found ${allUniqueOnts.toLocaleString()} unique ONTs across ${reports.length} reports, but each ONT only appears in one report.`}
                </p>
                {ontRecords.length > 0 && (
                  <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg max-w-md mx-auto">
                    <p className="text-xs text-gray-500 mb-2"><strong>To see trends:</strong></p>
                    <ul className="text-xs text-left text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• Upload the same network's PM export at different times</li>
                      <li>• ONTs must have the same serial numbers across reports</li>
                      <li>• Trends will appear automatically when ONTs appear in 2+ reports</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}