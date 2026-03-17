import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { X, Activity } from 'lucide-react';

const RANGES = [
  { min: -50, max: -30, label: '< -30 dBm', color: '#ef4444' },
  { min: -30, max: -27, label: '-30 to -27', color: '#f97316' },
  { min: -27, max: -25, label: '-27 to -25', color: '#eab308' },
  { min: -25, max: -20, label: '-25 to -20', color: '#84cc16' },
  { min: -20, max: -15, label: '-20 to -15', color: '#22c55e' },
  { min: -15, max: -10, label: '-15 to -10', color: '#10b981' },
  { min: -10, max: -8,  label: '-10 to -8',  color: '#14b8a6' },
  { min: -8,  max: 0,   label: '> -8 dBm',   color: '#06b6d4' },
];

export default function PowerDistributionChart({ onts, title }) {
  const [selectedRange, setSelectedRange] = useState(null);

  const chartData = useMemo(() => {
    if (!onts || onts.length === 0) return [];

    return RANGES.map(range => {
      const matched = onts.filter(ont => {
        const rx = parseFloat(ont.OntRxOptPwr);
        return !isNaN(rx) && rx !== 0 && rx >= range.min && rx < range.max;
      });
      return { ...range, count: matched.length, onts: matched };
    }).filter(d => d.count > 0);
  }, [onts]);

  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const entry = data.activePayload[0].payload;
      if (entry.count > 0) setSelectedRange(entry);
    }
  };

  if (chartData.length === 0) return null;

  return (
    <>
      <Card className="border-0 shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title || 'ONT Rx Power Distribution'}</CardTitle>
          <p className="text-xs text-gray-400">Click a bar to see those ONTs</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                angle={-40}
                textAnchor="end"
                height={72}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                labelStyle={{ fontWeight: 'bold' }}
                formatter={(value) => [`${value} ONTs`, 'Count']}
              />
              <Bar dataKey="count" name="ONT Count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    opacity={selectedRange && selectedRange.label !== entry.label ? 0.45 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ONT List Dialog */}
      <Dialog open={!!selectedRange} onOpenChange={() => setSelectedRange(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" style={{ color: selectedRange?.color }} />
              ONTs in Power Range: {selectedRange?.label}
              <Badge className="ml-1" style={{ backgroundColor: selectedRange?.color, color: '#fff' }}>
                {selectedRange?.count} ONTs
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedRange && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 dark:bg-gray-800">
                    <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 dark:text-gray-200">OLT / Port</TableHead>
                    <TableHead className="font-semibold text-gray-700 dark:text-gray-200">ONT ID</TableHead>
                    <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Serial</TableHead>
                    <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Model</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-200">ONT Rx</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-200">OLT Rx</TableHead>
                    <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRange.onts
                    .slice()
                    .sort((a, b) => parseFloat(a.OntRxOptPwr) - parseFloat(b.OntRxOptPwr))
                    .map((ont, idx) => (
                    <TableRow
                      key={idx}
                      className={
                        ont._analysis.status === 'critical' ? 'bg-red-50 dark:bg-red-900/10' :
                        ont._analysis.status === 'warning'  ? 'bg-amber-50 dark:bg-amber-900/10' :
                        ont._analysis.status === 'offline'  ? 'bg-purple-50 dark:bg-purple-900/10' : ''
                      }
                    >
                      <TableCell>
                        <div className={`w-3 h-3 rounded-full ${
                          ont._analysis.status === 'critical' ? 'bg-red-500' :
                          ont._analysis.status === 'warning'  ? 'bg-amber-500' :
                          ont._analysis.status === 'offline'  ? 'bg-purple-500' : 'bg-green-500'
                        }`} />
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{ont._oltName}</div>
                        <div className="text-gray-500">{ont._port}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{ont.OntID || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{ont.SerialNumber || '-'}</TableCell>
                      <TableCell className="text-xs">{ont.model || '-'}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold" style={{ color: selectedRange.color }}>
                        {ont.OntRxOptPwr} dBm
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {ont.OLTRXOptPwr || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {ont._analysis.issues.slice(0, 2).map((issue, i) => (
                            <Badge key={i} variant="outline" className="text-[9px] bg-red-50 border-red-300 text-red-700">
                              {issue.field}
                            </Badge>
                          ))}
                          {ont._analysis.warnings.slice(0, 2).map((warn, i) => (
                            <Badge key={`w${i}`} variant="outline" className="text-[9px] bg-amber-50 border-amber-300 text-amber-700">
                              {warn.field}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}