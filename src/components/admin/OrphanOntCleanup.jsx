import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Search, Trash2, CheckCircle, Loader2, Database, ShieldAlert, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function OrphanOntCleanup() {
  const [phase, setPhase] = useState('idle'); // idle | scanning | scanned | counting | deleting | done
  const [scanProgress, setScanProgress] = useState({ scanned: 0, validReports: 0, message: '' });
  const [orphanedReportIds, setOrphanedReportIds] = useState([]);
  const [orphanCounts, setOrphanCounts] = useState({});
  const [deleteProgress, setDeleteProgress] = useState({ current: '', deleted: 0, total: 0 });
  const cancelRef = useRef(false);

  const handleScan = async () => {
    setPhase('scanning');
    setScanProgress({ scanned: 0, validReports: 0, message: 'Starting scan...' });
    setOrphanedReportIds([]);
    setOrphanCounts({});
    cancelRef.current = false;

    const allOrphanIds = new Set();
    let cursor = 0;

    try {
      while (true) {
        if (cancelRef.current) { setPhase('idle'); return; }

        const res = await base44.functions.invoke('cleanupOrphanOntRecords', {
          mode: 'scan',
          cursor
        });

        const data = res.data;
        setScanProgress({
          scanned: data.total_scanned,
          validReports: data.valid_reports,
          message: data.message
        });

        for (const id of (data.orphaned_report_ids || [])) {
          allOrphanIds.add(id);
        }

        if (data.status === 'complete') break;
        cursor = data.cursor;
      }

      const ids = Array.from(allOrphanIds);
      setOrphanedReportIds(ids);

      if (ids.length === 0) {
        setPhase('done');
        toast.success('No orphaned records found — database is clean!');
        return;
      }

      // Count records per orphaned report_id
      setPhase('counting');
      const counts = {};
      for (const reportId of ids) {
        if (cancelRef.current) { setPhase('idle'); return; }
        const countRes = await base44.functions.invoke('cleanupOrphanOntRecords', {
          mode: 'count',
          report_id: reportId
        });
        counts[reportId] = countRes.data.count;
        setOrphanCounts({ ...counts });
      }

      setPhase('scanned');
      const total = Object.values(counts).reduce((s, c) => s + c, 0);
      toast.warning(`Found ${total} orphaned records across ${ids.length} missing report(s)`);

    } catch (error) {
      toast.error(`Scan failed: ${error.message}`);
      setPhase('idle');
    }
  };

  const handleDelete = async () => {
    setPhase('deleting');
    cancelRef.current = false;
    const totalToDelete = Object.values(orphanCounts).reduce((s, c) => s + c, 0);
    let totalDeleted = 0;

    try {
      for (const reportId of orphanedReportIds) {
        if (cancelRef.current) { setPhase('scanned'); return; }

        let remaining = true;
        while (remaining) {
          if (cancelRef.current) { setPhase('scanned'); return; }

          setDeleteProgress({
            current: reportId,
            deleted: totalDeleted,
            total: totalToDelete
          });

          const res = await base44.functions.invoke('cleanupOrphanOntRecords', {
            mode: 'delete',
            report_id: reportId
          });

          totalDeleted += res.data.deleted;
          remaining = res.data.remaining;
        }
      }

      setDeleteProgress({ current: '', deleted: totalDeleted, total: totalToDelete });
      setPhase('done');
      toast.success(`Cleaned up ${totalDeleted} orphaned ONT records`);
    } catch (error) {
      toast.error(`Cleanup failed: ${error.message}`);
      setPhase('scanned');
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const handleReset = () => {
    setPhase('idle');
    setScanProgress({ scanned: 0, validReports: 0, message: '' });
    setOrphanedReportIds([]);
    setOrphanCounts({});
    setDeleteProgress({ current: '', deleted: 0, total: 0 });
  };

  const totalOrphaned = Object.values(orphanCounts).reduce((s, c) => s + c, 0);
  const isWorking = phase === 'scanning' || phase === 'counting' || phase === 'deleting';

  return (
    <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-400" />
            Orphaned ONT Record Cleanup
          </CardTitle>
          {phase === 'done' && (
            <Badge className="bg-green-500/20 text-green-300 border border-green-500/30">
              <CheckCircle className="w-3 h-3 mr-1" /> Clean
            </Badge>
          )}
        </div>
        <p className="text-sm text-white/50 mt-1">
          Detect and remove ONT performance records whose parent report no longer exists.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          {(phase === 'idle' || phase === 'done') && (
            <Button
              onClick={handleScan}
              variant="outline"
              className="border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/20"
            >
              <Search className="w-4 h-4 mr-2" />
              Scan for Orphans
            </Button>
          )}

          {phase === 'scanned' && orphanedReportIds.length > 0 && (
            <Button
              onClick={handleDelete}
              variant="outline"
              className="border-red-400/50 text-red-300 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {totalOrphaned.toLocaleString()} Orphaned Records
            </Button>
          )}

          {isWorking && (
            <Button
              onClick={handleCancel}
              variant="outline"
              className="border-yellow-400/50 text-yellow-300 hover:bg-yellow-500/20"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}

          {phase !== 'idle' && !isWorking && (
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-white/20 text-white/60 hover:bg-white/10"
            >
              Reset
            </Button>
          )}
        </div>

        {/* Scanning Progress */}
        {(phase === 'scanning' || phase === 'counting') && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-sm text-white/70">
                {phase === 'scanning'
                  ? `Scanning... ${scanProgress.scanned.toLocaleString()} records checked`
                  : `Counting orphaned records...`
                }
              </span>
            </div>
            <Progress value={undefined} className="h-1.5 bg-white/10" />
          </div>
        )}

        {/* Deleting Progress */}
        {phase === 'deleting' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-red-400" />
              <span className="text-sm text-white/70">
                Deleting... {deleteProgress.deleted.toLocaleString()} / {deleteProgress.total.toLocaleString()}
              </span>
            </div>
            <Progress
              value={deleteProgress.total > 0 ? (deleteProgress.deleted / deleteProgress.total) * 100 : 0}
              className="h-1.5 bg-white/10"
            />
          </div>
        )}

        {/* Results */}
        {phase !== 'idle' && phase !== 'scanning' && phase !== 'counting' && (
          <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-white/60" />
              <span className="text-sm font-medium text-white/80">Results</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-400">{scanProgress.scanned.toLocaleString()}</div>
                <div className="text-xs text-white/50">Records Scanned</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-purple-400">{scanProgress.validReports}</div>
                <div className="text-xs text-white/50">Valid Reports</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className={`text-xl font-bold ${orphanedReportIds.length > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                  {orphanedReportIds.length}
                </div>
                <div className="text-xs text-white/50">Missing Reports</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className={`text-xl font-bold ${totalOrphaned > 0 && phase !== 'done' ? 'text-red-400' : 'text-green-400'}`}>
                  {phase === 'done' && deleteProgress.deleted > 0
                    ? deleteProgress.deleted.toLocaleString()
                    : totalOrphaned.toLocaleString()
                  }
                </div>
                <div className="text-xs text-white/50">
                  {phase === 'done' && deleteProgress.deleted > 0 ? 'Deleted' : 'Orphaned Records'}
                </div>
              </div>
            </div>

            {/* Per-report breakdown */}
            {orphanedReportIds.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-white/50 mb-2">Orphaned Report IDs:</p>
                <div className="space-y-1.5">
                  {orphanedReportIds.map((id) => (
                    <div key={id} className="flex items-center justify-between bg-white/5 rounded px-3 py-1.5">
                      <span className="text-xs font-mono text-orange-300 truncate">{id}</span>
                      <Badge variant="outline" className="text-xs border-white/20 text-white/60 ml-2">
                        {orphanCounts[id] != null ? `${orphanCounts[id].toLocaleString()} records` : '...'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status message */}
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
              orphanedReportIds.length === 0 || phase === 'done'
                ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                : 'bg-orange-500/10 border border-orange-500/20 text-orange-300'
            }`}>
              {orphanedReportIds.length === 0 || phase === 'done' ? (
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span>{scanProgress.message}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}