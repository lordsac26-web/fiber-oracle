import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, CheckCircle, User, Calendar, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminOverviewTab({
  pendingRequests, pendingDocuments, recentApprovals, analytics,
  allReferenceDocs, allUsers, allConversations,
  onSelectRequest, onApproveDoc, onDenyDoc,
  approveDocPending, denyDocPending
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-slate-400 text-xs uppercase tracking-widest">Pending Requests</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-3xl font-bold text-yellow-400">{pendingRequests.length}</div>
            <p className="text-xs text-slate-500 mt-1">Awaiting action</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-slate-400 text-xs uppercase tracking-widest">Knowledge Base</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-3xl font-bold text-cyan-400">{allReferenceDocs.length}</div>
            <p className="text-xs text-slate-500 mt-1">{allReferenceDocs.filter((d) => d.is_active).length} active docs</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-slate-400 text-xs uppercase tracking-widest">Total Users</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-3xl font-bold text-purple-400">{allUsers.length}</div>
            <p className="text-xs text-slate-500 mt-1">{allUsers.filter((u) => u.role === 'admin').length} admins</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-slate-400 text-xs uppercase tracking-widest">AI Sessions</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-3xl font-bold text-blue-400">{allConversations.length}</div>
            <p className="text-xs text-slate-500 mt-1">{analytics.ai.totalQueries} queries</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        {/* Pending Requests */}
        <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" /> Pending User Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="text-white/60 text-center py-8">No pending requests</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{request.subject}</h3>
                        <p className="text-sm text-white/70 mb-2">{request.message}</p>
                        <div className="flex items-center gap-2 text-xs text-white/50">
                          <User className="w-3 h-3" /> {request.requested_by}
                          <span>•</span>
                          <Calendar className="w-3 h-3" /> {new Date(request.created_date).toLocaleString()}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => onSelectRequest(request)} className="bg-blue-600 hover:bg-blue-700">Resolve</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Master List Submissions */}
        <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Master List Submissions ({pendingDocuments.length})
              </CardTitle>
              <Link to={createPageUrl('DocumentReview')}>
                <Button size="sm" variant="outline" className="bg-white text-slate-800 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors border dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm dark:hover:bg-gray-700 h-8 border-slate-600 hover:bg-slate-700">
                  Review All Docs
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {pendingDocuments.length === 0 ? (
              <p className="text-white/60 text-center py-8">No pending master list submissions</p>
            ) : (
              <div className="space-y-3">
                {pendingDocuments.map((doc) => (
                  <div key={doc.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white mb-1">{doc.title}</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge className="bg-purple-100 text-purple-800">{doc.category}</Badge>
                          <Badge className="bg-yellow-100 text-yellow-800">Master List Request</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/50 mb-3">
                          <User className="w-3 h-3" /> {doc.submitted_by}
                          <span>•</span>
                          <Calendar className="w-3 h-3" /> {new Date(doc.created_date).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" onClick={() => onApproveDoc(doc)} className="bg-green-600 hover:bg-green-700" disabled={approveDocPending}><ThumbsUp className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => onDenyDoc(doc)} className="border-red-400 text-red-400 hover:bg-red-500/20" disabled={denyDocPending}><ThumbsDown className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Approvals */}
        <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" /> Recent Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentApprovals.length === 0 ? (
              <p className="text-white/60 text-center py-8">No recent approvals</p>
            ) : (
              <div className="space-y-3">
                {recentApprovals.map((approval) => (
                  <div key={approval.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-white text-sm mb-1">{approval.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-white/50">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> Requested: {approval.submitted_by}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved: {approval.reviewed_by}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(approval.review_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Approved</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}