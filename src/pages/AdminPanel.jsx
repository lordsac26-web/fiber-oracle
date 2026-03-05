import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, MessageSquare, FileText, CheckCircle, XCircle, Clock, AlertCircle, User, Calendar, ThumbsUp, ThumbsDown, Users, BarChart3, TrendingUp, Activity, UserCheck, UserX, Zap, Trash2, Search as SearchIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import moment from 'moment';
import DocumentUploadManager from '@/components/admin/DocumentUploadManager';
import SystemHealthMonitor from '@/components/admin/SystemHealthMonitor';
import AdvancedAuditFilter from '@/components/admin/AdvancedAuditFilter';
import ConversationFilter from '@/components/admin/ConversationFilter';
import AdminOnboardingTour from '@/components/admin/AdminOnboardingTour';

export default function AdminPanel() {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const queryClient = useQueryClient();

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: allUsers = [] } = useQuery({
        queryKey: ['allUsers'],
        queryFn: () => base44.entities.User.list(),
        enabled: user?.role === 'admin'
    });

    const { data: allAuditLogs = [] } = useQuery({
        queryKey: ['allAuditLogs'],
        queryFn: () => base44.entities.AuditLog.list('-created_date', 1000),
        enabled: user?.role === 'admin'
    });

    const { data: allDocSubmissions = [] } = useQuery({
        queryKey: ['allDocSubmissions'],
        queryFn: () => base44.entities.DocumentSubmission.list('-created_date', 500),
        enabled: user?.role === 'admin'
    });

    const { data: allReferenceDocs = [] } = useQuery({
        queryKey: ['allReferenceDocs'],
        queryFn: () => base44.entities.ReferenceDocument.list('-created_date', 500),
        enabled: user?.role === 'admin'
    });

    const { data: allConversations = [] } = useQuery({
        queryKey: ['allConversations'],
        queryFn: () => base44.agents.listConversations({ agent_name: 'photon' }),
        enabled: user?.role === 'admin'
    });

    const { data: documentAuditLogs = [] } = useQuery({
        queryKey: ['documentAuditLogs'],
        queryFn: async () => {
            const logs = await base44.entities.AuditLog.filter({ event_type: 'document_reference' }, '-created_date', 100);
            return logs;
        },
        enabled: user?.role === 'admin'
    });

    const [selectedDocs, setSelectedDocs] = useState(new Set());
    const [selectedConvos, setSelectedConvos] = useState(new Set());
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const [auditFilters, setAuditFilters] = useState({});
    const [convoFilters, setConvoFilters] = useState({});
    const [showTour, setShowTour] = useState(false);
    const [archiveDays, setArchiveDays] = useState(30);

    // Check user permissions
    const hasPermission = (permission) => {
        if (user?.role !== 'admin') return false;
        if (user?.admin_role === 'super_admin') return true;
        return user?.permissions?.[permission] || false;
    };

    // Filter audit logs based on active filters
    const filteredAuditLogs = React.useMemo(() => {
        let filtered = documentAuditLogs;
        
        if (auditFilters.searchTerm) {
            filtered = filtered.filter(log => 
                log.content?.toLowerCase().includes(auditFilters.searchTerm.toLowerCase()) ||
                log.user_email?.toLowerCase().includes(auditFilters.searchTerm.toLowerCase())
            );
        }
        
        if (auditFilters.eventType && auditFilters.eventType !== 'all') {
            filtered = filtered.filter(log => log.event_type === auditFilters.eventType);
        }
        
        if (auditFilters.status && auditFilters.status !== 'all') {
            filtered = filtered.filter(log => log.status === auditFilters.status);
        }
        
        if (auditFilters.userFilter) {
            filtered = filtered.filter(log => 
                log.user_email?.toLowerCase().includes(auditFilters.userFilter.toLowerCase())
            );
        }
        
        if (auditFilters.dateFrom) {
            filtered = filtered.filter(log => 
                moment(log.created_date).isSameOrAfter(moment(auditFilters.dateFrom))
            );
        }
        
        if (auditFilters.dateTo) {
            filtered = filtered.filter(log => 
                moment(log.created_date).isSameOrBefore(moment(auditFilters.dateTo))
            );
        }
        
        return filtered;
    }, [documentAuditLogs, auditFilters]);

    // Filter conversations based on active filters
    const filteredConversations = React.useMemo(() => {
        let filtered = allConversations;
        
        if (convoFilters.searchTerm) {
            filtered = filtered.filter(convo => 
                convo.metadata?.name?.toLowerCase().includes(convoFilters.searchTerm.toLowerCase())
            );
        }
        
        if (convoFilters.dateFrom) {
            filtered = filtered.filter(convo => 
                moment(convo.created_date).isSameOrAfter(moment(convoFilters.dateFrom))
            );
        }
        
        if (convoFilters.dateTo) {
            filtered = filtered.filter(convo => 
                moment(convo.created_date).isSameOrBefore(moment(convoFilters.dateTo))
            );
        }
        
        if (convoFilters.minMessages) {
            filtered = filtered.filter(convo => 
                (convo.messages?.length || 0) >= convoFilters.minMessages
            );
        }
        
        if (convoFilters.maxMessages) {
            filtered = filtered.filter(convo => 
                (convo.messages?.length || 0) <= convoFilters.maxMessages
            );
        }
        
        return filtered;
    }, [allConversations, convoFilters]);

    React.useEffect(() => {
        if (user && user.role === 'admin' && !user.admin_tour_completed) {
            setShowTour(true);
        }
    }, [user]);

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

    const CATEGORIES = ['installation', 'troubleshooting', 'maintenance', 'safety', 'specifications', 'training', 'other'];

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
            const newDoc = await base44.entities.ReferenceDocument.create({
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

            // Log audit event
            await base44.entities.AuditLog.create({
                event_type: 'document_reference',
                user_email: user.email,
                content: `Approved and added document: ${doc.title}`,
                metadata: {
                    action: 'approved',
                    document_id: newDoc.id,
                    document_title: doc.title,
                    category: doc.category,
                    is_active: true,
                    submission_id: doc.id
                },
                status: 'success'
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
            queryClient.invalidateQueries(['documentAuditLogs']);
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

    // Analytics calculations
    const analytics = useMemo(() => {
        const last7Days = moment().subtract(7, 'days');
        const last30Days = moment().subtract(30, 'days');

        // Document submission stats
        const totalSubmissions = allDocSubmissions.length;
        const approved = allDocSubmissions.filter(d => d.status === 'approved').length;
        const pending = allDocSubmissions.filter(d => d.status === 'pending').length;
        const denied = allDocSubmissions.filter(d => d.status === 'denied').length;
        
        // Review time calculation
        const reviewedDocs = allDocSubmissions.filter(d => d.review_date && d.created_date);
        const avgReviewTime = reviewedDocs.length > 0 
            ? reviewedDocs.reduce((sum, d) => {
                const reviewTime = moment(d.review_date).diff(moment(d.created_date), 'hours');
                return sum + reviewTime;
            }, 0) / reviewedDocs.length
            : 0;

        // AI usage stats
        const queries = allAuditLogs.filter(l => l.event_type === 'query');
        const responses = allAuditLogs.filter(l => l.event_type === 'response');
        const toolCalls = allAuditLogs.filter(l => l.event_type === 'tool_invocation');
        const errors = allAuditLogs.filter(l => l.status === 'error');
        
        const queriesLast7Days = queries.filter(q => moment(q.created_date).isAfter(last7Days)).length;
        const queriesLast30Days = queries.filter(q => moment(q.created_date).isAfter(last30Days)).length;

        // User activity
        const activeUsers = new Set(queries.filter(q => moment(q.created_date).isAfter(last7Days)).map(q => q.user_email)).size;

        // Submissions by category
        const submissionsByCategory = CATEGORIES.reduce((acc, cat) => {
            acc[cat] = allDocSubmissions.filter(d => d.category === cat).length;
            return acc;
        }, {});

        return {
            documents: {
                total: totalSubmissions,
                approved,
                pending,
                denied,
                approvalRate: totalSubmissions > 0 ? ((approved / totalSubmissions) * 100).toFixed(1) : 0,
                avgReviewTime: avgReviewTime.toFixed(1)
            },
            ai: {
                totalQueries: queries.length,
                totalResponses: responses.length,
                toolCalls: toolCalls.length,
                errors: errors.length,
                errorRate: queries.length > 0 ? ((errors.length / queries.length) * 100).toFixed(1) : 0,
                queriesLast7Days,
                queriesLast30Days,
                avgQueriesPerDay: (queriesLast30Days / 30).toFixed(1)
            },
            users: {
                total: allUsers.length,
                admins: allUsers.filter(u => u.role === 'admin').length,
                regular: allUsers.filter(u => u.role === 'user').length,
                activeUsers
            },
            submissionsByCategory
        };
    }, [allDocSubmissions, allAuditLogs, allUsers]);

    const handleBulkActivate = async () => {
        setIsBulkProcessing(true);
        try {
            const docIds = Array.from(selectedDocs);
            const docs = allReferenceDocs.filter(d => docIds.includes(d.id));
            
            await Promise.all(
                docIds.map(id => base44.entities.ReferenceDocument.update(id, { is_active: true }))
            );
            
            // Log audit event
            await base44.entities.AuditLog.create({
                event_type: 'document_reference',
                user_email: user.email,
                content: `Bulk activated ${docIds.length} documents`,
                metadata: {
                    action: 'bulk_activate',
                    document_ids: docIds,
                    document_titles: docs.map(d => d.title),
                    count: docIds.length
                },
                status: 'success'
            });
            
            toast.success(`Activated ${docIds.length} documents`);
            setSelectedDocs(new Set());
            queryClient.invalidateQueries(['allReferenceDocs']);
            queryClient.invalidateQueries(['documentAuditLogs']);
        } catch (error) {
            toast.error('Failed to activate documents');
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const handleBulkDeactivate = async () => {
        setIsBulkProcessing(true);
        try {
            const docIds = Array.from(selectedDocs);
            const docs = allReferenceDocs.filter(d => docIds.includes(d.id));
            
            await Promise.all(
                docIds.map(id => base44.entities.ReferenceDocument.update(id, { is_active: false }))
            );
            
            // Log audit event
            await base44.entities.AuditLog.create({
                event_type: 'document_reference',
                user_email: user.email,
                content: `Bulk deactivated ${docIds.length} documents`,
                metadata: {
                    action: 'bulk_deactivate',
                    document_ids: docIds,
                    document_titles: docs.map(d => d.title),
                    count: docIds.length
                },
                status: 'success'
            });
            
            toast.success(`Deactivated ${docIds.length} documents`);
            setSelectedDocs(new Set());
            queryClient.invalidateQueries(['allReferenceDocs']);
            queryClient.invalidateQueries(['documentAuditLogs']);
        } catch (error) {
            toast.error('Failed to deactivate documents');
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkProcessing(true);
        try {
            const docIds = Array.from(selectedDocs);
            const docs = allReferenceDocs.filter(d => docIds.includes(d.id));
            
            await Promise.all(
                docIds.map(id => base44.entities.ReferenceDocument.delete(id))
            );
            
            // Log audit event
            await base44.entities.AuditLog.create({
                event_type: 'document_reference',
                user_email: user.email,
                content: `Bulk deleted ${docIds.length} documents`,
                metadata: {
                    action: 'bulk_delete',
                    document_ids: docIds,
                    document_titles: docs.map(d => d.title),
                    count: docIds.length
                },
                status: 'success'
            });
            
            toast.success(`Deleted ${docIds.length} documents`);
            setSelectedDocs(new Set());
            queryClient.invalidateQueries(['allReferenceDocs']);
            queryClient.invalidateQueries(['documentAuditLogs']);
        } catch (error) {
            toast.error('Failed to delete documents');
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const toggleDocSelection = (docId) => {
        const newSelected = new Set(selectedDocs);
        if (newSelected.has(docId)) {
            newSelected.delete(docId);
        } else {
            newSelected.add(docId);
        }
        setSelectedDocs(newSelected);
    };

    const toggleConvoSelection = (convoId) => {
        const newSelected = new Set(selectedConvos);
        if (newSelected.has(convoId)) {
            newSelected.delete(convoId);
        } else {
            newSelected.add(convoId);
        }
        setSelectedConvos(newSelected);
    };

    const handleBulkArchiveConversations = async () => {
        setIsBulkProcessing(true);
        try {
            const convoIds = Array.from(selectedConvos);
            
            const response = await base44.functions.invoke('archiveConversations', {
                conversation_ids: convoIds,
                days: archiveDays
            });
            
            if (response.data.success) {
                const archived = response.data.results.archived;
                const failed = response.data.results.failed;
                
                if (failed > 0) {
                    toast.error(`Archived ${archived}, but ${failed} failed`);
                } else {
                    toast.success(`Archived ${archived} conversation${archived !== 1 ? 's' : ''} (will delete in ${archiveDays} days)`);
                }
                
                setSelectedConvos(new Set());
                queryClient.invalidateQueries(['allConversations']);
            } else {
                toast.error(`Error: ${response.data.error}`);
            }
        } catch (error) {
            toast.error(`Failed to archive conversations: ${error.message}`);
        } finally {
            setIsBulkProcessing(false);
        }
    };

    if (user?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
                <Card className="max-w-md bg-slate-800/50 border-slate-700">
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
        <div className="min-h-screen p-6" style={{ background: '#07071a' }}>
            {showTour && (
                <AdminOnboardingTour 
                    onComplete={() => setShowTour(false)}
                    onSkip={() => setShowTour(false)}
                />
            )}
            
            <div className="max-w-7xl mx-auto">
                {/* Header — matches Home page style */}
                <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="outline" size="icon" className="border-white/20 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <img 
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/66efc74e1_fiberoraclenew.png" 
                            alt="Fiber Oracle" 
                            className="w-12 h-12 rounded-xl object-cover shadow-[0_0_14px_rgba(0,240,255,0.25)]"
                        />
                        <div>
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
                                Admin Control Panel
                            </h1>
                            <p className="text-slate-400 text-sm">Fiber Oracle · System Management</p>
                        </div>
                    </div>
                    
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTour(true)}
                        className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Tour
                    </Button>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="bg-white/5 border border-white/10 mb-6 p-1">
                        <TabsTrigger value="overview" className="text-slate-400 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-400/50" data-tour="overview-tab">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="users" className="text-slate-400 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-400/50" data-tour="users-tab">
                            <Users className="w-4 h-4 mr-2" />
                            Documents & Users
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="text-slate-400 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-400/50" data-tour="analytics-tab">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Analytics
                        </TabsTrigger>
                        <TabsTrigger value="health" className="text-slate-400 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-400/50" data-tour="health-tab">
                            <Activity className="w-4 h-4 mr-2" />
                            System Health
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
                                <CardHeader className="pb-2 pt-4 px-4">
                                    <CardTitle className="text-slate-400 text-xs uppercase tracking-widest">Pending Requests</CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pb-4">
                                    <div className="text-3xl font-bold text-yellow-400">{pendingRequests.length}</div>
                                    <p className="text-xs text-slate-500 mt-1">Awaiting action</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
                                <CardHeader className="pb-2 pt-4 px-4">
                                    <CardTitle className="text-slate-400 text-xs uppercase tracking-widest">Knowledge Base</CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pb-4">
                                    <div className="text-3xl font-bold text-cyan-400">{allReferenceDocs.length}</div>
                                    <p className="text-xs text-slate-500 mt-1">{allReferenceDocs.filter(d => d.is_active).length} active docs</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
                                <CardHeader className="pb-2 pt-4 px-4">
                                    <CardTitle className="text-slate-400 text-xs uppercase tracking-widest">Total Users</CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pb-4">
                                    <div className="text-3xl font-bold text-purple-400">{allUsers.length}</div>
                                    <p className="text-xs text-slate-500 mt-1">{allUsers.filter(u => u.role === 'admin').length} admins</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
                                <CardHeader className="pb-2 pt-4 px-4">
                                    <CardTitle className="text-slate-400 text-xs uppercase tracking-widest">AI Sessions</CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pb-4">
                                    <div className="text-3xl font-bold text-blue-400">{allConversations.length}</div>
                                    <p className="text-xs text-slate-500 mt-1">{analytics.ai.totalQueries} queries</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-6">
                            <Card className="bg-white/5 border border-white/10 backdrop-blur-sm">
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

                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-400" />
                                    Master List Submissions ({pendingDocuments.length})
                                </CardTitle>
                                <Link to={createPageUrl('DocumentReview')}>
                                    <Button size="sm" variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
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

                    <Card className="bg-slate-800/50 border-slate-700">
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
                    </TabsContent>

                    {/* Users Tab */}
                    <TabsContent value="users" className="space-y-6">
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <FileText className="w-5 h-5" />
                                        Document Management ({allReferenceDocs.length})
                                    </CardTitle>
                                    <div className="flex gap-2 flex-wrap">
                                        {selectedDocs.size > 0 && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleBulkActivate}
                                                    disabled={isBulkProcessing}
                                                    className="border-green-400 text-green-400 hover:bg-green-500/20"
                                                >
                                                    <UserCheck className="w-3 h-3 mr-1" />
                                                    Activate ({selectedDocs.size})
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleBulkDeactivate}
                                                    disabled={isBulkProcessing}
                                                    className="border-yellow-400 text-yellow-400 hover:bg-yellow-500/20"
                                                >
                                                    <UserX className="w-3 h-3 mr-1" />
                                                    Deactivate ({selectedDocs.size})
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleBulkDelete}
                                                    disabled={isBulkProcessing}
                                                    className="border-red-400 text-red-400 hover:bg-red-500/20"
                                                >
                                                    <Trash2 className="w-3 h-3 mr-1" />
                                                    Delete ({selectedDocs.size})
                                                </Button>
                                            </>
                                        )}
                                        <DocumentUploadManager />
                                        <Link to={createPageUrl('DocumentSearch')}>
                                            <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                                                <SearchIcon className="w-3 h-3 mr-1" />
                                                Search
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-3 text-sm text-white/70">
                                    {allReferenceDocs.filter(d => d.is_active).length} active • {allReferenceDocs.filter(d => !d.is_active).length} inactive
                                </div>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {allReferenceDocs.length === 0 ? (
                                        <p className="text-white/60 text-center py-8">No documents in knowledge base</p>
                                    ) : allReferenceDocs.map(doc => (
                                        <div
                                            key={doc.id}
                                            onClick={() => toggleDocSelection(doc.id)}
                                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                                                selectedDocs.has(doc.id)
                                                    ? 'bg-blue-500/30 border border-blue-400'
                                                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-white text-sm truncate">{doc.title}</h4>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <Badge className="text-xs bg-purple-500">{doc.category}</Badge>
                                                    <Badge className={`text-xs ${doc.is_active ? 'bg-green-500' : 'bg-gray-500'}`}>
                                                        {doc.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                    {doc.version && (
                                                        <Badge variant="outline" className="text-xs border-white/30 text-white/70">
                                                            v{doc.version}
                                                        </Badge>
                                                    )}
                                                    <span className="text-xs text-white/50">
                                                        {moment(doc.created_date).fromNow()}
                                                    </span>
                                                </div>
                                            </div>
                                            <Checkbox
                                                checked={selectedDocs.has(doc.id)}
                                                onCheckedChange={() => toggleDocSelection(doc.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        
                        {/* Document Audit Trail */}
                         <Card className="bg-slate-800/50 border-slate-700" data-tour="audit-section">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Activity className="w-5 h-5" />
                                        Document Management Audit Trail
                                    </CardTitle>
                                    <Badge className="bg-blue-500 text-white">
                                        {filteredAuditLogs.length} / {documentAuditLogs.length} events
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <AdvancedAuditFilter 
                                    onFilterChange={setAuditFilters} 
                                    totalCount={filteredAuditLogs.length}
                                />
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {filteredAuditLogs.length === 0 ? (
                                        <p className="text-white/60 text-center py-8">No matching audit logs</p>
                                    ) : filteredAuditLogs.map(log => {
                                        const action = log.metadata?.action || 'unknown';
                                        const actionColors = {
                                            approved: 'bg-green-500',
                                            bulk_activate: 'bg-emerald-500',
                                            bulk_deactivate: 'bg-amber-500',
                                            bulk_delete: 'bg-red-500',
                                            added: 'bg-blue-500',
                                            modified: 'bg-cyan-500',
                                            deleted: 'bg-red-500'
                                        };
                                        
                                        const actionIcons = {
                                            approved: CheckCircle,
                                            bulk_activate: CheckCircle,
                                            bulk_deactivate: XCircle,
                                            bulk_delete: Trash2,
                                            added: FileText,
                                            modified: FileText,
                                            deleted: Trash2
                                        };
                                        
                                        const Icon = actionIcons[action] || FileText;
                                        
                                        return (
                                            <div
                                                key={log.id}
                                                className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                                            >
                                                <div className={`p-2 rounded-lg ${actionColors[action] || 'bg-gray-500'}`}>
                                                    <Icon className="w-4 h-4 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-medium">
                                                        {log.content}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
                                                        <span className="flex items-center gap-1">
                                                            <User className="w-3 h-3" />
                                                            {log.user_email}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {moment(log.created_date).format('MMM D, h:mm A')}
                                                        </span>
                                                    </div>
                                                    {log.metadata?.document_title && (
                                                        <Badge className="mt-2 text-xs bg-purple-500/30 text-purple-200 border-purple-400/50">
                                                            {log.metadata.document_title}
                                                        </Badge>
                                                    )}
                                                    {log.metadata?.count && (
                                                        <Badge className="mt-2 ml-2 text-xs bg-blue-500/30 text-blue-200 border-blue-400/50">
                                                            {log.metadata.count} docs
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Conversation Management */}
                         <Card className="bg-slate-800/50 border-slate-700" data-tour="conversations-section">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5" />
                                        P.H.O.T.O.N. Conversations ({filteredConversations.length} / {allConversations.length})
                                    </CardTitle>
                                    {selectedConvos.size > 0 && (
                                        <div className="flex gap-2 items-center">
                                            <div className="flex gap-2">
                                                <select
                                                    value={archiveDays}
                                                    onChange={(e) => setArchiveDays(Number(e.target.value))}
                                                    className="bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-sm"
                                                    disabled={isBulkProcessing}
                                                >
                                                    <option value={7}>7 days</option>
                                                    <option value={15}>15 days</option>
                                                    <option value={30}>30 days</option>
                                                </select>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleBulkArchiveConversations}
                                                    disabled={isBulkProcessing}
                                                    className="border-yellow-400 text-yellow-400 hover:bg-yellow-500/20"
                                                >
                                                    <Trash2 className="w-3 h-3 mr-1" />
                                                    Archive ({selectedConvos.size})
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <ConversationFilter 
                                    onFilterChange={setConvoFilters}
                                    totalCount={filteredConversations.length}
                                />
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {filteredConversations.length === 0 ? (
                                        <p className="text-white/60 text-center py-8">No matching conversations</p>
                                    ) : filteredConversations.map(convo => (
                                        <div
                                            key={convo.id}
                                            onClick={() => toggleConvoSelection(convo.id)}
                                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                                                selectedConvos.has(convo.id)
                                                    ? 'bg-blue-500/30 border border-blue-400'
                                                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-white text-sm truncate">
                                                    {convo.metadata?.name || 'Untitled Session'}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <Badge className="text-xs bg-cyan-500">
                                                        {convo.messages?.length || 0} messages
                                                    </Badge>
                                                    <span className="text-xs text-white/50">
                                                        {moment(convo.created_date).fromNow()}
                                                    </span>
                                                    <span className="text-xs text-white/40">
                                                        {moment(convo.created_date).format('MMM D, YYYY')}
                                                    </span>
                                                </div>
                                            </div>
                                            <Checkbox
                                                checked={selectedConvos.has(convo.id)}
                                                onCheckedChange={() => toggleConvoSelection(convo.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            </div>
                                            ))}
                                            </div>
                                            </CardContent>
                                            </Card>

                        {/* User Stats Cards Below */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-white text-sm">Total Users</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-blue-400">{analytics.users.total}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-white text-sm">Admins</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-purple-400">{analytics.users.admins}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-white text-sm">Active (7d)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-green-400">{analytics.users.activeUsers}</div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    User Management ({allUsers.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {allUsers.map(u => (
                                        <div key={u.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-medium text-white">{u.full_name || u.email}</h4>
                                                        <Badge className={u.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'}>
                                                            {u.role}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-white/60">{u.email}</p>
                                                    <p className="text-xs text-white/40 mt-1">
                                                        Joined {moment(u.created_date).format('MMM D, YYYY')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Analytics Tab */}
                    <TabsContent value="analytics" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-white text-xs">Total Queries</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-cyan-400">{analytics.ai.totalQueries}</div>
                                    <p className="text-xs text-white/60 mt-1">{analytics.ai.avgQueriesPerDay} per day</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/10 backdrop-blur-md border-white/20">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-white text-xs">Queries (7d)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-blue-400">{analytics.ai.queriesLast7Days}</div>
                                    <p className="text-xs text-white/60 mt-1">Last week</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/10 backdrop-blur-md border-white/20">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-white text-xs">Tool Invocations</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-purple-400">{analytics.ai.toolCalls}</div>
                                    <p className="text-xs text-white/60 mt-1">AI actions</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/10 backdrop-blur-md border-white/20">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-white text-xs">Error Rate</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-red-400">{analytics.ai.errorRate}%</div>
                                    <p className="text-xs text-white/60 mt-1">{analytics.ai.errors} errors</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <FileText className="w-5 h-5" />
                                        Document Statistics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                        <span className="text-white/70">Total Submissions</span>
                                        <span className="text-white font-semibold">{analytics.documents.total}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                        <span className="text-white/70">Approved</span>
                                        <Badge className="bg-green-500">{analytics.documents.approved}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                        <span className="text-white/70">Pending</span>
                                        <Badge className="bg-yellow-500">{analytics.documents.pending}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                        <span className="text-white/70">Denied</span>
                                        <Badge className="bg-red-500">{analytics.documents.denied}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                        <span className="text-white/70">Approval Rate</span>
                                        <span className="text-green-400 font-semibold">{analytics.documents.approvalRate}%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/70">Avg Review Time</span>
                                        <span className="text-blue-400 font-semibold">{analytics.documents.avgReviewTime}h</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-800/50 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5" />
                                        Submissions by Category
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {CATEGORIES.map(cat => (
                                        <div key={cat} className="flex justify-between items-center pb-2 border-b border-white/10">
                                            <span className="text-white/70 capitalize">{cat}</span>
                                            <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                                                {analytics.submissionsByCategory[cat] || 0}
                                            </Badge>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Activity className="w-5 h-5" />
                                    System Health
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="bg-white/5 rounded-lg p-4 text-center">
                                        <Zap className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
                                        <div className="text-2xl font-bold text-white">{analytics.ai.totalResponses}</div>
                                        <div className="text-xs text-white/60">AI Responses</div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4 text-center">
                                        <UserCheck className="w-8 h-8 mx-auto mb-2 text-green-400" />
                                        <div className="text-2xl font-bold text-white">{analytics.users.activeUsers}</div>
                                        <div className="text-xs text-white/60">Active Users (7d)</div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-4 text-center">
                                        <FileText className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                                        <div className="text-2xl font-bold text-white">{analytics.documents.total}</div>
                                        <div className="text-xs text-white/60">Total Documents</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* System Health Tab */}
                    <TabsContent value="health" className="space-y-6">
                        <SystemHealthMonitor />
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
                <DialogContent className="bg-slate-800/50 border-slate-700">
                    <DialogHeader>
                        <DialogTitle>Resolve Request</DialogTitle>
                        <DialogDescription className="sr-only">
                          Complete the resolution of this admin request
                        </DialogDescription>
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