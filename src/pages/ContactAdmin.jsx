import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, MessageSquare, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ContactAdmin() {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const queryClient = useQueryClient();

    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: () => base44.auth.me()
    });

    const { data: myRequests = [], isLoading } = useQuery({
        queryKey: ['myAdminRequests'],
        queryFn: () => base44.entities.AdminRequest.filter({ requested_by: user?.email }, '-created_date')
    });

    const sendRequestMutation = useMutation({
        mutationFn: async (requestData) => {
            const request = await base44.entities.AdminRequest.create(requestData);
            // Send email notification to admins
            await base44.integrations.Core.SendEmail({
                to: 'admin@fiberoracle.com',
                subject: `New Admin Request: ${requestData.subject}`,
                body: `
New request from ${user.full_name} (${user.email}):

Subject: ${requestData.subject}
Message: ${requestData.message}

View in admin panel: ${window.location.origin}${createPageUrl('AdminPanel')}
                `
            });
            return request;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['myAdminRequests']);
            toast.success('Request sent to admin');
            setSubject('');
            setMessage('');
            setSending(false);
        },
        onError: () => {
            toast.error('Failed to send request');
            setSending(false);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) {
            toast.error('Please fill in all fields');
            return;
        }
        setSending(true);
        sendRequestMutation.mutate({
            request_type: 'contact',
            subject: subject.trim(),
            message: message.trim(),
            requested_by: user.email,
            status: 'pending',
            priority: 'medium'
        });
    };

    const getStatusBadge = (status) => {
        const configs = {
            pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
            in_progress: { icon: Loader2, color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
            resolved: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Resolved' },
            closed: { icon: CheckCircle, color: 'bg-gray-100 text-gray-800', label: 'Closed' }
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Link to={createPageUrl('Home')}>
                        <Button variant="outline" size="icon" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Contact Admin</h1>
                        <p className="text-white/70">Send a message to administrators</p>
                    </div>
                </div>

                <div className="grid gap-6">
                    <Card className="bg-white/10 backdrop-blur-md border-white/20">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Send className="w-5 h-5" />
                                New Request
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Input
                                        placeholder="Subject"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                    />
                                </div>
                                <div>
                                    <Textarea
                                        placeholder="Describe your request or question..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        rows={6}
                                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={sending}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    {sending ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                                    ) : (
                                        <><Send className="w-4 h-4 mr-2" />Send Request</>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-md border-white/20">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" />
                                Your Requests
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                                </div>
                            ) : myRequests.length === 0 ? (
                                <p className="text-white/60 text-center py-8">No requests yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {myRequests.map(request => (
                                        <div key={request.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-white mb-1">{request.subject}</h3>
                                                    <p className="text-sm text-white/70 line-clamp-2">{request.message}</p>
                                                </div>
                                                {getStatusBadge(request.status)}
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-white/50 mt-3">
                                                <span>{new Date(request.created_date).toLocaleString()}</span>
                                                {request.resolved_date && (
                                                    <span>• Resolved {new Date(request.resolved_date).toLocaleDateString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}