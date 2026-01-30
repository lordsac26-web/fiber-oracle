import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Upload, Globe, FileText, Trash2, Settings, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TechAssistant() {
    const [user, setUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [showAdminDialog, setShowAdminDialog] = useState(false);
    const [uploadType, setUploadType] = useState('pdf');
    const [documentTitle, setDocumentTitle] = useState('');
    const [documentUrl, setDocumentUrl] = useState('');
    const [pdfFile, setPdfFile] = useState(null);
    const messagesEndRef = useRef(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        base44.auth.me().then(setUser).catch(() => setUser(null));
    }, []);

    const { data: documents = [], isLoading: loadingDocs } = useQuery({
        queryKey: ['referenceDocuments'],
        queryFn: () => base44.entities.ReferenceDocument.list(),
        enabled: user?.role === 'admin'
    });

    const uploadMutation = useMutation({
        mutationFn: async ({ title, source_type, file_url }) => {
            const { data } = await base44.functions.invoke('uploadReferenceDocument', {
                title,
                source_type,
                file_url
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['referenceDocuments']);
            toast.success('Document uploaded successfully');
            setDocumentTitle('');
            setDocumentUrl('');
            setPdfFile(null);
            setShowAdminDialog(false);
        },
        onError: (error) => {
            toast.error('Failed to upload document: ' + error.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (docId) => base44.entities.ReferenceDocument.delete(docId),
        onSuccess: () => {
            queryClient.invalidateQueries(['referenceDocuments']);
            toast.success('Document deleted');
        }
    });

    const handleUploadDocument = async () => {
        if (!documentTitle) {
            toast.error('Please enter a title');
            return;
        }

        let fileUrl = documentUrl;

        if (uploadType === 'pdf' && pdfFile) {
            const formData = new FormData();
            formData.append('file', pdfFile);
            const { data } = await base44.integrations.Core.UploadFile({ file: pdfFile });
            fileUrl = data.file_url;
        }

        if (!fileUrl) {
            toast.error('Please provide a URL or file');
            return;
        }

        uploadMutation.mutate({
            title: documentTitle,
            source_type: uploadType,
            file_url: fileUrl
        });
    };

    const handleAskQuestion = async () => {
        if (!inputMessage.trim()) return;

        const userMessage = { role: 'user', content: inputMessage };
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsAsking(true);

        try {
            const { data } = await base44.functions.invoke('techAssistantChat', {
                question: inputMessage
            });

            const assistantMessage = {
                role: 'assistant',
                content: data.answer,
                references: data.references_used || []
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            toast.error('Failed to get response: ' + error.message);
        } finally {
            setIsAsking(false);
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                            <MessageSquare className="w-8 h-8" />
                            Technical Assistant
                        </h1>
                        <p className="text-slate-400 mt-1">AI-powered assistant with access to your technical documentation</p>
                    </div>
                    {user?.role === 'admin' && (
                        <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    <Settings className="w-4 h-4" />
                                    Manage Documents
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Manage Reference Documents</DialogTitle>
                                </DialogHeader>
                                <Tabs defaultValue="upload">
                                    <TabsList>
                                        <TabsTrigger value="upload">Upload New</TabsTrigger>
                                        <TabsTrigger value="manage">Manage Existing</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="upload" className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Document Type</label>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant={uploadType === 'pdf' ? 'default' : 'outline'}
                                                    onClick={() => setUploadType('pdf')}
                                                    className="gap-2"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    PDF
                                                </Button>
                                                <Button
                                                    variant={uploadType === 'website' ? 'default' : 'outline'}
                                                    onClick={() => setUploadType('website')}
                                                    className="gap-2"
                                                >
                                                    <Globe className="w-4 h-4" />
                                                    Website
                                                </Button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Title</label>
                                            <Input
                                                value={documentTitle}
                                                onChange={(e) => setDocumentTitle(e.target.value)}
                                                placeholder="Enter document title..."
                                            />
                                        </div>
                                        {uploadType === 'pdf' ? (
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Upload PDF</label>
                                                <Input
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={(e) => setPdfFile(e.target.files[0])}
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Website URL</label>
                                                <Input
                                                    value={documentUrl}
                                                    onChange={(e) => setDocumentUrl(e.target.value)}
                                                    placeholder="https://example.com/docs"
                                                />
                                            </div>
                                        )}
                                        <Button
                                            onClick={handleUploadDocument}
                                            disabled={uploadMutation.isPending}
                                            className="w-full gap-2"
                                        >
                                            {uploadMutation.isPending ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4" />
                                                    Upload Document
                                                </>
                                            )}
                                        </Button>
                                    </TabsContent>
                                    <TabsContent value="manage">
                                        {loadingDocs ? (
                                            <div className="text-center py-8">Loading documents...</div>
                                        ) : documents.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                No documents uploaded yet
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {documents.map(doc => (
                                                    <Card key={doc.id}>
                                                        <CardContent className="p-4 flex justify-between items-center">
                                                            <div>
                                                                <div className="font-medium">{doc.title}</div>
                                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                                    <Badge variant="outline">{doc.source_type}</Badge>
                                                                    {doc.metadata?.word_count && (
                                                                        <span>{doc.metadata.word_count.toLocaleString()} words</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => deleteMutation.mutate(doc.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4 text-red-500" />
                                                            </Button>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-6">
                        <div className="space-y-4 mb-4 h-[500px] overflow-y-auto">
                            {messages.length === 0 ? (
                                <div className="text-center py-20 text-slate-400">
                                    <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium">Ask me anything about the technical documentation</p>
                                    <p className="text-sm mt-2">I have access to all uploaded PDFs and website references</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-lg p-4 ${
                                                msg.role === 'user'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-slate-700 text-slate-100'
                                            }`}
                                        >
                                            <div className="whitespace-pre-wrap">{msg.content}</div>
                                            {msg.references && msg.references.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-slate-600">
                                                    <div className="text-xs text-slate-400 mb-1">References used:</div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {msg.references.map((ref, i) => (
                                                            <Badge key={i} variant="outline" className="text-xs">
                                                                {ref.title}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            {isAsking && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-700 rounded-lg p-4">
                                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="flex gap-2">
                            <Textarea
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAskQuestion();
                                    }
                                }}
                                placeholder="Ask a technical question..."
                                className="resize-none bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                                rows={2}
                            />
                            <Button
                                onClick={handleAskQuestion}
                                disabled={isAsking || !inputMessage.trim()}
                                className="gap-2"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}