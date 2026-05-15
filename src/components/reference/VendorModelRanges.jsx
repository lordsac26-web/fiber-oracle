import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Router, Wifi, AlertTriangle, CheckCircle2, ExternalLink, Download } from 'lucide-react';

const MODEL_RANGES = [
  {
    vendor: 'Calix',
    model: '812G GigaHub',
    tech: 'GPON',
    ontRx: '-8 to -27 dBm',
    target: '-14 to -23 dBm',
    ontTx: '+0.5 to +5 dBm',
    note: 'Residential GPON gateway. Investigate below -25 dBm if FEC/BIP is rising.',
    datasheets: [{ label: '812G ANSI', url: 'https://media.base44.com/files/public/6927bc307b96037b8506c608/5ccbc1bcf_812G-GH-ANSI.pdf' }],
  },
  {
    vendor: 'Calix',
    model: '812G / 813G GigaHub',
    tech: 'GPON',
    ontRx: '-8 to -27 dBm',
    target: '-14 to -23 dBm',
    ontTx: '+0.5 to +5 dBm',
    note: 'GPON gateway family; 813G adds integrated 2.4 GHz Wi-Fi.',
    datasheets: [{ label: '812G/813G V2', url: 'https://media.base44.com/files/public/6927bc307b96037b8506c608/321f79180_812G-V2.pdf' }],
  },
  {
    vendor: 'Calix',
    model: '700GE Series',
    tech: 'GPON',
    ontRx: '-8 to -27 dBm',
    target: '-14 to -23 dBm',
    ontTx: '+0.5 to +5 dBm',
    note: 'Includes GPON/AE ONTs; verify exact model and optics before accepting edge values.',
    datasheets: [{ label: '700GE Series', url: 'https://media.base44.com/files/public/6927bc307b96037b8506c608/a714e7f2a_P700-SERIES.pdf' }],
  },
  {
    vendor: 'Calix',
    model: 'GP1101X GigaPoint',
    tech: 'XGS-PON',
    ontRx: '-9 to -26 dBm',
    target: '-14 to -22 dBm',
    ontTx: '+2 to +7 dBm',
    note: 'Small-form XGS-PON demarc. Watch corrected FEC if Rx is worse than -24 dBm.',
    datasheets: [{ label: 'GP1101X', url: 'https://media.base44.com/files/public/6927bc307b96037b8506c608/580c6c0f7_GP1101X.pdf' }],
  },
  {
    vendor: 'Calix',
    model: 'GP4201X',
    tech: 'XGS-PON',
    ontRx: '-9 to -26 dBm',
    target: '-14 to -22 dBm',
    ontTx: '+2 to +7 dBm',
    note: 'Indoor XGS-PON terminal with 10GE and multiple GE interfaces.',
    datasheets: [{ label: 'GP4201X', url: 'https://media.base44.com/files/public/6927bc307b96037b8506c608/6e3a4ca48_GP4201X.pdf' }],
  },
  {
    vendor: 'Calix',
    model: 'GP4201XH',
    tech: 'XGS-PON',
    ontRx: '-9 to -26 dBm',
    target: '-14 to -22 dBm',
    ontTx: '+2 to +7 dBm',
    note: 'Outdoor hardened XGS-PON ONT; consider temperature/enclosure conditions during triage.',
    datasheets: [{ label: 'GP4201XH', url: 'https://media.base44.com/files/public/6927bc307b96037b8506c608/fa241b236_GP4201XH.pdf' }],
  },
  {
    vendor: 'Zhone',
    model: '5222XG',
    tech: 'XGS-PON',
    ontRx: '-9 to -26 dBm',
    target: '-14 to -22 dBm',
    ontTx: '+2 to +7 dBm',
    note: 'XGS-PON ONT with 10GBase-T and voice interfaces.',
    datasheets: [{ label: '5222XG', url: 'https://media.base44.com/files/public/6927bc307b96037b8506c608/13a95b1ea_5222XG-DATASHEET.pdf' }],
  },
  {
    vendor: 'Zhone',
    model: '5228XG',
    tech: 'XGS-PON',
    ontRx: '-9 to -26 dBm',
    target: '-14 to -22 dBm',
    ontTx: '+2 to +7 dBm',
    note: 'XGS-PON Wi-Fi 6 ONT; compare optical counters separately from Wi-Fi symptoms.',
    datasheets: [{ label: '5228XG', url: 'https://media.base44.com/files/public/6927bc307b96037b8506c608/84f2d2573_5228XG-DATASHEET.pdf' }],
  },
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
                  <TableHead>Datasheet</TableHead>
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
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {row.datasheets?.map((sheet) => (
                          <div key={sheet.url} className="flex items-center gap-2 text-xs">
                            <a
                              href={sheet.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View {sheet.label}
                            </a>
                            <a
                              href={sheet.url}
                              download
                              className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 hover:underline"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </a>
                          </div>
                        ))}
                      </div>
                    </TableCell>
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