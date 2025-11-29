import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReportForm from '@/components/jobreports/ReportForm';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  FileText,
  MoreVertical,
  Trash2,
  Edit,
  Eye,
  Calendar,
  MapPin,
  User,
  Zap,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  SortAsc,
  SortDesc,
  FileDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import moment from 'moment';
import { useUserPreferences } from '@/components/UserPreferencesContext';

const STATUS_CONFIG = {
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Clock },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  needs_followup: { label: 'Needs Follow-up', color: 'bg-amber-100 text-amber-800', icon: AlertTriangle },
};

const EMPTY_REPORT = {
  job_number: '',
  technician_name: '',
  location: '',
  start_power_level: '',
  end_power_level: '',
  status: 'in_progress',
  notes: '',
  equipment_used: [],
  diagnosis_used: false,
  diagnosis_result: '',
};

export default function JobReports() {
  const queryClient = useQueryClient();
  const { preferences } = useUserPreferences();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState(preferences.defaultSortBy || 'created_date');
  const [sortOrder, setSortOrder] = useState(preferences.defaultSortOrder || 'desc');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);
  const [formData, setFormData] = useState(EMPTY_REPORT);

  // Fetch job reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['jobReports'],
    queryFn: () => base44.entities.JobReport.list('-created_date'),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.JobReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobReports'] });
      toast.success('Job report created');
      setShowCreateDialog(false);
      setFormData(EMPTY_REPORT);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.JobReport.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobReports'] });
      toast.success('Job report updated');
      setEditingReport(null);
      setFormData(EMPTY_REPORT);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.JobReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobReports'] });
      toast.success('Job report deleted');
    },
  });

  // Filter and sort reports
  const filteredReports = reports
    .filter(report => {
      const matchesSearch = 
        report.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.technician_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (sortBy === 'created_date' || sortBy === 'completion_date') {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      }
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  // Calculate power improvement
  const calculateImprovement = (start, end) => {
    if (!start || !end) return null;
    return (parseFloat(end) - parseFloat(start)).toFixed(2);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Job Number', 'Technician', 'Location', 'Status', 'Start Power (dBm)', 'End Power (dBm)', 'Improvement (dB)', 'Created Date', 'Notes'];
    const rows = filteredReports.map(r => [
      r.job_number,
      r.technician_name,
      r.location,
      r.status,
      r.start_power_level,
      r.end_power_level,
      calculateImprovement(r.start_power_level, r.end_power_level) || '',
      moment(r.created_date).format('YYYY-MM-DD HH:mm'),
      r.notes?.replace(/,/g, ';') || ''
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `job-reports-${moment().format('YYYY-MM-DD')}.csv`;
    link.click();
    toast.success('Reports exported to CSV');
  };

  // Export single report to PDF
  const exportToPDF = (report) => {
    const improvement = calculateImprovement(report.start_power_level, report.end_power_level);
    const statusLabel = STATUS_CONFIG[report.status]?.label || report.status;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Job Report - ${report.job_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #1f2937; }
            .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { font-size: 24px; color: #1e40af; }
            .header p { color: #6b7280; margin-top: 5px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }
            .badge-progress { background: #dbeafe; color: #1e40af; }
            .badge-completed { background: #dcfce7; color: #166534; }
            .badge-followup { background: #fef3c7; color: #92400e; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .field { margin-bottom: 12px; }
            .field-label { font-size: 12px; color: #9ca3af; margin-bottom: 2px; }
            .field-value { font-size: 14px; font-weight: 500; }
            .notes-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
            .photos { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
            .photo { width: 150px; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; }
            .improvement-positive { color: #16a34a; }
            .improvement-negative { color: #dc2626; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Job Report: ${report.job_number}</h1>
            <p>Generated on ${moment().format('MMMM D, YYYY [at] h:mm A')}</p>
          </div>

          <div class="section">
            <div class="grid">
              <div class="field">
                <div class="field-label">Status</div>
                <span class="badge ${report.status === 'completed' ? 'badge-completed' : report.status === 'needs_followup' ? 'badge-followup' : 'badge-progress'}">${statusLabel}</span>
              </div>
              <div class="field">
                <div class="field-label">Date Created</div>
                <div class="field-value">${moment(report.created_date).format('MMMM D, YYYY')}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Job Information</div>
            <div class="grid">
              <div class="field">
                <div class="field-label">Technician</div>
                <div class="field-value">${report.technician_name || '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Location</div>
                <div class="field-value">${report.location || '-'}</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Power Measurements</div>
            <div class="grid">
              <div class="field">
                <div class="field-label">Start Power Level</div>
                <div class="field-value">${report.start_power_level ? report.start_power_level + ' dBm' : '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">End Power Level</div>
                <div class="field-value">${report.end_power_level ? report.end_power_level + ' dBm' : '-'}</div>
              </div>
              <div class="field">
                <div class="field-label">Improvement</div>
                <div class="field-value ${improvement && parseFloat(improvement) >= 0 ? 'improvement-positive' : 'improvement-negative'}">${improvement ? (parseFloat(improvement) >= 0 ? '+' : '') + improvement + ' dB' : '-'}</div>
              </div>
            </div>
          </div>

          ${report.notes ? `
          <div class="section">
            <div class="section-title">Notes</div>
            <div class="notes-box">${report.notes}</div>
          </div>
          ` : ''}

          ${report.photo_urls && report.photo_urls.length > 0 ? `
          <div class="section">
            <div class="section-title">Photos</div>
            <div class="photos">
              ${report.photo_urls.map(url => `<img src="${url}" class="photo" />`).join('')}
            </div>
          </div>
          ` : ''}

          <div class="footer">
            Fiber Oracle Job Report • ${report.job_number}
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      start_power_level: formData.start_power_level ? parseFloat(formData.start_power_level) : null,
      end_power_level: formData.end_power_level ? parseFloat(formData.end_power_level) : null,
      power_improvement: calculateImprovement(formData.start_power_level, formData.end_power_level),
    };

    if (editingReport) {
      updateMutation.mutate({ id: editingReport.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (report) => {
    setFormData({
      job_number: report.job_number || '',
      technician_name: report.technician_name || '',
      location: report.location || '',
      start_power_level: report.start_power_level?.toString() || '',
      end_power_level: report.end_power_level?.toString() || '',
      status: report.status || 'in_progress',
      notes: report.notes || '',
      equipment_used: report.equipment_used || [],
      diagnosis_used: report.diagnosis_used || false,
      diagnosis_result: report.diagnosis_result || '',
    });
    setEditingReport(report);
  };

  const handleCancel = () => {
    setShowCreateDialog(false);
    setEditingReport(null);
    setFormData(EMPTY_REPORT);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Job Reports</h1>
                <p className="text-sm text-gray-500">Manage and track your fiber installation jobs</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredReports.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Create Job Report</DialogTitle>
                          </DialogHeader>
                          <ReportForm 
                            formData={formData}
                            setFormData={setFormData}
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                            isEditing={false}
                            isSubmitting={createMutation.isPending}
                          />
                        </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by job number, technician, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="needs_followup">Needs Follow-up</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_date">Date Created</SelectItem>
                    <SelectItem value="job_number">Job Number</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">No job reports found</h3>
              <p className="text-sm text-gray-500 mt-1">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first job report to get started'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Report
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map((report) => {
              const statusConfig = STATUS_CONFIG[report.status] || STATUS_CONFIG.in_progress;
              const StatusIcon = statusConfig.icon;
              const improvement = calculateImprovement(report.start_power_level, report.end_power_level);

              return (
                <Card key={report.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{report.job_number}</h3>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {report.technician_name && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <User className="h-4 w-4" />
                              <span className="truncate">{report.technician_name}</span>
                            </div>
                          )}
                          {report.location && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="h-4 w-4" />
                              <span className="truncate">{report.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{moment(report.created_date).format('MMM D, YYYY')}</span>
                          </div>
                          {improvement && (
                            <div className="flex items-center gap-2">
                              <Zap className={`h-4 w-4 ${parseFloat(improvement) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                              <span className={parseFloat(improvement) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {parseFloat(improvement) >= 0 ? '+' : ''}{improvement} dB
                              </span>
                            </div>
                          )}
                        </div>

                        {report.notes && (
                          <p className="text-sm text-gray-500 mt-2 line-clamp-2">{report.notes}</p>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingReport(report)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(report)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportToPDF(report)}>
                            <FileDown className="h-4 w-4 mr-2" />
                            Export PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this report?')) {
                                deleteMutation.mutate(report.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Summary Stats */}
        {reports.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{reports.length}</p>
                <p className="text-sm text-gray-500">Total Reports</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {reports.filter(r => r.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-500">Completed</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {reports.filter(r => r.status === 'needs_followup').length}
                </p>
                <p className="text-sm text-gray-500">Needs Follow-up</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {reports.filter(r => r.status === 'in_progress').length}
                </p>
                <p className="text-sm text-gray-500">In Progress</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingReport} onOpenChange={(open) => !open && setEditingReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Job Report</DialogTitle>
          </DialogHeader>
          <ReportForm 
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEditing={true}
            isSubmitting={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Job Report Details</DialogTitle>
          </DialogHeader>
          {viewingReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Job Number</Label>
                  <p className="font-medium">{viewingReport.job_number}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <Badge className={STATUS_CONFIG[viewingReport.status]?.color}>
                    {STATUS_CONFIG[viewingReport.status]?.label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-gray-500">Technician</Label>
                  <p className="font-medium">{viewingReport.technician_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Location</Label>
                  <p className="font-medium">{viewingReport.location || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Start Power</Label>
                  <p className="font-medium">{viewingReport.start_power_level ? `${viewingReport.start_power_level} dBm` : '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">End Power</Label>
                  <p className="font-medium">{viewingReport.end_power_level ? `${viewingReport.end_power_level} dBm` : '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Improvement</Label>
                  <p className="font-medium">
                    {calculateImprovement(viewingReport.start_power_level, viewingReport.end_power_level) 
                      ? `${calculateImprovement(viewingReport.start_power_level, viewingReport.end_power_level)} dB` 
                      : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Created</Label>
                  <p className="font-medium">{moment(viewingReport.created_date).format('MMM D, YYYY h:mm A')}</p>
                </div>
              </div>
              {viewingReport.notes && (
                <div>
                  <Label className="text-gray-500">Notes</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">{viewingReport.notes}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setViewingReport(null)}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => exportToPDF(viewingReport)}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button onClick={() => {
                  setViewingReport(null);
                  openEditDialog(viewingReport);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Report
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}