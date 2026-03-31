import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Search, Trash2, CheckCircle, Loader2, Database, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function OrphanOntCleanup() {
  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const response = await base44.functions.invoke('cleanupOrphanOntRecords', { dry_run: true });
      setScanResult(response.data);
      if (response.data.orphaned_records === 0) {
        toast.success('No orphaned records found — database is clean!');
      } else {
        toast.warning(`Found ${response.data.orphaned_records} orphaned ONT records`);
      }
    } catch (error) {
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await base44.functions.invoke('cleanupOrphanOntRecords', { dry_run: false });
      setScanResult(response.data);
      if (response.data.deleted_records > 0) {
        toast.success(`Cleaned up ${response.data.deleted_records} orphaned ONT records`);
      } else {
        toast.info('No records to delete');
      }
    } catch (error) {
      toast.error(`Cleanup failed: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const hasOrphans = scanResult && !scanResult.dry_run === false && scanResult.orphaned_records > 0 && scanResult.dry_run;

  return (
    <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-400" />
            Orphaned ONT Record Cleanup
          </CardTitle>
          {scanResult && !scanResult.dry_run && scanResult.deleted_records > 0 && (
            <Badge className="bg-green-500/20 text-green-300 border border-green-500/30">
              <CheckCircle className="w-3 h-3 mr-1" /> Cleaned
            </Badge>
          )}
        </div>
        <p className="text-sm text-white/50 mt-1">
          Detect and remove ONT performance records whose parent report no longer exists.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleScan}
            disabled={scanning || deleting}
            variant="outline"
            className="border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/20"
          >
            {scanning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            {scanning ? 'Scanning...' : 'Scan for Orphans'}
          </Button>

          {hasOrphans && (
            <Button
              onClick={handleDelete}
              disabled={deleting || scanning}
              variant="outline"
              className="border-red-400/50 text-red-300 hover:bg-red-500/20"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {deleting ? 'Deleting...' : `Delete ${scanResult.orphaned_records} Orphaned Records`}
            </Button>
          )}
        </div>

        {/* Results */}
        {scanResult && (
          <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-white/60" />
              <span className="text-sm font-medium text-white/80">
                {scanResult.dry_run ? 'Scan Results' : 'Cleanup Results'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-400">{scanResult.total_scanned?.toLocaleString()}</div>
                <div className="text-xs text-white/50">Records Scanned</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-purple-400">{scanResult.unique_report_ids}</div>
                <div className="text-xs text-white/50">Unique Reports</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className={`text-xl font-bold ${scanResult.orphaned_report_ids > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                  {scanResult.orphaned_report_ids}
                </div>
                <div className="text-xs text-white/50">Missing Reports</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className={`text-xl font-bold ${scanResult.orphaned_records > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {scanResult.dry_run ? scanResult.orphaned_records?.toLocaleString() : scanResult.deleted_records?.toLocaleString()}
                </div>
                <div className="text-xs text-white/50">
                  {scanResult.dry_run ? 'Orphaned Records' : 'Records Deleted'}
                </div>
              </div>
            </div>

            {/* Orphaned report IDs list */}
            {scanResult.orphaned_report_id_list?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-white/50 mb-2">Orphaned Report IDs:</p>
                <div className="flex flex-wrap gap-2">
                  {scanResult.orphaned_report_id_list.map((id) => (
                    <Badge key={id} variant="outline" className="text-xs border-orange-400/40 text-orange-300 font-mono">
                      {id}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Status message */}
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
              scanResult.orphaned_records === 0
                ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                : scanResult.dry_run
                  ? 'bg-orange-500/10 border border-orange-500/20 text-orange-300'
                  : 'bg-green-500/10 border border-green-500/20 text-green-300'
            }`}>
              {scanResult.orphaned_records === 0 || !scanResult.dry_run ? (
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span>{scanResult.message}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}