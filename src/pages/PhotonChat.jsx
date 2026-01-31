import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Send, 
  Upload, 
  FileText, 
  Loader2,
  Zap,
  CheckCircle2,
  Database,
  Globe,
  MessageSquare,
  Plus,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';

export default function PhotonChat() {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch reference documents
  const { data: referenceDocs = [], isLoading: docsLoading } = useQuery({
    queryKey: ['referenceDocs'],
    queryFn: () => base44.entities.ReferenceDocument.filter({ is_active: true }),
  });

  // Fetch conversations
  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ['photonConversations'],
    queryFn: () => base44.agents.listConversations({ agent_name: 'photon' }),
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
    });

    return unsubscribe;
  }, [conversationId]);

  // Create new conversation
  const createConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'photon',
        metadata: {
          name: `P.H.O.T.O.N. Session - ${new Date().toLocaleString()}`,
          description: 'Technical support session',
        }
      });
      setConversationId(conv.id);
      setMessages(conv.messages || []);
      queryClient.invalidateQueries({ queryKey: ['photonConversations'] });
      toast.success('New conversation started');
    } catch (error) {
      console.error('Create conversation error:', error);
      toast.error('Failed to start conversation');
    }
  };

  // Load existing conversation
  const loadConversation = async (convId) => {
    try {
      const conv = await base44.agents.getConversation(convId);
      setConversationId(conv.id);
      setMessages(conv.messages || []);
      toast.success('Conversation loaded');
    } catch (error) {
      console.error('Load conversation error:', error);
      toast.error('Failed to load conversation');
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || !conversationId) return;

    setIsSending(true);
    try {
      const conv = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: inputMessage
      });
      setInputMessage('');
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Upload PDF
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    setUploadingPdf(true);
    toast.loading('Uploading and processing PDF...', { id: 'pdf-upload' });

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Extract content from PDF
      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "object",
          properties: {
            full_text: { type: "string" },
            sections: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (extraction.status === 'success' && extraction.output) {
        // Save to ReferenceDocument
        await base44.entities.ReferenceDocument.create({
          title: file.name.replace('.pdf', ''),
          source_type: 'pdf',
          source_url: file_url,
          content: extraction.output.full_text || JSON.stringify(extraction.output),
          metadata: {
            page_count: extraction.output.sections?.length || 0,
            upload_date: new Date().toISOString(),
          },
          is_active: true
        });

        queryClient.invalidateQueries({ queryKey: ['referenceDocs'] });
        toast.success('PDF uploaded and indexed successfully', { id: 'pdf-upload' });
        setShowUploadDialog(false);
      } else {
        toast.error('Failed to extract PDF content', { id: 'pdf-upload' });
      }
    } catch (error) {
      console.error('PDF upload error:', error);
      toast.error('Failed to upload PDF', { id: 'pdf-upload' });
    } finally {
      setUploadingPdf(false);
    }
  };

  // Delete reference doc
  const deleteReferenceMutation = useMutation({
    mutationFn: (docId) => base44.entities.ReferenceDocument.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referenceDocs'] });
      toast.success('Reference document deleted');
    },
    onError: () => {
      toast.error('Failed to delete document');
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-slate-800">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">P.H.O.T.O.N.</h1>
                  <p className="text-xs text-slate-400">Pdf Hosted Optical Testing Operational Nexus</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-slate-600 text-white hover:bg-slate-800">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload PDF
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Upload Technical Reference Document
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Upload technical manuals, installation guides, troubleshooting documents, or any PDF reference material. 
                        P.H.O.T.O.N. will index and use this content to answer your questions.
                      </p>
                    </div>

                    <label className="block">
                      <div className="border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer border-gray-300 hover:border-blue-400 hover:bg-blue-50/50">
                        <div className="flex flex-col items-center gap-3">
                          <Upload className="h-10 w-10 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Click to upload or drag and drop
                          </span>
                          <span className="text-xs text-gray-400">PDF files only</span>
                        </div>
                      </div>
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={handlePdfUpload}
                        disabled={uploadingPdf}
                        className="hidden"
                      />
                    </label>

                    {uploadingPdf && (
                      <div className="flex items-center justify-center gap-2 py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        <span className="text-sm text-gray-600">Processing PDF...</span>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Current Knowledge Base ({referenceDocs.length})
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {referenceDocs.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">{doc.title}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteReferenceMutation.mutate(doc.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={createConversation}
                className="border-slate-600 text-white hover:bg-slate-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-4 gap-4 h-[calc(100vh-140px)]">
          {/* Sidebar - Conversations */}
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 overflow-y-auto h-[calc(100%-80px)]">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left p-2 rounded transition-colors ${
                    conversationId === conv.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <div className="text-sm font-medium truncate">
                    {conv.metadata?.name || 'Chat Session'}
                  </div>
                  <div className="text-xs opacity-70">
                    {new Date(conv.created_date).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-3 border-slate-700 bg-slate-800/50 flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-cyan-400" />
                  {conversationId ? 'Active Session' : 'Start a New Conversation'}
                </CardTitle>
                <Badge variant="outline" className="border-slate-600 text-slate-300">
                  <Database className="h-3 w-3 mr-1" />
                  {referenceDocs.length} PDFs loaded
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto space-y-4 py-4">
              {!conversationId ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
                    <Zap className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white mb-2">
                      Welcome to P.H.O.T.O.N.
                    </h2>
                    <p className="text-slate-400 max-w-md">
                      Your expert technical diagnostic and installation agent. Start a new conversation 
                      to troubleshoot, diagnose, or get installation guidance for fiber optic systems.
                    </p>
                  </div>
                  <Button onClick={createConversation} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Start New Session
                  </Button>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-100'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                            {msg.content}
                          </ReactMarkdown>
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}
                        
                        {msg.tool_calls?.map((tool, i) => (
                          <div key={i} className="mt-2 text-xs opacity-75 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {tool.name}...
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </CardContent>

            {conversationId && (
              <div className="border-t border-slate-700 p-4">
                <form onSubmit={sendMessage} className="flex gap-2">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask P.H.O.T.O.N. about troubleshooting, installation, diagnostics..."
                    className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button 
                    type="submit" 
                    disabled={isSending || !inputMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}