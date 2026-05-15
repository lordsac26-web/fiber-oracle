import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Router, Wifi, AlertTriangle, CheckCircle2 } from 'lucide-react';

const MODEL_RANGES = [
  { vendor: 'Calix', model: 'GP1100X / 700GE class', tech: 'GPON', ontRx: '-8 to -27 dBm', target: '-14 to -23 dBm', ontTx: '+0.5 to +5 dBm', note: 'Investigate below -25 dBm if FEC/BIP is rising.' },
  { vendor: 'Calix', model: 'GigaSpire GPON ONT', tech: 'GPON', ontRx: '-8 to -27 dBm', target: '-15 to -22 dBm', ontTx: '+0.5 to +5 dBm', note: 'Stable residential target range for most deployments.' },
  { vendor: 'Calix', model: 'GigaPoint / XGS ONT', tech: 'XGS-PON', ontRx: '-9 to -26 dBm', target: '-14 to -22 dBm', ontTx: '+2 to +7 dBm', note: 'Watch corrected FEC if Rx is worse than -24 dBm.' },
  { vendor: 'Adtran', model: 'SDX GPON ONT', tech: 'GPON', ontRx: '-8 to -27 dBm', target: '-14 to -23 dBm', ontTx: '+0.5 to +5 dBm', note: 'Treat repeated ranging events as marginal even if Rx passes.' },
  { vendor: 'Adtran', model: 'SDX XGS-PON ONT', tech: 'XGS-PON', ontRx: '-9 to -26 dBm', target: '-14 to -22 dBm', ontTx: '+2 to +7 dBm', note: 'Prefer 4 dB+ receiver margin for 10G stability.' },
  { vendor: 'Nokia', model: '7368 GPON ONT', tech: 'GPON', ontRx: '-8 to -27 dBm', target: '-15 to -23 dBm', ontTx: '+0.5 to +5 dBm', note: 'Escalate if GEM/HEC appears with clean power levels.' },
  { vendor: 'Nokia', model: 'XS-010X-Q / XS class', tech: 'XGS-PON', ontRx: '-9 to -26 dBm', target: '-14 to -22 dBm', ontTx: '+2 to +7 dBm', note: 'Check coexistence optics if many XGS ONTs degrade together.' },
  { vendor: 'Zyxel / Dasan', model: 'Generic GPON SFU/HGU', tech: 'GPON', ontRx: '-8 to -27 dBm', target: '-14 to -23 dBm', ontTx: '+0.5 to +5 dBm', note: 'Confirm model datasheet before accepting edge values.' },
];

const statusGuidance = [
  { label: 'Good', icon: CheckCircle2, color: 'text-emerald-600', text: 'Inside target range with zero uncorrectable FEC, zero GEM/HEC, and stable uptime.' },
  { label: 'Marginal', icon: AlertTriangle, color: 'text-amber-600', text: 'Within spec but near sensitivity, rising corrected FEC, BIP errors, or repeated re-ranging.' },
  { label: 'Escalate', icon: AlertTriangle, color: 'text-red-600', text: 'Any uncorrectable FEC, GEM/HEC, multiple ONTs impacted, or values outside vendor/spec range.' },
];

export default function VendorModelRanges() {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Router className="h-5 w-5 text-indigo-600" />
            Known Good Ranges by Vendor / Model
          </CardTitle>
          <p className="text-sm text-gray-500">Operational target ranges for common GPON and XGS-PON ONTs. Always defer to the exact vendor datasheet when available.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead>Vendor</TableHead>
                  <TableHead>Model / Class</TableHead>
                  <TableHead>Tech</TableHead>
                  <TableHead>Spec Rx</TableHead>
                  <TableHead>Preferred Target</TableHead>
                  <TableHead>ONT Tx</TableHead>
                  <TableHead>NOC Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MODEL_RANGES.map((row) => (
                  <TableRow key={`${row.vendor}-${row.model}`}>
                    <TableCell className="font-semibold">{row.vendor}</TableCell>
                    <TableCell>{row.model}</TableCell>
                    <TableCell><Badge variant="outline">{row.tech}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{row.ontRx}</TableCell>
                    <TableCell className="font-mono text-sm text-emerald-700">{row.target}</TableCell>
                    <TableCell className="font-mono text-sm">{row.ontTx}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">{row.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {statusGuidance.map((item) => (
          <Card key={item.label} className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <h4 className="font-semibold">{item.label}</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-md bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4 text-sm text-blue-800 dark:text-blue-200 flex gap-2">
          <Wifi className="h-5 w-5 shrink-0" />
          <span>For Level 2 triage, compare optical range, error counters, uptime, and peer ONTs on the same splitter before dispatching.</span>
        </CardContent>
      </Card>
    </div>
  );
}