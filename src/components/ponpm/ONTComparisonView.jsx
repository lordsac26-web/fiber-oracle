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
  { value: 'ont_rx', label: 'ONT Rx Power', color: '#3b82f6', yAxisId: 'power' },
  { value: 'olt_rx', label: 'OLT Rx Power', color: '#10b981', yAxisId: 'power' },
  { value: 'ont_tx', label: 'ONT Tx Power', color: '#8b5cf6', yAxisId: 'power' },
  { value: 'us_bip', label: 'US BIP Errors', color: '#f59e0b', yAxisId: 'errors' },
  { value: 'ds_bip', label: 'DS BIP Errors', color: '#ef4444', yAxisId: 'errors' },
];

const ONT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ONTComparisonView({ onts, onClose, onAddOnt }) {
  const [selectedMetric, setSelectedMetric] = useState('ont_rx');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showThresholds, setShowThresholds] = useState(true);

  const metricConfig = METRIC_OPTIONS.find(m => m.value === selectedMetric);

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
          const ontLabel = `${ont.serial.substring(0, 8)}...`;
          switch (selectedMetric) {
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
          }
        }
      });

      return dataPoint;
    });
  }, [onts, selectedMetric, dateRange]);

  // Calculate statistics for each ONT
  const ontStats = useMemo(() => {
    return onts.map(ont => {
      const validPoints = ont.dataPoints.filter(dp => {
        const dateStr = moment(dp.date).format('YYYY-MM-DD');
        if (dateRange.start && dateStr < dateRange.start) return false;
        if (dateRange.end && dateStr > dateRange.end) return false;
        
        switch (selectedMetric) {
          case 'ont_rx': return dp.OntRxOptPwr !== null;
          case 'olt_rx': return dp.OLTRXOptPwr !== null;
          case 'ont_tx': return dp.OntTxPwr !== null;
          case 'us_bip': return dp.UpstreamBipErrors !== null;
          case 'ds_bip': return dp.DownstreamBipErrors !== null;
          default: return false;
        }
      });

      if (validPoints.length < 2) return null;

      const values = validPoints.map(dp => {
        switch (selectedMetric) {
          case 'ont_rx': return dp.OntRxOptPwr;
          case 'olt_rx': return dp.OLTRXOptPwr;
          case 'ont_tx': return dp.OntTxPwr;
          case 'us_bip': return dp.UpstreamBipErrors || 0;
          case 'ds_bip': return dp.DownstreamBipErrors || 0;
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
  }, [onts, selectedMetric, dateRange]);

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
              <Label className="text-xs mb-1">Metric</Label>
              <select 
                value={selectedMetric} 
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm"
              >
                {METRIC_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
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
                {metricConfig?.label} Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis 
                      yAxisId={metricConfig?.yAxisId}
                      tick={{ fontSize: 10 }}
                      label={{ 
                        value: metricConfig?.yAxisId === 'power' ? 'dBm' : 'Count', 
                        angle: -90, 
                        position: 'insideLeft', 
                        fontSize: 10 
                      }}
                    />
                    <Tooltip 
                      contentStyle={{ fontSize: 12 }}
                      labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    
                    {/* Threshold lines for power metrics */}
                    {showThresholds && metricConfig?.yAxisId === 'power' && selectedMetric === 'ont_rx' && (
                      <>
                        <ReferenceLine 
                          yAxisId="power" 
                          y={-27} 
                          stroke="red" 
                          strokeDasharray="5 5" 
                          label={{ value: 'Critical (-27)', fontSize: 8, fill: 'red' }} 
                        />
                        <ReferenceLine 
                          yAxisId="power" 
                          y={-25} 
                          stroke="orange" 
                          strokeDasharray="5 5" 
                          label={{ value: 'Warning (-25)', fontSize: 8, fill: 'orange' }} 
                        />
                      </>
                    )}
                    
                    {/* Lines for each ONT */}
                    {onts.map((ont, idx) => {
                      const ontLabel = `${ont.serial.substring(0, 8)}...`;
                      return (
                        <Line
                          key={idx}
                          yAxisId={metricConfig?.yAxisId}
                          type="monotone"
                          dataKey={ontLabel}
                          stroke={ONT_COLORS[idx % ONT_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Comparison Statistics</CardTitle>
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
                    {ontStats.map((stat, idx) => (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}