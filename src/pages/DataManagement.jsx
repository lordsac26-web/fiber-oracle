import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ArrowLeft, Database, Trash2, Search, Loader2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';

export default function DataManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [oltFilter, setOltFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Fetch ONT records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['ontRecords', page, oltFilter, statusFilter, searchTerm],
    queryFn: async () => {
      const filters = {};
      if (oltFilter !== 'all') filters.olt_name = oltFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (searchTerm) filters.serial_number = { $regex: searchTerm, $options: 'i' };
      
      return await base44.entities.ONTPerformanceRecord.filter(
        filters,
        '-report_date',
        pageSize
      );
    },
  });

  // Get unique OLT names for filter
  const { data: oltNames = [] } = useQuery({
    queryKey: ['oltNames'],
    queryFn: async () => {
      const allRecords = await base44.entities.ONTPerformanceRecord.list('-report_date', 1000);
      return [...new Set(allRecords.map(r => r.olt_name).filter(Boolean))];
    },
  });

  // Get total record count
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['ontRecordsTotalCount'],
    queryFn: async () => {
      const response = await base44.functions.invoke('countOntRecords');
      return response.data?.count || 0;
    },
  });

  const handleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map(r => r.id)));
    }
  };

  const handleSelectRecord = (recordId) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    toast.loading(`Deleting ${selectedRecords.size} records...`, { id: 'bulk-delete' });
    
    try {
      const response = await base44.functions.invoke('bulkDeleteOntRecords', {
        record_ids: Array.from(selectedRecords)
      });
      
      if (response.data.success) {
        toast.success(
          `Successfully deleted ${response.data.deleted_count} records${
            response.data.failed_count > 0 ? `, ${response.data.failed_count} failed` : ''
          }`,
          { id: 'bulk-delete' }
        );
        setSelectedRecords(new Set());
        queryClient.invalidateQueries({ queryKey: ['ontRecords'] });
      } else {
        toast.error('Failed to delete records', { id: 'bulk-delete' });
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error(`Error: ${error.message}`, { id: 'bulk-delete' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const filteredRecords = records;

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
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Data Management</h1>
                <p className="text-xs text-gray-500">Manage ONT Performance Records</p>
              </div>
            </div>
            {selectedRecords.size > 0 && (
              <Button 
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Selected ({selectedRecords.size})
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
                    <Database className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{totalCount.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Total Records Stored</div>
                  </div>
                </div>
                <div className="border-l border-gray-200 dark:border-gray-700 pl-6">
                  <div className="text-lg font-semibold">{records.length}</div>
                  <div className="text-xs text-gray-500">On this page</div>
                </div>
              </div>
              {selectedRecords.size > 0 && (
                <Badge variant="outline" className="text-sm">
                  {selectedRecords.size} selected
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="border-0 shadow">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by Serial Number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={oltFilter} onValueChange={setOltFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="OLT" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All OLTs</SelectItem>
                  {oltNames.map(olt => (
                    <SelectItem key={olt} value={olt}>{olt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="ok">OK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card className="border-0 shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>ONT Performance Records</span>
              {records.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedRecords.size === records.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-gray-500">Loading records...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="py-12 text-center">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedRecords.size === records.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>ONT ID</TableHead>
                      <TableHead>OLT</TableHead>
                      <TableHead>Port</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>ONT Rx</TableHead>
                      <TableHead>Report Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow 
                        key={record.id}
                        className={selectedRecords.has(record.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedRecords.has(record.id)}
                            onCheckedChange={() => handleSelectRecord(record.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{record.serial_number}</TableCell>
                        <TableCell className="font-mono text-sm">{record.ont_id || '-'}</TableCell>
                        <TableCell className="text-sm">{record.olt_name || '-'}</TableCell>
                        <TableCell className="text-sm">{record.shelf_slot_port || '-'}</TableCell>
                        <TableCell className="text-sm">{record.model || '-'}</TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              record.status === 'critical' ? 'bg-red-100 text-red-800' :
                              record.status === 'warning' ? 'bg-amber-100 text-amber-800' :
                              'bg-green-100 text-green-800'
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record.ont_rx_power ? `${record.ont_rx_power} dBm` : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.report_date ? moment(record.report_date).format('MM/DD/YY HH:mm') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-0 shadow bg-blue-50 dark:bg-blue-900/20 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Bulk Deletion Notes:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Select up to {pageSize} records per page for deletion</li>
                  <li>Deletions respect rate limits (150 ops/min)</li>
                  <li>Large batches may take several seconds</li>
                  <li>Failed deletions will be reported in the result</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRecords.size} selected record{selectedRecords.size !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
              Delete {selectedRecords.size} Record{selectedRecords.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}