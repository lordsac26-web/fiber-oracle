import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Search, Trash2, CheckCircle, Loader2, Database, ShieldAlert, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function OrphanOntCleanup() {
  const [phase, setPhase] = useState('idle');
  const [scanProgress, setScanProgress] = useState({ scanned: 0, validReports: 0 });
  const [orphanedReportIds, setOrphanedReportIds] = useState([]);
  const [orphanCounts, setOrphanCounts] = useState({});
  const [deleteProgress, setDeleteProgress] = useState({ deleted: 0, total: 0 });
  const [statusMsg, setStatusMsg] = useState('');
  const cancelRef = useRef(false);

  const handleScan = async () => {
    setPhase('scanning');
    setOrphanedReportIds([]);
    setOrphanCounts({});
    setStatusMsg('Fetching report list...');
    cancelRef.current = false;

    try {
      // Step 1: Get all valid report IDs (small, fast call)
      const reportsRes = await base44.functions.invoke('cleanupOrphanOntRecords', { mode: 'get_reports' });
      const validIds = reportsRes.data.report_ids || [];
      setScanProgress((p) => ({ ...p, validReports: validIds.length }));

      // Step 2: Scan ONT records in chunks
      const allOrphanIds = new Set();
      let cursor = 0;
      let totalScanned = 0;

      while (true) {
        if (cancelRef.current) { setPhase('idle'); return; }

        setStatusMsg(`Scanning records... (${totalScanned.toLocaleString()} checked)`);

        const res = await base44.functions.invoke('cleanupOrphanOntRecords', {
          mode: 'scan',
          valid_report_ids: validIds,
          cursor
        });

        const data = res.data;
        totalScanned = data.cumulative_offset;
        setScanProgress((p) => ({ ...p, scanned: totalScanned }));

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
        setStatusMsg(`Scanned ${totalScanned.toLocaleString()} records. No orphans found — database is clean.`);
        toast.success('No orphaned records found!');
        return;
      }

      // Step 3: Count per orphaned report_id
      setPhase('counting');
      const counts = {};
      for (const rid of ids) {
        if (cancelRef.current) { setPhase('idle'); return; }
        setStatusMsg(`Counting orphans for report ${rid.slice(0, 8)}...`);
        const countRes = await base44.functions.invoke('cleanupOrphanOntRecords', {
          mode: 'count', report_id: rid
        });
        counts[rid] = countRes.data.count;
        setOrphanCounts({ ...counts });
      }

      const total = Object.values(counts).reduce((s, c) => s + c, 0);
      setStatusMsg(`Found ${total.toLocaleString()} orphaned records across ${ids.length} missing report(s).`);
      setPhase('scanned');
      toast.warning(`Found ${total.toLocaleString()} orphaned records`);

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

          setStatusMsg(`Deleting records for report ${reportId.slice(0, 8)}... (${totalDeleted}/${totalToDelete})`);
          setDeleteProgress({ deleted: totalDeleted, total: totalToDelete });

          const res = await base44.functions.invoke('cleanupOrphanOntRecords', {
            mode: 'delete', report_id: reportId
          });
          totalDeleted += res.data.deleted;
          remaining = res.data.remaining;
        }
      }

      setDeleteProgress({ deleted: totalDeleted, total: totalToDelete });
      setStatusMsg(`Deleted ${totalDeleted.toLocaleString()} orphaned records. Database is clean.`);
      setPhase('done');
      toast.success(`Cleaned up ${totalDeleted.toLocaleString()} records`);
    } catch (error) {
      toast.error(`Delete failed: ${error.message}`);
      setPhase('scanned');
    }
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
        <div className="flex gap-3 flex-wrap">
          {(phase === 'idle' || phase === 'done') && (
            <Button onClick={handleScan} variant="outline"
              className="border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/20">
              <Search className="w-4 h-4 mr-2" /> Scan for Orphans
            </Button>
          )}
          {phase === 'scanned' && totalOrphaned > 0 && (
            <Button onClick={handleDelete} variant="outline"
              className="border-red-400/50 text-red-300 hover:bg-red-500/20">
              <Trash2 className="w-4 h-4 mr-2" /> Delete {totalOrphaned.toLocaleString()} Records
            </Button>
          )}
          {isWorking && (
            <Button onClick={() => { cancelRef.current = true; }} variant="outline"
              className="border-yellow-400/50 text-yellow-300 hover:bg-yellow-500/20">
              <XCircle className="w-4 h-4 mr-2" /> Cancel
            </Button>
          )}
          {phase !== 'idle' && !isWorking && (
            <Button onClick={() => { setPhase('idle'); setStatusMsg(''); setOrphanedReportIds([]); setOrphanCounts({}); }}
              variant="outline" className="border-white/20 text-white/60 hover:bg-white/10">
              Reset
            </Button>
          )}
        </div>

        {/* Progress */}
        {isWorking && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-sm text-white/70">{statusMsg}</span>
            </div>
            {phase === 'deleting' && deleteProgress.total > 0 && (
              <Progress value={(deleteProgress.deleted / deleteProgress.total) * 100} className="h-1.5 bg-white/10" />
            )}
          </div>
        )}

        {/* Results */}
        {!isWorking && phase !== 'idle' && (
          <div className="rounded-lg bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label="Records Scanned" value={scanProgress.scanned} color="blue" />
              <StatBox label="Valid Reports" value={scanProgress.validReports} color="purple" />
              <StatBox label="Missing Reports" value={orphanedReportIds.length}
                color={orphanedReportIds.length > 0 ? 'orange' : 'green'} />
              <StatBox
                label={phase === 'done' && deleteProgress.deleted > 0 ? 'Deleted' : 'Orphaned'}
                value={phase === 'done' && deleteProgress.deleted > 0 ? deleteProgress.deleted : totalOrphaned}
                color={totalOrphaned > 0 && phase !== 'done' ? 'red' : 'green'}
              />
            </div>

            {orphanedReportIds.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-white/50 mb-2">Orphaned Report IDs:</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {orphanedReportIds.map((id) => (
                    <div key={id} className="flex items-center justify-between bg-white/5 rounded px-3 py-1.5">
                      <span className="text-xs font-mono text-orange-300 truncate">{id}</span>
                      <Badge variant="outline" className="text-xs border-white/20 text-white/60 ml-2 shrink-0">
                        {orphanCounts[id] != null ? `${orphanCounts[id].toLocaleString()} records` : '...'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
              orphanedReportIds.length === 0 || phase === 'done'
                ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                : 'bg-orange-500/10 border border-orange-500/20 text-orange-300'
            }`}>
              {orphanedReportIds.length === 0 || phase === 'done'
                ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              }
              <span>{statusMsg}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value, color }) {
  const colors = {
    blue: 'text-blue-400', purple: 'text-purple-400',
    orange: 'text-orange-400', green: 'text-green-400', red: 'text-red-400'
  };
  return (
    <div className="bg-white/5 rounded-lg p-3 text-center">
      <div className={`text-xl font-bold ${colors[color]}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-xs text-white/50">{label}</div>
    </div>
  );
}