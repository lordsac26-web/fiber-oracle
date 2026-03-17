import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  X,
  Plus,
  Activity,
  Calendar,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';

const METRIC_OPTIONS = [
  { value: 'ont_rx', label: 'ONT Rx Power', color: '#3b82f6', yAxisId: 'power', thresholds: { critical: -27, warning: -25 } },
  { value: 'olt_rx', label: 'OLT Rx Power', color: '#10b981', yAxisId: 'power', thresholds: { critical: -30, warning: -28 } },
  { value: 'ont_tx', label: 'ONT Tx Power', color: '#8b5cf6', yAxisId: 'power' },
  { value: 'us_bip', label: 'US BIP Errors', color: '#f59e0b', yAxisId: 'errors', thresholds: { critical: 1000, warning: 100 } },
  { value: 'ds_bip', label: 'DS BIP Errors', color: '#ef4444', yAxisId: 'errors', thresholds: { critical: 1000, warning: 100 } },
  { value: 'us_fec', label: 'US FEC Uncorrected', color: '#ec4899', yAxisId: 'errors', thresholds: { critical: 10, warning: 1 } },
  { value: 'ds_fec', label: 'DS FEC Uncorrected', color: '#f97316', yAxisId: 'errors', thresholds: { critical: 10, warning: 1 } },
];

const ONT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ONTComparisonView({ onts, onClose, onAddOnt }) {
  const [selectedMetrics, setSelectedMetrics] = useState(['ont_rx']);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showThresholds, setShowThresholds] = useState(true);

  const hasPowerMetrics = selectedMetrics.some(m => METRIC_OPTIONS.find(opt => opt.value === m)?.yAxisId === 'power');
  const hasErrorMetrics = selectedMetrics.some(m => METRIC_OPTIONS.find(opt => opt.value === m)?.yAxisId === 'errors');

  // Build combined chart data
  const chartData = useMemo(() => {
    if (onts.length === 0) return [];

    // Get all unique dates across all ONTs
    const allDates = new Set();
    onts.forEach(ont => {
      ont.dataPoints.forEach(dp => {
        const dateStr = moment(dp.date).format('YYYY-MM-DD');
        allDates.add(dateStr);
      });
    });

    // Sort dates
    const sortedDates = Array.from(allDates).sort();

    // Filter by date range if set
    const filteredDates = sortedDates.filter(date => {
      if (dateRange.start && date < dateRange.start) return false;
      if (dateRange.end && date > dateRange.end) return false;
      return true;
    });

    // Build data for chart
    return filteredDates.map(dateStr => {
      const dataPoint = { date: moment(dateStr).format('MM/DD'), fullDate: dateStr };
      
      onts.forEach((ont, idx) => {
        const dp = ont.dataPoints.find(d => moment(d.date).format('YYYY-MM-DD') === dateStr);
        if (dp) {
          selectedMetrics.forEach(metric => {
            const ontLabel = `${ont.serial.substring(0, 8)}..._${metric}`;
            switch (metric) {
              case 'ont_rx':
                dataPoint[ontLabel] = dp.OntRxOptPwr;
                break;
              case 'olt_rx':
                dataPoint[ontLabel] = dp.OLTRXOptPwr;
                break;
              case 'ont_tx':
                dataPoint[ontLabel] = dp.OntTxPwr;
                break;
              case 'us_bip':
                dataPoint[ontLabel] = dp.UpstreamBipErrors || 0;
                break;
              case 'ds_bip':
                dataPoint[ontLabel] = dp.DownstreamBipErrors || 0;
                break;
              case 'us_fec':
                dataPoint[ontLabel] = dp.UpstreamFecUncorrected || 0;
                break;
              case 'ds_fec':
                dataPoint[ontLabel] = dp.DownstreamFecUncorrected || 0;
                break;
            }
          });
        }
      });

      return dataPoint;
    });
  }, [onts, selectedMetrics, dateRange]);

  // Calculate statistics for each ONT and metric
  const ontStats = useMemo(() => {
    return selectedMetrics.map(metric => {
      const metricLabel = METRIC_OPTIONS.find(m => m.value === metric)?.label;
      const ontStatsForMetric = onts.map(ont => {
        const validPoints = ont.dataPoints.filter(dp => {
          const dateStr = moment(dp.date).format('YYYY-MM-DD');
          if (dateRange.start && dateStr < dateRange.start) return false;
          if (dateRange.end && dateStr > dateRange.end) return false;
          
          switch (metric) {
            case 'ont_rx': return dp.OntRxOptPwr !== null;
            case 'olt_rx': return dp.OLTRXOptPwr !== null;
            case 'ont_tx': return dp.OntTxPwr !== null;
            case 'us_bip': return dp.UpstreamBipErrors !== null;
            case 'ds_bip': return dp.DownstreamBipErrors !== null;
            case 'us_fec': return dp.UpstreamFecUncorrected !== null;
            case 'ds_fec': return dp.DownstreamFecUncorrected !== null;
            default: return false;
          }
        });

        if (validPoints.length < 2) return null;

        const values = validPoints.map(dp => {
          switch (metric) {
            case 'ont_rx': return dp.OntRxOptPwr;
            case 'olt_rx': return dp.OLTRXOptPwr;
            case 'ont_tx': return dp.OntTxPwr;
            case 'us_bip': return dp.UpstreamBipErrors || 0;
            case 'ds_bip': return dp.DownstreamBipErrors || 0;
            case 'us_fec': return dp.UpstreamFecUncorrected || 0;
            case 'ds_fec': return dp.DownstreamFecUncorrected || 0;
            default: return null;
          }
        });

        const first = values[0];
        const last = values[values.length - 1];
        const change = last - first;
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        return {
          serial: ont.serial,
          first,
          last,
          change,
          avg,
          min,
          max,
          dataPointCount: validPoints.length,
        };
      }).filter(Boolean);

      return {
        metric,
        metricLabel,
        stats: ontStatsForMetric
      };
    });
  }, [onts, selectedMetrics, dateRange]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            Multi-ONT Comparison
            <Badge variant="outline">{onts.length} ONTs</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs mb-1">Metrics (select multiple)</Label>
              <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md bg-white min-h-[38px]">
                {METRIC_OPTIONS.map(opt => (
                  <Badge
                    key={opt.value}
                    variant={selectedMetrics.includes(opt.value) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs hover:opacity-80"
                    style={selectedMetrics.includes(opt.value) ? { 
                      backgroundColor: opt.color,
                      borderColor: opt.color 
                    } : {}}
                    onClick={() => {
                      setSelectedMetrics(prev =>
                        prev.includes(opt.value)
                          ? prev.filter(m => m !== opt.value)
                          : [...prev, opt.value]
                      );
                    }}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="w-36">
              <Label className="text-xs mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Start Date
              </Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="w-36">
              <Label className="text-xs mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                End Date
              </Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setDateRange({ start: '', end: '' })}
            >
              Clear Range
            </Button>
            <Button 
              variant={showThresholds ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowThresholds(!showThresholds)}
            >
              Thresholds
            </Button>
            {onAddOnt && (
              <Button variant="outline" size="sm" onClick={onAddOnt}>
                <Plus className="h-4 w-4 mr-1" />
                Add ONT
              </Button>
            )}
          </div>

          {/* ONT List with Remove */}
          <div className="flex gap-2 flex-wrap">
            {onts.map((ont, idx) => (
              <Badge 
                key={idx}
                className="text-xs px-2 py-1"
                style={{ backgroundColor: ONT_COLORS[idx % ONT_COLORS.length] }}
              >
                {ont.serial}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer hover:opacity-70" 
                  onClick={() => {
                    const newOnts = onts.filter((_, i) => i !== idx);
                    if (newOnts.length === 0) {
                      onClose();
                    }
                  }}
                />
              </Badge>
            ))}
          </div>

          {/* Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Multi-Metric Comparison - {onts.length} ONT{onts.length > 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    
                    {/* Power Y-Axis (left) */}
                    {hasPowerMetrics && (
                      <YAxis 
                        yAxisId="power"
                        tick={{ fontSize: 10 }}
                        label={{ 
                          value: 'Power (dBm)', 
                          angle: -90, 
                          position: 'insideLeft', 
                          fontSize: 10 
                        }}
                      />
                    )}
                    
                    {/* Errors Y-Axis (right) */}
                    {hasErrorMetrics && (
                      <YAxis 
                        yAxisId="errors"
                        orientation="right"
                        tick={{ fontSize: 10 }}
                        label={{ 
                          value: 'Errors', 
                          angle: 90, 
                          position: 'insideRight', 
                          fontSize: 10 
                        }}
                      />
                    )}
                    
                    <Tooltip 
                      contentStyle={{ fontSize: 11 }}
                      labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                    />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    
                    {/* Threshold lines */}
                    {showThresholds && selectedMetrics.map(metric => {
                      const metricConfig = METRIC_OPTIONS.find(m => m.value === metric);
                      if (!metricConfig?.thresholds) return null;
                      return (
                        <React.Fragment key={`threshold-${metric}`}>
                          {metricConfig.thresholds.critical && (
                            <ReferenceLine 
                              yAxisId={metricConfig.yAxisId} 
                              y={metricConfig.thresholds.critical} 
                              stroke="red" 
                              strokeDasharray="5 5" 
                              label={{ 
                                value: `${metricConfig.label} Critical`, 
                                fontSize: 7, 
                                fill: 'red',
                                position: 'right'
                              }} 
                            />
                          )}
                          {metricConfig.thresholds.warning && (
                            <ReferenceLine 
                              yAxisId={metricConfig.yAxisId} 
                              y={metricConfig.thresholds.warning} 
                              stroke="orange" 
                              strokeDasharray="5 5" 
                              label={{ 
                                value: `${metricConfig.label} Warning`, 
                                fontSize: 7, 
                                fill: 'orange',
                                position: 'right'
                              }} 
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                    
                    {/* Lines for each ONT x metric combination */}
                    {onts.map((ont, ontIdx) => {
                      return selectedMetrics.map((metric, metricIdx) => {
                        const metricConfig = METRIC_OPTIONS.find(m => m.value === metric);
                        const ontLabel = `${ont.serial.substring(0, 8)}..._${metric}`;
                        const displayLabel = `${ont.serial.substring(0, 8)}... - ${metricConfig.label}`;
                        
                        return (
                          <Line
                            key={`${ontIdx}-${metric}`}
                            yAxisId={metricConfig.yAxisId}
                            type="monotone"
                            dataKey={ontLabel}
                            name={displayLabel}
                            stroke={ONT_COLORS[ontIdx % ONT_COLORS.length]}
                            strokeWidth={metricConfig.yAxisId === 'power' ? 2 : 1}
                            strokeDasharray={metricConfig.yAxisId === 'errors' ? '3 3' : '0'}
                            dot={{ r: metricConfig.yAxisId === 'power' ? 3 : 2 }}
                            connectNulls={false}
                          />
                        );
                      });
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Tables - One per metric */}
          {ontStats.map((metricData, metricIdx) => (
            <Card key={metricIdx}>
              <CardHeader>
                <CardTitle className="text-sm">{metricData.metricLabel} - Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">ONT Serial</th>
                        <th className="text-right py-2 px-2">First</th>
                        <th className="text-right py-2 px-2">Latest</th>
                        <th className="text-right py-2 px-2">Change</th>
                        <th className="text-right py-2 px-2">Average</th>
                        <th className="text-right py-2 px-2">Min</th>
                        <th className="text-right py-2 px-2">Max</th>
                        <th className="text-right py-2 px-2">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricData.stats.map((stat, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2 font-mono" style={{ color: ONT_COLORS[idx % ONT_COLORS.length] }}>
                            {stat.serial}
                          </td>
                          <td className="text-right py-2 px-2 font-mono">{stat.first?.toFixed(2)}</td>
                          <td className="text-right py-2 px-2 font-mono font-bold">{stat.last?.toFixed(2)}</td>
                          <td className="text-right py-2 px-2">
                            <Badge className={stat.change < -1 ? 'bg-red-100 text-red-800' : stat.change > 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {stat.change < -0.1 ? <TrendingDown className="h-3 w-3 mr-1" /> : stat.change > 0.1 ? <TrendingUp className="h-3 w-3 mr-1" /> : '→'}
                              {stat.change > 0 ? '+' : ''}{stat.change?.toFixed(2)}
                            </Badge>
                          </td>
                          <td className="text-right py-2 px-2 font-mono">{stat.avg?.toFixed(2)}</td>
                          <td className="text-right py-2 px-2 font-mono text-red-600">{stat.min?.toFixed(2)}</td>
                          <td className="text-right py-2 px-2 font-mono text-green-600">{stat.max?.toFixed(2)}</td>
                          <td className="text-right py-2 px-2">{stat.dataPointCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}