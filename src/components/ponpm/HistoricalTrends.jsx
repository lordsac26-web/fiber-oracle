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
  DialogDescription,
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
  Users,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { endOfDay, format, startOfDay } from 'date-fns';
import ONTComparisonView from './ONTComparisonView';
import EnhancedHistoryChart from './EnhancedHistoryChart';
import DateRangeFilter from './DateRangeFilter';

export default function HistoricalTrends({ reports, onClose }) {
  const [selectedOnt, setSelectedOnt] = useState(null);
  const [searchSerial, setSearchSerial] = useState('');
  const [selectedOlt, setSelectedOlt] = useState('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [ontRecords, setOntRecords] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [comparisonOnts, setComparisonOnts] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
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
        
        const allRecordsForTheseReports = [];
        
        // Fetch all records in parallel batches (more efficient than sequential N+1)
        const fetchReportRecords = async (reportId) => {
          const records = [];
          let skip = 0;
          const batchSize = 5000;
          let hasMore = true;
          
          while (hasMore) {
            const batch = await base44.entities.ONTPerformanceRecord.filter(
              { report_id: reportId },
              '-report_date',
              batchSize,
              skip
            );
            
            if (batch.length === 0) {
              hasMore = false;
            } else {
              records.push(...batch);
              skip += batchSize;
              if (batch.length < batchSize) hasMore = false;
            }
          }
          return records;
        };

        // Fetch up to 3 reports in parallel to balance speed vs API load
        const PARALLEL_LIMIT = 3;
        for (let i = 0; i < reportIds.length; i += PARALLEL_LIMIT) {
          const batch = reportIds.slice(i, i + PARALLEL_LIMIT);
          const results = await Promise.allSettled(batch.map(fetchReportRecords));
          
          results.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
              allRecordsForTheseReports.push(...result.value);
              console.log(`Report ${batch[idx]}: Loaded ${result.value.length} ONT records`);
            } else {
              console.warn(`Failed to load records for report ${batch[idx]}:`, result.reason);
            }
          });
        }
        
        console.log(`Total ONT records loaded: ${allRecordsForTheseReports.length}`);
        
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
      return { allUniqueOnts: 0, ontsWithHistory: [] };
    }

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
            lcp_number: record.lcp_number,
            _lcpNumber: record.lcp_number,
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
    
    const withHistory = [];
    
    ontMap.forEach(ont => {
      ont.dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));
      const uniqueReportIds = new Set(ont.dataPoints.map(d => d.reportId));
      if (uniqueReportIds.size > 1) {
        withHistory.push(ont);
      }
    });
    
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
    let currentFiltered = allOnts.filter(ont => {
      const matchesSearch = !searchSerial || 
        ont.serial.toLowerCase().includes(searchSerial.toLowerCase()) ||
        ont.ontId?.toString().includes(searchSerial);
      const matchesOlt = selectedOlt === 'all' || ont.olt === selectedOlt;
      return matchesSearch && matchesOlt;
    });

    // Apply date range filter to each ONT's dataPoints
    if (dateRange.start || dateRange.end) {
      const startDate = dateRange.start ? startOfDay(new Date(dateRange.start)) : null;
      const endDate = dateRange.end ? endOfDay(new Date(dateRange.end)) : null;

      currentFiltered = currentFiltered.map(ont => {
        const filteredDataPoints = ont.dataPoints.filter(dp => {
          const dpDate = new Date(dp.date);
          return (!startDate || dpDate >= startDate) &&
                 (!endDate || dpDate <= endDate);
        });
        return { ...ont, dataPoints: filteredDataPoints };
      }).filter(ont => ont.dataPoints.length > 0); // Only keep ONTs with data points in the range
    }

    return currentFiltered;
  }, [allOnts, searchSerial, selectedOlt, dateRange]);

  // Reset to page 1 when filters change (separate effect, not inside useMemo)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchSerial, selectedOlt, dateRange]);

  // Clear selected ONT when filters change
  useEffect(() => {
    setSelectedOnt(null);
  }, [searchSerial, selectedOlt, dateRange]);

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
      
      const zScore = Math.abs((currentValue - mean) / (stdDev || 1));
      
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
      
      if (change > 2) {
        anomalies.push({
          index: i,
          date: validPoints[i].date,
          value: currentValue,
          change,
          type: 'sudden_improvement',
          severity: 'info',
          message: `Sudden improvement of ${change.toFixed(1)} dB (possible maintenance)`
        });
      }
    }
    
    return anomalies;
  };

  // Detect all anomalies across network
  const allAnomalies = useMemo(() => {
    const detected = [];
    filteredOnts.slice(0, 100).forEach(ont => { // Use filteredOnts here
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
  }, [filteredOnts]); // Depend on filteredOnts

  // AI Analysis
  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysisData = {
        degradingOnts: degradingOnts.slice(0, 15).map(ont => ({
          serial: ont.serial,
          olt: ont.olt,
          port: ont.port,
          dataPoints: ont.dataPoints.map(d => ({
            date: format(new Date(d.date), 'yyyy-MM-dd'),
            ontRx: d.OntRxOptPwr,
            oltRx: d.OLTRXOptPwr,
            usBip: d.UpstreamBipErrors,
            dsBip: d.DownstreamBipErrors
          })),
          anomalies: detectAnomalies(ont.dataPoints, 'OntRxOptPwr')
        })),
        correlatedIssues: correlatedIssues.slice(0, 10),
        networkStats: {
          totalOntsTracked: allOnts.length,
          degradingCount: degradingOnts.length,
          correlatedPortCount: correlatedIssues.length,
        }
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze ONT performance trends and provide actionable insights: ${JSON.stringify(analysisData, null, 2)}`,
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
            action_plan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "number" },
                  action: { type: "string" },
                  location: { type: "string" },
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

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const addToComparison = (ont) => {
    if (comparisonOnts.find(o => o.serial === ont.serial)) {
      toast.error('ONT already in comparison');
      return;
    }
    if (comparisonOnts.length >= 6) {
      toast.error('Maximum 6 ONTs for comparison');
      return;
    }
    setComparisonOnts([...comparisonOnts, ont]);
    toast.success(`Added ${ont.serial} to comparison`);
    setSelectedOnt(null); // Clear single ONT view when adding to comparison
  };

  const availableDates = useMemo(() => {
    const dates = new Set();
    ontRecords.forEach(record => {
      const report = reports.find(r => r.id === record.report_id);
      const date = record.report_date || report?.upload_date;
      if (date) {
        dates.add(format(new Date(date), 'yyyy-MM-dd'));
      }
    });
    return Array.from(dates).sort();
  }, [ontRecords, reports]);

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-500" />
              Historical Performance Trends
              <Badge variant="outline" className="ml-2">{reports.length} reports</Badge>
              {comparisonOnts.length > 0 && (
                <Badge className="bg-blue-600">{comparisonOnts.length} ONTs selected for comparison</Badge>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">Historical performance trends across saved reports</DialogDescription>
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
              {comparisonOnts.length > 0 && (
                <Button 
                  onClick={() => { /* ONTComparisonView is rendered separately */ }}
                  className="bg-blue-600"
                  disabled={comparisonOnts.length < 2}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Compare ({comparisonOnts.length})
                </Button>
              )}
              <Button onClick={runAiAnalysis} disabled={isAnalyzing || filteredOnts.length === 0}>
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                AI Analysis
              </Button>
            </div>

            {/* Date Range Filter */}
            <DateRangeFilter 
              onRangeChange={setDateRange}
              availableDates={availableDates}
            />

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="border">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{allUniqueOnts.toLocaleString()}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Total Unique ONTs</div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{allOnts.length}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">With History</div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-amber-600">{degradingOnts.length}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Degrading</div>
                </CardContent>
              </Card>
              <Card className="border border-purple-300 bg-purple-50">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {allAnomalies.length}
                  </div>
                  <div className="text-xs text-purple-700 dark:text-purple-300">Anomalies Detected</div>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {allOnts.length > 0 ? allOnts.length - degradingOnts.length : 0}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Stable</div>
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

                  {/* Action Plan */}
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
                                {action.urgency && (
                                  <p className="text-blue-600 text-[10px]">
                                    Urgency: {action.urgency}
                                  </p>
                                )}
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
                        <span className="text-xs text-gray-600 dark:text-gray-400">
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
                          <TableHead className="w-10"></TableHead>
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
                          const isInComparison = comparisonOnts.find(o => o.serial === ont.serial);
                          return (
                            <TableRow 
                              key={idx} 
                              className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${isInComparison ? 'bg-blue-50' : ''}`}
                              onClick={() => setSelectedOnt(ont)}
                            >
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={!!isInComparison}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (isInComparison) {
                                      setComparisonOnts(comparisonOnts.filter(o => o.serial !== ont.serial));
                                    } else {
                                      addToComparison(ont);
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs">{ont.serial}</TableCell>
                              <TableCell className="text-xs">{ont.ontId || '-'}</TableCell>
                              <TableCell className="text-xs text-gray-700 dark:text-gray-300">
                                {ont.olt}/{ont.port}
                                {ont._lcpNumber && <div className="text-[10px] text-blue-600">LCP: {ont._lcpNumber}</div>}
                              </TableCell>
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
            {selectedOnt && !comparisonOnts.length && (
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
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {selectedOnt.olt} / {selectedOnt.port} • {selectedOnt.dataPoints.length} data points
                  </div>
                </CardHeader>
                <CardContent>
                  <EnhancedHistoryChart
                    historicalData={selectedOnt.dataPoints.map(dp => ({
                      date: dp.date,
                      ont_rx_power: dp.OntRxOptPwr,
                      olt_rx_power: dp.OLTRXOptPwr,
                      ont_tx_power: dp.OntTxPwr,
                      us_bip_errors: dp.UpstreamBipErrors,
                      ds_bip_errors: dp.DownstreamBipErrors,
                      us_fec_uncorrected: dp.UpstreamFecUncorrected,
                      ds_fec_uncorrected: dp.DownstreamFecUncorrected,
                      status: dp.status
                    }))}
                    serialNumber={selectedOnt.serial}
                    anomalies={detectAnomalies(selectedOnt.dataPoints, 'OntRxOptPwr')}
                  />
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

      {/* Multi-ONT Comparison Dialog */}
      {comparisonOnts.length > 0 && (
        <ONTComparisonView
          onts={comparisonOnts}
          onClose={() => setComparisonOnts([])}
          onAddOnt={() => toast.info('Select ONTs from the table to add to comparison')}
        />
      )}
    </>
  );
}