import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileCheck,
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Zap,
  MessageSquare,
  Upload,
  Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';

const EVENT_ICONS = {
  query: MessageSquare,
  response: Zap,
  pdf_upload: Upload,
  document_reference: FileText,
  tool_invocation: Database,
  conversation_start: MessageSquare,
  conversation_load: Database
};

const EVENT_COLORS = {
  query: 'bg-blue-100 text-blue-800 border-blue-300',
  response: 'bg-purple-100 text-purple-800 border-purple-300',
  pdf_upload: 'bg-green-100 text-green-800 border-green-300',
  document_reference: 'bg-amber-100 text-amber-800 border-amber-300',
  tool_invocation: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  conversation_start: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  conversation_load: 'bg-slate-100 text-slate-800 border-slate-300'
};

const STATUS_ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  pending: Clock
};

export default function PhotonAuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 500),
  });

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.conversation_id?.includes(searchTerm);
    
    const matchesEventType = eventTypeFilter === 'all' || log.event_type === eventTypeFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    
    return matchesSearch && matchesEventType && matchesStatus;
  });

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Event Type', 'User', 'Conversation ID', 'Status', 'Content', 'Duration (ms)', 'Error'].join(','),
      ...filteredLogs.map(log => [
        moment(log.created_date).format('YYYY-MM-DD HH:mm:ss'),
        log.event_type,
        log.user_email,
        log.conversation_id || '',
        log.status,
        `"${(log.content || '').replace(/"/g, '""').substring(0, 200)}"`,
        log.duration_ms || '',
        `"${(log.error_message || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `photon-audit-logs-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const eventTypeStats = {
    query: auditLogs.filter(l => l.event_type === 'query').length,
    response: auditLogs.filter(l => l.event_type === 'response').length,
    pdf_upload: auditLogs.filter(l => l.event_type === 'pdf_upload').length,
    tool_invocation: auditLogs.filter(l => l.event_type === 'tool_invocation').length,
  };

  const errorCount = auditLogs.filter(l => l.status === 'error').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('PhotonChat')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">P.H.O.T.O.N. Audit Logs</h1>
                <p className="text-xs text-gray-500">Comprehensive activity tracking and compliance</p>
              </div>
            </div>
            <Button onClick={exportLogs} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-0 shadow">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {auditLogs.length}
              </div>
              <div className="text-xs text-gray-500">Total Events</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {eventTypeStats.query}
              </div>
              <div className="text-xs text-gray-500">Queries</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {eventTypeStats.response}
              </div>
              <div className="text-xs text-gray-500">Responses</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {eventTypeStats.pdf_upload}
              </div>
              <div className="text-xs text-gray-500">PDF Uploads</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {errorCount}
              </div>
              <div className="text-xs text-gray-500">Errors</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by content, user, or conversation ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="query">Queries</SelectItem>
                  <SelectItem value="response">Responses</SelectItem>
                  <SelectItem value="pdf_upload">PDF Uploads</SelectItem>
                  <SelectItem value="document_reference">Doc References</SelectItem>
                  <SelectItem value="tool_invocation">Tool Calls</SelectItem>
                  <SelectItem value="conversation_start">New Conversations</SelectItem>
                  <SelectItem value="conversation_load">Loaded Conversations</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="border-0 shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Activity Log ({filteredLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const EventIcon = EVENT_ICONS[log.event_type] || FileCheck;
                    const StatusIcon = STATUS_ICONS[log.status] || CheckCircle2;
                    
                    return (
                      <TableRow 
                        key={log.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="text-xs text-gray-500">
                          {moment(log.created_date).format('MM/DD/YY HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={EVENT_COLORS[log.event_type]}>
                            <EventIcon className="h-3 w-3 mr-1" />
                            {log.event_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {log.user_email?.split('@')[0]}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <StatusIcon className={`h-4 w-4 ${
                              log.status === 'success' ? 'text-green-600' :
                              log.status === 'error' ? 'text-red-600' :
                              'text-amber-600'
                            }`} />
                            <span className="text-xs capitalize">{log.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md truncate text-sm">
                          {log.content || '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs text-gray-500">
                          {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No audit logs found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && React.createElement(EVENT_ICONS[selectedLog.event_type] || FileCheck, { className: "h-5 w-5" })}
              Audit Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Event Type</div>
                  <Badge variant="outline" className={EVENT_COLORS[selectedLog.event_type]}>
                    {selectedLog.event_type.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <Badge variant="outline" className={
                    selectedLog.status === 'success' ? 'bg-green-100 text-green-800' :
                    selectedLog.status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-amber-100 text-amber-800'
                  }>
                    {selectedLog.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">User</div>
                  <div className="text-sm font-mono">{selectedLog.user_email}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Timestamp</div>
                  <div className="text-sm">{moment(selectedLog.created_date).format('MMMM D, YYYY h:mm:ss A')}</div>
                </div>
                {selectedLog.conversation_id && (
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-1">Conversation ID</div>
                    <div className="text-sm font-mono">{selectedLog.conversation_id}</div>
                  </div>
                )}
                {selectedLog.duration_ms && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Duration</div>
                    <div className="text-sm">{selectedLog.duration_ms}ms</div>
                  </div>
                )}
              </div>

              {selectedLog.content && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Content</div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm whitespace-pre-wrap">
                    {selectedLog.content}
                  </div>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-1">Metadata</div>
                  <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.error_message && (
                <div>
                  <div className="text-xs text-red-600 mb-1">Error Message</div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}