import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCalixNavigation } from '@/pages/CalixSmxSupport';
import { AlertCircle, AlertTriangle, Zap, ChevronRight } from 'lucide-react';

/**
 * CalixPortView — Shows all ONTs on a specific port
 * Provides table view with inline detail access
 */

export default function CalixPortView({ oltName, portKey, onNavigate }) {
  const { reportData } = useCalixNavigation();
  const [sortBy, setSortBy] = useState('status'); // status, rx-asc, rx-desc, errors

  // Filter ONTs by OLT and port
  const portOnts = useMemo(() => {
    if (!reportData?.onts) return [];

    const onts = reportData.onts.filter(
      o => o.OLTName === oltName && o['Shelf/Slot/Port'] === portKey
    );

    // Sort
    return onts.sort((a, b) => {
      if (sortBy === 'status') {
        const statusOrder = { critical: 0, warning: 1, offline: 2, ok: 3 };
        return (statusOrder[a._analysis?.status] || 4) - (statusOrder[b._analysis?.status] || 4);
      }
      if (sortBy === 'rx-asc') {
        return (parseFloat(a.OntRxOptPwr) || 0) - (parseFloat(b.OntRxOptPwr) || 0);
      }
      if (sortBy === 'rx-desc') {
        return (parseFloat(b.OntRxOptPwr) || 0) - (parseFloat(a.OntRxOptPwr) || 0);
      }
      if (sortBy === 'errors') {
        const aErr = (parseInt(a.UpstreamBipErrors) || 0) + (parseInt(a.DownstreamBipErrors) || 0);
        const bErr = (parseInt(b.UpstreamBipErrors) || 0) + (parseInt(b.DownstreamBipErrors) || 0);
        return bErr - aErr;
      }
      return 0;
    });
  }, [reportData, oltName, portKey, sortBy]);

  if (!portOnts || portOnts.length === 0) {
    return (
      <Card className="border-0 shadow">
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">No ONTs found on this port</p>
        </CardContent>
      </Card>
    );
  }

  const stats = {
    critical: portOnts.filter(o => o._analysis?.status === 'critical').length,
    warning: portOnts.filter(o => o._analysis?.status === 'warning').length,
    offline: portOnts.filter(o => o._analysis?.status === 'offline').length,
    ok: portOnts.filter(o => o._analysis?.status === 'ok').length,
  };

  return (
    <div className="space-y-6">
      {/* Port Header */}
      <Card className="border-0 shadow bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{portKey}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {oltName} • {portOnts.length} ONTs
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {stats.critical > 0 && (
                <Badge className="bg-red-100 text-red-800 border-red-300">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {stats.critical} Critical
                </Badge>
              )}
              {stats.warning > 0 && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {stats.warning} Warning
                </Badge>
              )}
              {stats.offline > 0 && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                  {stats.offline} Offline
                </Badge>
              )}
              {stats.ok > 0 && (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  {stats.ok} OK
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500">Sort:</span>
        {['status', 'rx-desc', 'rx-asc', 'errors'].map(option => (
          <Button
            key={option}
            variant={sortBy === option ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy(option)}
          >
            {option === 'status' && 'Status'}
            {option === 'rx-desc' && 'Rx (High)'}
            {option === 'rx-asc' && 'Rx (Low)'}
            {option === 'errors' && 'Errors'}
          </Button>
        ))}
      </div>

      {/* ONT Table */}
      <Card className="border-0 shadow overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Status</TableHead>
              <TableHead>ONT ID</TableHead>
              <TableHead>Serial</TableHead>
              <TableHead className="text-right">ONT Rx</TableHead>
              <TableHead className="text-right">OLT Rx</TableHead>
              <TableHead className="text-right">US BIP</TableHead>
              <TableHead className="text-right">DS BIP</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {portOnts.map(ont => {
              const statusColor =
                ont._analysis?.status === 'critical' ? 'bg-red-100 text-red-800' :
                ont._analysis?.status === 'warning' ? 'bg-amber-100 text-amber-800' :
                ont._analysis?.status === 'offline' ? 'bg-purple-100 text-purple-800' :
                'bg-green-100 text-green-800';

              return (
                <TableRow key={ont.id || ont.SerialNumber} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <TableCell>
                    <Badge className={`${statusColor} text-xs`}>
                      {ont._analysis?.status?.charAt(0).toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{ont.OntID}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{ont.SerialNumber || 'N/A'}</TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={parseFloat(ont.OntRxOptPwr) < -27 ? 'text-red-600 font-bold' : ''}>
                      {ont.OntRxOptPwr}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{ont.OLTRXOptPwr}</TableCell>
                  <TableCell className="text-right">
                    {parseInt(ont.UpstreamBipErrors) > 100 && (
                      <span className="text-red-600 font-semibold">{ont.UpstreamBipErrors}</span>
                    ) || ont.UpstreamBipErrors}
                  </TableCell>
                  <TableCell className="text-right">
                    {parseInt(ont.DownstreamBipErrors) > 100 && (
                      <span className="text-red-600 font-semibold">{ont.DownstreamBipErrors}</span>
                    ) || ont.DownstreamBipErrors}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 truncate">
                    {ont.subscriber_account_name || ont.subscriber_model || '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onNavigate({ view: 'ont_detail', ont })}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}