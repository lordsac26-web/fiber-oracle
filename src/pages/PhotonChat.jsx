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
  Trash2,
  FileCheck,
  Link as LinkIcon
} from 'lucide-react';
import MultiFileUpload from '@/components/photon/MultiFileUpload';
import GoogleDrivePicker from '@/components/photon/GoogleDrivePicker';
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
  const [uploadMode, setUploadMode] = useState('local'); // 'local' or 'drive'
  const messagesEndRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user for audit logging
  useEffect(() => {
    base44.auth.me().then(user => setCurrentUser(user)).catch(() => {});
  }, []);

  // Audit logging helper
  const logAuditEvent = async (eventType, content, metadata = {}, status = 'success', errorMessage = null) => {
    if (!currentUser) return;
    
    try {
      await base44.entities.AuditLog.create({
        event_type: eventType,
        user_email: currentUser.email,
        conversation_id: conversationId || null,
        content: content || '',
        metadata,
        status,
        error_message: errorMessage
      });
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  };

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
      
      // Log tool invocations and responses
      const latestMessage = data.messages?.[data.messages.length - 1];
      if (latestMessage?.role === 'assistant' && latestMessage.content) {
        logAuditEvent('response', latestMessage.content, {
          message_id: latestMessage.id,
          has_tool_calls: !!latestMessage.tool_calls?.length
        });
      }
      
      if (latestMessage?.tool_calls) {
        latestMessage.tool_calls.forEach(tool => {
          logAuditEvent('tool_invocation', tool.name, {
            tool_name: tool.name,
            arguments: tool.arguments_string,
            status: tool.status,
            results: tool.results
          });
        });
      }
    });

    return unsubscribe;
  }, [conversationId, currentUser]);

  // Create new conversation
  const createConversation = async () => {
    const startTime = Date.now();
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
      
      await logAuditEvent('conversation_start', 'New conversation created', {
        conversation_id: conv.id,
        duration_ms: Date.now() - startTime
      });
    } catch (error) {
      console.error('Create conversation error:', error);
      toast.error('Failed to start conversation');
      await logAuditEvent('conversation_start', 'Failed to create conversation', {
        duration_ms: Date.now() - startTime
      }, 'error', error.message);
    }
  };

  // Load existing conversation
  const loadConversation = async (convId) => {
    const startTime = Date.now();
    try {
      const conv = await base44.agents.getConversation(convId);
      setConversationId(conv.id);
      setMessages(conv.messages || []);
      toast.success('Conversation loaded');
      
      await logAuditEvent('conversation_load', 'Loaded existing conversation', {
        conversation_id: convId,
        message_count: conv.messages?.length || 0,
        duration_ms: Date.now() - startTime
      });
    } catch (error) {
      console.error('Load conversation error:', error);
      toast.error('Failed to load conversation');
      await logAuditEvent('conversation_load', 'Failed to load conversation', {
        conversation_id: convId,
        duration_ms: Date.now() - startTime
      }, 'error', error.message);
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || !conversationId) return;

    const messageContent = inputMessage.trim();
    const startTime = Date.now();
    setIsSending(true);
    
    try {
      // Log the user query
      await logAuditEvent('query', messageContent, {
        message_length: messageContent.length,
        active_documents: referenceDocs.length
      });
      
      const conv = await base44.agents.getConversation(conversationId);
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: messageContent
      });
      
      setInputMessage('');
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
      await logAuditEvent('query', messageContent, {
        duration_ms: Date.now() - startTime
      }, 'error', error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleUploadComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['referenceDocs'] });
  };

  // Delete reference doc
  const deleteReferenceMutation = useMutation({
    mutationFn: async (doc) => {
      await logAuditEvent('document_reference', `Deleted document: ${doc.title}`, {
        document_id: doc.id,
        document_title: doc.title,
        action: 'delete'
      });
      return base44.entities.ReferenceDocument.delete(doc.id);
    },
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
                  <p className="text-xs text-slate-300">Pdf Hosted Optical Testing Operational Nexus</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to={createPageUrl('PhotonAuditLogs')}>
                <Button variant="outline" size="sm" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/50">
                  <FileCheck className="h-4 w-4 mr-2" />
                  Audit Logs
                </Button>
              </Link>
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/50">
                    <Upload className="h-4 w-4 mr-2" />
                    Add Documents
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Add Reference Documents
                    </DialogTitle>
                  </DialogHeader>
                  
                  {/* Upload mode tabs */}
                  <div className="flex gap-2 border-b pb-3">
                    <Button
                      variant={uploadMode === 'local' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setUploadMode('local')}
                      className={uploadMode === 'local' ? 'bg-blue-600 text-white' : ''}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </Button>
                    <Button
                      variant={uploadMode === 'drive' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setUploadMode('drive')}
                      className={uploadMode === 'drive' ? 'bg-blue-600 text-white' : ''}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Link Google Drive
                    </Button>
                  </div>

                  {uploadMode === 'local' ? (
                    <MultiFileUpload 
                      onComplete={handleUploadComplete}
                      onClose={() => setShowUploadDialog(false)}
                    />
                  ) : (
                    <GoogleDrivePicker
                      onComplete={handleUploadComplete}
                      onClose={() => setShowUploadDialog(false)}
                    />
                  )}

                  {/* Current knowledge base */}
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                      <Database className="h-4 w-4" />
                      Active Knowledge Base ({referenceDocs.filter(d => d.is_active).length})
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {referenceDocs.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <span className="text-sm truncate text-gray-900 dark:text-white">{doc.title}</span>
                            {!doc.is_active && (
                              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-500 border-gray-300">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteReferenceMutation.mutate(doc)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={createConversation}
                className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/50"
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
                      : 'bg-slate-700/50 text-white hover:bg-slate-700'
                  }`}
                >
                  <div className="text-sm font-medium truncate">
                    {conv.metadata?.name || 'Chat Session'}
                  </div>
                  <div className="text-xs opacity-80">
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
                <Badge variant="outline" className="border-slate-600 text-white">
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
                    <p className="text-slate-300 max-w-md">
                      Your expert technical diagnostic and installation agent. Start a new conversation 
                      to troubleshoot, diagnose, or get installation guidance for fiber optic systems.
                    </p>
                  </div>
                  <Button onClick={createConversation} className="bg-blue-600 hover:bg-blue-700 text-white">
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
                          <div key={i} className="mt-2 text-xs text-slate-200 flex items-center gap-1">
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
                    className="bg-blue-600 hover:bg-blue-700 text-white"
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