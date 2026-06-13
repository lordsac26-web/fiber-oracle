import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Bell, ClipboardList, Loader2, Flag, X, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import AlertRow from '@/components/alerts/AlertRow';
import CreateWorkOrderDialog from '@/components/alerts/CreateWorkOrderDialog';
import ONTDetailView from '@/components/ponpm/ONTDetailView';

// Rebuild a minimal ONT-shaped object from a denormalized alert so ONTDetailView
// (which fetches history by serial and renders snapshot fields) works standalone.
function alertToOnt(a) {
  return {
    SerialNumber: a.serial_number,
    OntID: a.ont_id,
    OLTName: a.olt_name,
    _oltName: a.olt_name,
    _port: a.port,
    'Shelf/Slot/Port': a.port,
    _lcpNumber: a.lcp_number,
    _splitterNumber: a.splitter_number,
    OntRxOptPwr: a.ont_rx_power,
    OLTRXOptPwr: a.olt_rx_power,
    _analysis: { status: a.ont_status || 'warning', issues: [], warnings: [] },
    _subscriber: (a.subscriber_name || a.subscriber_account || a.subscriber_address) ? (() => {
      // Extract zip from denormalized address string (e.g. "123 Main St, Catskill, NY, 12414")
      const zipMatch = (a.subscriber_address || '').match(/(\d{5})(?:\s*$|-\d{4}$)/);
      const zip = zipMatch ? zipMatch[1] : undefined;
      // subscriber_name on an ONTAlert holds the account/display name.
      // subscriber_account may hold a separate account ID. Show whichever is
      // distinct so the Overview card shows a real name and not the same value twice.
      const name = a.subscriber_name && a.subscriber_name !== a.subscriber_account
        ? a.subscriber_name
        : (a.subscriber_name || a.subscriber_account);
      const account = a.subscriber_account || a.subscriber_name;
      return {
        name,
        account,
        address: a.subscriber_address,
        zip,
      };
    })() : undefined,
    report_id: a.report_id,
  };
}

export default function Alerts() {
  const { isAdmin, checked: adminChecked } = useIsAdmin();
  const adminLoading = !adminChecked;
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('open'); // 'open' | 'resolved'
  const [selected, setSelected] = useState({}); // alertId -> alert
  const [detailOnt, setDetailOnt] = useState(null);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['ontAlerts'],
    queryFn: () => base44.entities.ONTAlert.list('-created_date', 1000),
    enabled: isAdmin,
    staleTime: 30 * 1000,
  });

  const openAlerts = useMemo(() => alerts.filter(a => a.status === 'open'), [alerts]);
  const resolvedAlerts = useMemo(() => alerts.filter(a => a.status === 'resolved'), [alerts]);
  const list = tab === 'open' ? openAlerts : resolvedAlerts;

  const selectedIds = useMemo(() => new Set(Object.keys(selected)), [selected]);
  const selectedAlerts = useMemo(() => Object.values(selected), [selected]);

  const toggleSelect = useCallback((alert) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[alert.id]) delete next[alert.id]; else next[alert.id] = alert;
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelected({}), []);
  const selectAll = useCallback(() => {
    setSelected(prev => {
      const allSelected = list.length > 0 && list.every(a => prev[a.id]);
      if (allSelected) return {};
      const next = {};
      list.forEach(a => { next[a.id] = a; });
      return next;
    });
  }, [list]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ontAlerts'] });

  const resolveAlert = useCallback(async (alert) => {
    let me = null;
    try { me = await base44.auth.me(); } catch { /* ignore */ }
    await base44.entities.ONTAlert.update(alert.id, {
      status: 'resolved', resolved_by: me?.email, resolved_date: new Date().toISOString(),
    });
    toast.success('Alert resolved');
    invalidate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteAlert = useCallback(async (alert) => {
    await base44.entities.ONTAlert.delete(alert.id);
    setSelected(prev => { const n = { ...prev }; delete n[alert.id]; return n; });
    toast.success('Alert deleted');
    invalidate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (adminLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <Bell className="h-10 w-10 text-gray-300 mx-auto" />
            <h2 className="text-lg font-semibold">Admins only</h2>
            <p className="text-sm text-gray-500">The Alerts section is restricted to administrators.</p>
            <Link to="/"><Button variant="outline">Back to Home</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/PONPMAnalysis">
              <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5 text-red-500" /> ONT Alerts
              </h1>
              <p className="text-xs text-gray-500">Flagged ONTs &amp; work orders</p>
            </div>
          </div>
          <div className="flex border rounded-lg overflow-hidden">
            <Button variant={tab === 'open' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => { setTab('open'); clearSelection(); }}>
              Open <Badge variant="outline" className="ml-1.5">{openAlerts.length}</Badge>
            </Button>
            <Button variant={tab === 'resolved' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => { setTab('resolved'); clearSelection(); }}>
              Resolved <Badge variant="outline" className="ml-1.5">{resolvedAlerts.length}</Badge>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Toolbar */}
        {tab === 'open' && list.length > 0 && (
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={selectAll}>
              {list.every(a => selectedIds.has(a.id)) ? 'Deselect all' : 'Select all'}
            </Button>
            <span className="text-xs text-gray-500">{list.length} open alert{list.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" /></div>
        ) : list.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
              <h3 className="font-semibold">{tab === 'open' ? 'No open alerts' : 'No resolved alerts'}</h3>
              <p className="text-sm text-gray-500">
                {tab === 'open'
                  ? 'Flag ONTs from the PON PM Analysis page to see them here.'
                  : 'Resolved alerts and work orders will appear here.'}
              </p>
              {tab === 'open' && (
                <Link to="/PONPMAnalysis"><Button variant="outline"><Flag className="h-4 w-4 mr-2" />Go to PON PM Analysis</Button></Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 pb-24">
            {list.map(alert => (
              <AlertRow
                key={alert.id}
                alert={alert}
                selectable={tab === 'open'}
                isSelected={selectedIds.has(alert.id)}
                onToggleSelect={toggleSelect}
                onDrillDown={(a) => setDetailOnt(alertToOnt(a))}
                onResolve={resolveAlert}
                onDelete={(a) => setConfirmDelete(a)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating action bar — grouped work order from selected open alerts */}
      {selectedAlerts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white rounded-full shadow-2xl px-5 py-3">
          <span className="text-sm font-medium">{selectedAlerts.length} selected</span>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-full" onClick={() => setShowWorkOrder(true)}>
            <ClipboardList className="h-4 w-4 mr-1" /> Create Work Order
          </Button>
          <button onClick={clearSelection} className="text-gray-300 hover:text-white" aria-label="Clear selection">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Grouped work order dialog */}
      {showWorkOrder && (
        <CreateWorkOrderDialog
          alerts={selectedAlerts}
          open={showWorkOrder}
          onOpenChange={setShowWorkOrder}
          onCreated={() => { clearSelection(); invalidate(); }}
        />
      )}

      {/* ONT drill-down */}
      {detailOnt && (
        <ONTDetailView ont={detailOnt} onClose={() => setDetailOnt(null)} allOnts={[]} />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete alert?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the flag for {confirmDelete?.serial_number}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { if (confirmDelete) deleteAlert(confirmDelete); setConfirmDelete(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}