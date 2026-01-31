import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, MessageSquare, FileText, CheckCircle, XCircle, Clock, AlertCircle, User, Calendar, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminPanel() {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [adminNotes, setAdminNotes] = useState('');
    const queryClient = useQueryClient();

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: pendingRequests = [] } = useQuery({
        queryKey: ['pendingAdminRequests'],
        queryFn: () => base44.entities.AdminRequest.filter({ status: 'pending' }, '-created_date')
    });

    const { data: pendingDocuments = [] } = useQuery({
        queryKey: ['pendingMasterDocs'],
        queryFn: () => base44.entities.DocumentSubmission.filter({ 
            status: 'pending',
            add_to_master: true 
        }, '-created_date')
    });

    const { data: recentApprovals = [] } = useQuery({
        queryKey: ['recentApprovals'],
        queryFn: async () => {
            const submissions = await base44.entities.DocumentSubmission.filter({ 
                status: 'approved' 
            }, '-review_date', 20);
            return submissions;
        }
    });

    const resolveRequestMutation = useMutation({
        mutationFn: async ({ requestId, notes }) => {
            const request = await base44.entities.AdminRequest.get(requestId);
            await base44.entities.AdminRequest.update(requestId, {
                status: 'resolved',
                resolved_by: user.email,
                resolved_date: new Date().toISOString(),
                admin_notes: notes
            });
            
            // Send notification to requester
            await base44.integrations.Core.SendEmail({
                to: request.requested_by,
                subject: `Request Resolved: ${request.subject}`,
                body: `
Hello,

Your request has been resolved by an administrator.

Subject: ${request.subject}
Status: Resolved
Resolved by: ${user.email}
Date: ${new Date().toLocaleString()}

${notes ? `Admin notes: ${notes}` : ''}

Thank you for reaching out!
                `
            });
            
            return request;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pendingAdminRequests']);
            toast.success('Request resolved and user notified');
            setSelectedRequest(null);
            setAdminNotes('');
        }
    });

    const approveDocMutation = useMutation({
        mutationFn: async (doc) => {
            await base44.entities.ReferenceDocument.create({
                title: doc.title,
                category: doc.category || 'other',
                version: doc.version || '1.0',
                comments: doc.comments,
                annotations: doc.annotations,
                source_type: doc.source_type,
                source_url: doc.source_url,
                content: doc.content,
                metadata: doc.metadata,
                is_active: true
            });

            await base44.entities.DocumentSubmission.update(doc.id, {
                status: 'approved',
                reviewed_by: user.email,
                review_date: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pendingMasterDocs']);
            queryClient.invalidateQueries(['recentApprovals']);
            toast.success('Document approved and added to master list');
        }
    });

    const denyDocMutation = useMutation({
        mutationFn: async (doc) => {
            await base44.entities.DocumentSubmission.update(doc.id, {
                status: 'denied',
                reviewed_by: user.email,
                review_date: new Date().toISOString(),
                denial_reason: 'Does not meet master list criteria'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pendingMasterDocs']);
            toast.success('Document denied');
        }
    });

    if (user?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
                <Card className="max-w-md bg-white/10 backdrop-blur-md border-white/20">
                    <CardHeader>
                        <CardTitle className="text-white">Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-white/70">This page is only accessible to administrators.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Link to={createPageUrl('Home')}>
                        <Button variant="outline" size="icon" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <img 
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/1652e0384_oracle.jpg" 
                        alt="Fiber Oracle" 
                        className="w-12 h-12 rounded-xl object-cover shadow-lg"
                    />
                    <div>
                        <h1 className="text-3xl font-bold text-white">Admin Control Panel</h1>
                        <p className="text-white/70">Manage requests and approvals</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="bg-white/10 backdrop-blur-md border-white/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white text-sm">Pending Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-yellow-400">{pendingRequests.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/10 backdrop-blur-md border-white/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white text-sm">Master List Submissions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-400">{pendingDocuments.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/10 backdrop-blur-md border-white/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white text-sm">Recent Approvals</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-400">{recentApprovals.length}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6">
                    <Card className="bg-white/10 backdrop-blur-md border-white/20">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-yellow-400" />
                                Pending User Requests ({pendingRequests.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pendingRequests.length === 0 ? (
                                <p className="text-white/60 text-center py-8">No pending requests</p>
                            ) : (
                                <div className="space-y-3">
                                    {pendingRequests.map(request => (
                                        <div key={request.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-white mb-1">{request.subject}</h3>
                                                    <p className="text-sm text-white/70 mb-2">{request.message}</p>
                                                    <div className="flex items-center gap-2 text-xs text-white/50">
                                                        <User className="w-3 h-3" />
                                                        {request.requested_by}
                                                        <span>•</span>
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(request.created_date).toLocaleString()}
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setAdminNotes('');
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700"
                                                >
                                                    Resolve
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-md border-white/20">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-400" />
                                    Master List Submissions ({pendingDocuments.length})
                                </CardTitle>
                                <Link to={createPageUrl('DocumentReview')}>
                                    <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
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
                                    {pendingDocuments.map(doc => (
                                        <div key={doc.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-white mb-1">{doc.title}</h3>
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        <Badge className="bg-purple-100 text-purple-800">
                                                            {doc.category}
                                                        </Badge>
                                                        <Badge className="bg-yellow-100 text-yellow-800">
                                                            Master List Request
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-white/50 mb-3">
                                                        <User className="w-3 h-3" />
                                                        {doc.submitted_by}
                                                        <span>•</span>
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(doc.created_date).toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => approveDocMutation.mutate(doc)}
                                                        className="bg-green-600 hover:bg-green-700"
                                                        disabled={approveDocMutation.isPending}
                                                    >
                                                        <ThumbsUp className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => denyDocMutation.mutate(doc)}
                                                        className="border-red-400 text-red-400 hover:bg-red-500/20"
                                                        disabled={denyDocMutation.isPending}
                                                    >
                                                        <ThumbsDown className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-md border-white/20">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                                Recent Approvals
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {recentApprovals.length === 0 ? (
                                <p className="text-white/60 text-center py-8">No recent approvals</p>
                            ) : (
                                <div className="space-y-3">
                                    {recentApprovals.map(approval => (
                                        <div key={approval.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-white text-sm mb-1">{approval.title}</h4>
                                                    <div className="flex items-center gap-3 text-xs text-white/50">
                                                        <span className="flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            Requested: {approval.submitted_by}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Approved: {approval.reviewed_by}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(approval.review_date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <Badge className="bg-green-100 text-green-800">
                                                    Approved
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
                <DialogContent className="bg-slate-900 text-white border-white/20">
                    <DialogHeader>
                        <DialogTitle>Resolve Request</DialogTitle>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-white/70 mb-1">Subject:</p>
                                <p className="font-semibold">{selectedRequest.subject}</p>
                            </div>
                            <div>
                                <p className="text-sm text-white/70 mb-1">Message:</p>
                                <p>{selectedRequest.message}</p>
                            </div>
                            <div>
                                <p className="text-sm text-white/70 mb-2">Admin Notes (optional):</p>
                                <Textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add internal notes about resolution..."
                                    className="bg-white/10 border-white/20 text-white"
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => resolveRequestMutation.mutate({ 
                                requestId: selectedRequest.id, 
                                notes: adminNotes 
                            })}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Resolved
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}