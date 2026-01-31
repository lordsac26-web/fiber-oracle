import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CheckCircle, XCircle, Shield, AlertTriangle, FileText, Clock, Loader2, Tag, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function DocumentReview() {
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [showDenyDialog, setShowDenyDialog] = useState(false);
    const [denialReason, setDenialReason] = useState('');
    const [scanning, setScanning] = useState(null);
    const queryClient = useQueryClient();

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: submissions = [], isLoading } = useQuery({
        queryKey: ['documentSubmissions'],
        queryFn: () => base44.entities.DocumentSubmission.list('-created_date')
    });

    const scanMutation = useMutation({
        mutationFn: async (submissionId) => {
            const response = await base44.functions.invoke('scanDocumentSecurity', { submission_id: submissionId });
            return response.data;
        },
        onSuccess: (data, submissionId) => {
            queryClient.invalidateQueries(['documentSubmissions']);
            toast.success('Security scan completed');
            setScanning(null);
        },
        onError: (error) => {
            toast.error('Security scan failed: ' + error.message);
            setScanning(null);
        }
    });

    const approveMutation = useMutation({
        mutationFn: async (submission) => {
            // Create the reference document
            await base44.entities.ReferenceDocument.create({
                title: submission.title,
                category: submission.category || 'other',
                version: submission.version || '1.0',
                comments: submission.comments,
                annotations: submission.annotations,
                source_type: submission.source_type,
                source_url: submission.source_url,
                content: submission.content,
                metadata: submission.metadata,
                is_active: true
            });

            // Update submission status
            await base44.entities.DocumentSubmission.update(submission.id, {
                status: 'approved',
                reviewed_by: user.email,
                review_date: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['documentSubmissions']);
            toast.success('Document approved and added to knowledge base');
            setSelectedSubmission(null);
        },
        onError: (error) => {
            toast.error('Approval failed: ' + error.message);
        }
    });

    const denyMutation = useMutation({
        mutationFn: async ({ submissionId, reason }) => {
            await base44.entities.DocumentSubmission.update(submissionId, {
                status: 'denied',
                reviewed_by: user.email,
                review_date: new Date().toISOString(),
                denial_reason: reason
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['documentSubmissions']);
            toast.success('Document submission denied');
            setSelectedSubmission(null);
            setShowDenyDialog(false);
            setDenialReason('');
        },
        onError: (error) => {
            toast.error('Denial failed: ' + error.message);
        }
    });

    const handleScan = (submissionId) => {
        setScanning(submissionId);
        scanMutation.mutate(submissionId);
    };

    const handleApprove = (submission) => {
        if (submission.security_scan_status !== 'passed') {
            toast.error('Please run security scan first');
            return;
        }
        approveMutation.mutate(submission);
    };

    const handleDeny = () => {
        if (!denialReason.trim()) {
            toast.error('Please provide a reason for denial');
            return;
        }
        denyMutation.mutate({ submissionId: selectedSubmission.id, reason: denialReason });
    };

    const pendingSubmissions = submissions.filter(s => s.status === 'pending');
    const reviewedSubmissions = submissions.filter(s => s.status !== 'pending');

    const getStatusBadge = (status) => {
        const configs = {
            pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
            approved: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Approved' },
            denied: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Denied' }
        };
        const config = configs[status] || configs.pending;
        const Icon = config.icon;
        return (
            <Badge className={config.color}>
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
            </Badge>
        );
    };

    const getScanBadge = (scanStatus) => {
        const configs = {
            pending: { icon: Shield, color: 'bg-gray-100 text-gray-800', label: 'Not Scanned' },
            scanning: { icon: Loader2, color: 'bg-blue-100 text-blue-800', label: 'Scanning...', spin: true },
            passed: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Passed' },
            failed: { icon: AlertTriangle, color: 'bg-red-100 text-red-800', label: 'Failed' }
        };
        const config = configs[scanStatus] || configs.pending;
        const Icon = config.icon;
        return (
            <Badge className={config.color}>
                <Icon className={`w-3 h-3 mr-1 ${config.spin ? 'animate-spin' : ''}`} />
                {config.label}
            </Badge>
        );
    };

    if (user?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                        <CardDescription>This page is only accessible to administrators.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Link to={createPageUrl('PhotonChat')}>
                        <Button variant="outline" size="icon" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Document Review Center</h1>
                        <p className="text-white/70">Review and approve user-submitted documents</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="bg-white/10 backdrop-blur-md border-white/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white text-sm">Pending Review</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{pendingSubmissions.length}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/10 backdrop-blur-md border-white/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white text-sm">Approved</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-400">
                                {submissions.filter(s => s.status === 'approved').length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white/10 backdrop-blur-md border-white/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white text-sm">Denied</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-red-400">
                                {submissions.filter(s => s.status === 'denied').length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                ) : (
                    <>
                        <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6">
                            <CardHeader>
                                <CardTitle className="text-white">Pending Submissions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {pendingSubmissions.length === 0 ? (
                                    <p className="text-white/60 text-center py-8">No pending submissions</p>
                                ) : (
                                    <div className="space-y-3">
                                        {pendingSubmissions.map(submission => (
                                            <div key={submission.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <FileText className="w-4 h-4 text-white/70" />
                                                            <h3 className="font-semibold text-white">{submission.title}</h3>
                                                        </div>
                                                        <p className="text-sm text-white/60 mb-2">
                                                            Submitted by: {submission.submitted_by} • {new Date(submission.created_date).toLocaleDateString()}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            {getStatusBadge(submission.status)}
                                                            {getScanBadge(submission.security_scan_status)}
                                                            {submission.category && (
                                                                <Badge className="bg-purple-100 text-purple-800">
                                                                    <Tag className="w-3 h-3 mr-1" />
                                                                    {submission.category}
                                                                </Badge>
                                                            )}
                                                            {submission.version && (
                                                                <Badge variant="outline" className="border-white/30 text-white">
                                                                    v{submission.version}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {submission.comments && (
                                                            <div className="bg-black/20 rounded p-2 mb-2 text-sm text-white/80">
                                                                <MessageSquare className="w-3 h-3 inline mr-1" />
                                                                {submission.comments}
                                                            </div>
                                                        )}
                                                        {submission.annotations && submission.annotations.length > 0 && (
                                                            <div className="text-xs text-white/70 mb-2">
                                                                {submission.annotations.length} annotation(s) attached
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {submission.security_scan_result && (
                                                    <div className="bg-black/20 rounded p-3 mb-3 text-sm">
                                                        <p className="text-white/90 font-medium mb-2">Security Scan Results:</p>
                                                        {submission.security_scan_result.threats_found?.length > 0 && (
                                                            <div className="text-red-300 mb-2">
                                                                <p className="font-medium">Threats:</p>
                                                                <ul className="list-disc ml-5">
                                                                    {submission.security_scan_result.threats_found.map((t, i) => (
                                                                        <li key={i}>{t}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {submission.security_scan_result.warnings?.length > 0 && (
                                                            <div className="text-yellow-300 mb-2">
                                                                <p className="font-medium">Warnings:</p>
                                                                <ul className="list-disc ml-5">
                                                                    {submission.security_scan_result.warnings.map((w, i) => (
                                                                        <li key={i}>{w}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {submission.security_scan_result.llm_analysis && (
                                                            <div className="text-white/70">
                                                                <p>Risk Level: <span className="font-medium">{submission.security_scan_result.llm_analysis.risk_level}</span></p>
                                                                <p>{submission.security_scan_result.llm_analysis.recommendation}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleScan(submission.id)}
                                                        disabled={scanning === submission.id || submission.security_scan_status === 'scanning'}
                                                        className="border-white/30 bg-blue-500/20 text-white hover:bg-blue-500/30"
                                                    >
                                                        {scanning === submission.id ? (
                                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</>
                                                        ) : (
                                                            <><Shield className="w-4 h-4 mr-2" />Run Scan</>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleApprove(submission)}
                                                        disabled={submission.security_scan_status !== 'passed'}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedSubmission(submission);
                                                            setShowDenyDialog(true);
                                                        }}
                                                        className="border-red-300/30 bg-red-500/20 text-red-200 hover:bg-red-500/30"
                                                    >
                                                        <XCircle className="w-4 h-4 mr-2" />
                                                        Deny
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
                                <CardTitle className="text-white">Review History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {reviewedSubmissions.length === 0 ? (
                                    <p className="text-white/60 text-center py-8">No reviewed submissions</p>
                                ) : (
                                    <div className="space-y-3">
                                        {reviewedSubmissions.map(submission => (
                                            <div key={submission.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <FileText className="w-4 h-4 text-white/70" />
                                                            <h3 className="font-semibold text-white">{submission.title}</h3>
                                                        </div>
                                                        <p className="text-sm text-white/60 mb-2">
                                                            Submitted by: {submission.submitted_by} • Reviewed by: {submission.reviewed_by}
                                                        </p>
                                                        {submission.denial_reason && (
                                                            <p className="text-sm text-red-300">Reason: {submission.denial_reason}</p>
                                                        )}
                                                    </div>
                                                    {getStatusBadge(submission.status)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            <Dialog open={showDenyDialog} onOpenChange={setShowDenyDialog}>
                <DialogContent className="bg-slate-900 text-white border-white/20">
                    <DialogHeader>
                        <DialogTitle>Deny Document Submission</DialogTitle>
                        <DialogDescription className="text-white/70">
                            Please provide a reason for denying this document submission.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Reason for denial..."
                        value={denialReason}
                        onChange={(e) => setDenialReason(e.target.value)}
                        className="bg-white/10 border-white/20 text-white"
                        rows={4}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDenyDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleDeny} className="bg-red-600 hover:bg-red-700">
                            Deny Submission
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}