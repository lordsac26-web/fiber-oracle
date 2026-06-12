import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, FileText, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';

export default function ReportManagement() {
  const queryClient = useQueryClient();
  const [selectedReports, setSelectedReports] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['ponpmReports'],
    queryFn: async () => {
      return await base44.entities.PONPMReport.list('-upload_date', 100);
    },
  });

  const { data: ontRecordCount = 0 } = useQuery({
    queryKey: ['ontRecordsTotalCount'],
    queryFn: async () => {
      const response = await base44.functions.invoke('countOntRecords');
      return response.data?.count || 0;
    },
  });

  const handleSelectAll = () => {
    if (selectedReports.size === reports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(reports.map(r => r.id)));
    }
  };

  const handleSelectReport = (reportId) => {
    const newSelected = new Set(selectedReports);
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId);
    } else {
      newSelected.add(reportId);
    }
    setSelectedReports(newSelected);
  };

  const handleBatchDelete = async () => {
    if (selectedReports.size > 10) {
      toast.error('Please select 10 or fewer reports to delete at once');
      return;
    }

    setIsDeleting(true);
    const reportIds = Array.from(selectedReports);
    let successCount = 0;
    let failCount = 0;

    toast.loading(`Deleting ${reportIds.length} report(s)...`, { id: 'batch-delete' });

    for (const reportId of reportIds) {
      try {
        const response = await base44.functions.invoke('deleteReportWithRecords', {
          report_id: reportId
        });

        if (response.data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to delete report ${reportId}:`, error);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(
        `Successfully deleted ${successCount} report(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
        { id: 'batch-delete' }
      );
      setSelectedReports(new Set());
      queryClient.invalidateQueries({ queryKey: ['ponpmReports'] });
      queryClient.invalidateQueries({ queryKey: ['ontRecordsTotalCount'] });
    } else {
      toast.error('Failed to delete reports', { id: 'batch-delete' });
    }

    setIsDeleting(false);
    setShowDeleteConfirm(false);
  };

  const handlePurgeAll = async () => {
    if (!confirm('⚠️ DANGER: This will delete ALL PON PM data. This cannot be undone. Are you absolutely sure?')) {
      return;
    }

    setIsDeleting(true);
    toast.loading('Purging all PON PM data...', { id: 'purge-all' });

    try {
      const response = await base44.functions.invoke('purgeModuleData', {
        module_type: 'pon_pm_all'
      });

      if (response.data.success) {
        toast.success(response.data.message, { id: 'purge-all' });
        queryClient.invalidateQueries({ queryKey: ['ponpmReports'] });
        queryClient.invalidateQueries({ queryKey: ['ontRecordsTotalCount'] });
      } else {
        toast.error('Failed to purge data', { id: 'purge-all' });
      }
    } catch (error) {
      toast.error(`Error: ${error.response?.data?.error || error.message}`, { id: 'purge-all' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('PONPMAnalysis')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Report Management</h1>
                <p className="text-xs text-gray-500">Manage PON PM Reports</p>
              </div>
            </div>
            {selectedReports.size > 0 && (
              <Button 
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting || selectedReports.size > 10}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Selected ({selectedReports.size})
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Card */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{reports.length}</div>
                    <div className="text-sm text-gray-500">Total Reports</div>
                  </div>
                </div>
                <div className="border-l border-gray-200 dark:border-gray-700 pl-6">
                  <div className="text-lg font-semibold">{ontRecordCount.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Total ONT Records</div>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handlePurgeAll}
                disabled={isDeleting || reports.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Purge All Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-0 shadow bg-amber-50 dark:bg-amber-900/20 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">Batch Deletion Guidelines:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Select up to 10 reports for batch deletion (prevents timeouts)</li>
                  <li>Each report deletion includes all associated ONT records</li>
                  <li>Large reports may take 10-30 seconds to delete</li>
                  <li>Use "Purge All Data" only if you want to delete everything</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card className="border-0 shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>PON PM Reports</span>
              {reports.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedReports.size === reports.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-gray-500">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No reports found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedReports.size === reports.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>ONT Count</TableHead>
                      <TableHead>OLT Count</TableHead>
                      <TableHead>Critical</TableHead>
                      <TableHead>Warning</TableHead>
                      <TableHead>OK</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow 
                        key={report.id}
                        className={selectedReports.has(report.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedReports.has(report.id)}
                            onCheckedChange={() => handleSelectReport(report.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{report.report_name}</TableCell>
                        <TableCell className="text-sm">
                          {moment(report.upload_date).format('MM/DD/YY HH:mm')}
                        </TableCell>
                        <TableCell className="text-sm">{report.ont_count || 0}</TableCell>
                        <TableCell className="text-sm">{report.olt_count || 0}</TableCell>
                        <TableCell>
                          <Badge className="bg-red-100 text-red-800">
                            {report.critical_count || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-amber-100 text-amber-800">
                            {report.warning_count || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            {report.ok_count || 0}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Report Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedReports.size} report{selectedReports.size !== 1 ? 's' : ''} 
              and all associated ONT records? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} className="bg-red-600 hover:bg-red-700">
              Delete {selectedReports.size} Report{selectedReports.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}