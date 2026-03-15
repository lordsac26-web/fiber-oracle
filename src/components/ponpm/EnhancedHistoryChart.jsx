import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  Brush,
} from 'recharts';
import {
  Activity,
  TrendingDown,
  Calendar,
  BarChart3,
  Download,
} from 'lucide-react';
import moment from 'moment';

const METRIC_CONFIGS = {
  'ONT Rx': { yAxisId: 'power', color: '#3b82f6', strokeWidth: 2, thresholds: { critical: -27, warning: -25 } },
  'OLT Rx': { yAxisId: 'power', color: '#10b981', strokeWidth: 2, thresholds: { critical: -30, warning: -28 } },
  'ONT Tx': { yAxisId: 'power', color: '#8b5cf6', strokeWidth: 2 },
  'US BIP': { yAxisId: 'errors', color: '#f59e0b', strokeWidth: 1, thresholds: { critical: 1000, warning: 100 } },
  'DS BIP': { yAxisId: 'errors', color: '#ef4444', strokeWidth: 1, thresholds: { critical: 1000, warning: 100 } },
  'US FEC Unc': { yAxisId: 'errors', color: '#ec4899', strokeWidth: 1, thresholds: { critical: 10, warning: 1 } },
  'DS FEC Unc': { yAxisId: 'errors', color: '#f97316', strokeWidth: 1, thresholds: { critical: 10, warning: 1 } },
  'US FEC Cor': { yAxisId: 'errors', color: '#06b6d4', strokeWidth: 1 },
  'DS FEC Cor': { yAxisId: 'errors', color: '#0891b2', strokeWidth: 1 },
  'GEM HEC': { yAxisId: 'errors', color: '#dc2626', strokeWidth: 1, thresholds: { critical: 100, warning: 10 } },
};

export default function EnhancedHistoryChart({ historicalData, title, serialNumber }) {
  const [selectedMetrics, setSelectedMetrics] = useState(['ONT Rx', 'OLT Rx']);
  const [chartType, setChartType] = useState('line'); // 'line' or 'area'
  const [showThresholds, setShowThresholds] = useState(true);
  const [showAverages, setShowAverages] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [zoomEnabled, setZoomEnabled] = useState(false);

  // Prepare chart data with date filtering
  const chartData = useMemo(() => {
    const filtered = historicalData.filter(d => {
      const dateStr = moment(d.date).format('YYYY-MM-DD');
      if (dateRange.start && dateStr < dateRange.start) return false;
      if (dateRange.end && dateStr > dateRange.end) return false;
      return true;
    });

    return filtered.map(d => ({
      date: moment(d.date).format('MM/DD'),
      fullDate: moment(d.date).format('YYYY-MM-DD HH:mm'),
      'ONT Rx': d.ont_rx_power,
      'OLT Rx': d.olt_rx_power,
      'ONT Tx': d.ont_tx_power,
      'US BIP': d.us_bip_errors || 0,
      'DS BIP': d.ds_bip_errors || 0,
      'US FEC Unc': d.us_fec_uncorrected || 0,
      'DS FEC Unc': d.ds_fec_uncorrected || 0,
      'US FEC Cor': d.us_fec_corrected || 0,
      'DS FEC Cor': d.ds_fec_corrected || 0,
      'GEM HEC': d.us_gem_hec_errors || 0,
    })).sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
  }, [historicalData, dateRange]);

  // Calculate averages
  const averages = useMemo(() => {
    const avgs = {};
    selectedMetrics.forEach(metric => {
      const values = chartData.map(d => d[metric]).filter(v => v != null);
      avgs[metric] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    });
    return avgs;
  }, [chartData, selectedMetrics]);

  // Export data
  const exportData = () => {
    const headers = ['Date', ...selectedMetrics];
    const rows = chartData.map(d => [d.fullDate, ...selectedMetrics.map(m => d[m] || '')]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serialNumber || 'ont'}-history-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ChartComponent = chartType === 'area' ? AreaChart : LineChart;
  const DataComponent = chartType === 'area' ? Area : Line;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title || 'Performance History'}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={chartType === 'line' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('line')}
              className="h-7 text-xs"
            >
              Line
            </Button>
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('area')}
              className="h-7 text-xs"
            >
              Area
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
              className="h-7 text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Date Range Controls */}
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <Label className="text-xs mb-1">Start Date</Label>
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <Label className="text-xs mb-1">End Date</Label>
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setDateRange({ start: '', end: '' })}
            className="h-8 text-xs"
          >
            Clear
          </Button>
          <Button
            variant={showThresholds ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowThresholds(!showThresholds)}
            className="h-8 text-xs"
          >
            Thresholds
          </Button>
          <Button
            variant={showAverages ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAverages(!showAverages)}
            className="h-8 text-xs"
          >
            Averages
          </Button>
        </div>

        {/* Metric Selector */}
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
          {Object.keys(METRIC_CONFIGS).map(metric => (
            <Badge
              key={metric}
              variant={selectedMetrics.includes(metric) ? 'default' : 'outline'}
              className="cursor-pointer text-xs hover:opacity-80"
              style={selectedMetrics.includes(metric) ? { 
                backgroundColor: METRIC_CONFIGS[metric].color,
                borderColor: METRIC_CONFIGS[metric].color 
              } : {}}
              onClick={() => {
                setSelectedMetrics(prev =>
                  prev.includes(metric)
                    ? prev.filter(m => m !== metric)
                    : [...prev, metric]
                );
              }}
            >
              {metric}
            </Badge>
          ))}
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              {selectedMetrics.some(m => METRIC_CONFIGS[m]?.yAxisId === 'power') && (
                <YAxis 
                  yAxisId="power" 
                  domain={['auto', 'auto']} 
                  tick={{ fontSize: 10 }} 
                  label={{ value: 'Power (dBm)', angle: -90, position: 'insideLeft', fontSize: 10 }} 
                />
              )}
              {selectedMetrics.some(m => METRIC_CONFIGS[m]?.yAxisId === 'errors') && (
                <YAxis 
                  yAxisId="errors" 
                  orientation="right" 
                  tick={{ fontSize: 10 }} 
                  label={{ value: 'Errors', angle: 90, position: 'insideRight', fontSize: 10 }} 
                />
              )}
              <Tooltip 
                contentStyle={{ fontSize: 12 }}
                labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              
              {/* Thresholds */}
              {showThresholds && selectedMetrics.map(metric => {
                const config = METRIC_CONFIGS[metric];
                if (!config?.thresholds) return null;
                return (
                  <React.Fragment key={`threshold-${metric}`}>
                    {config.thresholds.critical && (
                      <ReferenceLine 
                        yAxisId={config.yAxisId} 
                        y={config.thresholds.critical} 
                        stroke="red" 
                        strokeDasharray="5 5" 
                        label={{ value: `Critical (${config.thresholds.critical})`, fontSize: 8, fill: 'red', position: 'right' }} 
                      />
                    )}
                    {config.thresholds.warning && (
                      <ReferenceLine 
                        yAxisId={config.yAxisId} 
                        y={config.thresholds.warning} 
                        stroke="orange" 
                        strokeDasharray="5 5" 
                        label={{ value: `Warning (${config.thresholds.warning})`, fontSize: 8, fill: 'orange', position: 'right' }} 
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {/* Averages */}
              {showAverages && selectedMetrics.map(metric => {
                const avg = averages[metric];
                const config = METRIC_CONFIGS[metric];
                if (avg === null) return null;
                return (
                  <ReferenceLine 
                    key={`avg-${metric}`}
                    yAxisId={config.yAxisId} 
                    y={avg} 
                    stroke={config.color} 
                    strokeDasharray="3 3" 
                    strokeOpacity={0.5}
                    label={{ 
                      value: `${metric} Avg: ${avg.toFixed(1)}`, 
                      fontSize: 8, 
                      fill: config.color,
                      position: 'left'
                    }} 
                  />
                );
              })}

              {/* Data lines/areas */}
              {selectedMetrics.map(metric => {
                const config = METRIC_CONFIGS[metric];
                return (
                  <DataComponent
                    key={metric}
                    yAxisId={config.yAxisId}
                    type="monotone"
                    dataKey={metric}
                    stroke={config.color}
                    fill={chartType === 'area' ? config.color : undefined}
                    fillOpacity={chartType === 'area' ? 0.3 : undefined}
                    strokeWidth={config.strokeWidth}
                    dot={{ r: config.strokeWidth === 2 ? 3 : 2 }}
                    connectNulls={false}
                  />
                );
              })}

              {/* Zoom brush */}
              {zoomEnabled && <Brush dataKey="date" height={30} stroke="#8884d8" />}
            </ChartComponent>
          </ResponsiveContainer>
        </div>

        {/* Statistics Summary */}
        {showAverages && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            {selectedMetrics.map(metric => {
              const avg = averages[metric];
              if (avg === null) return null;
              return (
                <div key={metric} className="text-center">
                  <div className="text-xs text-gray-600">{metric} Avg</div>
                  <div className="font-bold text-sm" style={{ color: METRIC_CONFIGS[metric].color }}>
                    {avg.toFixed(2)} {METRIC_CONFIGS[metric].yAxisId === 'power' ? 'dBm' : ''}
                  </div>
                </div>
              );
            })}
            <div className="text-center">
              <div className="text-xs text-gray-600">Data Points</div>
              <div className="font-bold text-sm text-gray-700">{chartData.length}</div>
            </div>
          </div>
        )}

        {/* Chart Controls */}
        <div className="flex gap-2 justify-end">
          <Button
            variant={zoomEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoomEnabled(!zoomEnabled)}
            className="text-xs h-7"
          >
            {zoomEnabled ? 'Hide' : 'Show'} Zoom
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}