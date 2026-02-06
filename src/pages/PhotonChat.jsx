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
  Link as LinkIcon,
  Search,
  Menu,
  Grid3x3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MultiFileUpload from '@/components/photon/MultiFileUpload';
import GoogleDrivePicker from '@/components/photon/GoogleDrivePicker';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import AIModeSidebar from '@/components/AIModeSidebar';
import { useUserPreferences } from '@/components/UserPreferencesContext';
import EnhancedMessageBubble from '@/components/photon/EnhancedMessageBubble';
import PhotonHeader from '@/components/photon/PhotonHeader';
import { PremiumButton, AnimatedLoader } from '@/components/premium';

export default function PhotonChat() {
  const queryClient = useQueryClient();
  const { preferences } = useUserPreferences();
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadMode, setUploadMode] = useState('local'); // 'local' or 'drive'
  const messagesEndRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const textareaRef = useRef(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if in AI-centric mode
  const isAICentricMode = preferences.aiCentricMode || false;

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + N for new chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createConversation();
      }
      // Ctrl/Cmd + K for focus search/input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conversationId]);

  // Get current user for audit logging and role check
  useEffect(() => {
    base44.auth.me().then(user => setCurrentUser(user)).catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const isRegularUser = currentUser?.role === 'user';

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

  // Fetch conversations (limit to 8)
  const { data: allConversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ['photonConversations'],
    queryFn: () => base44.agents.listConversations({ agent_name: 'photon' }),
  });
  
  const conversations = allConversations.slice(0, 8);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
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

  // Delete reference doc (admin only)
  const deleteReferenceMutation = useMutation({
    mutationFn: async (doc) => {
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
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
    onError: (error) => {
      toast.error(error.message || 'Failed to delete document');
    }
  });

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex overflow-hidden">
      {/* AI Mode Sidebar - Desktop */}
      {isAICentricMode && !isMobile && (
        <AIModeSidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />
      )}
      
      {/* AI Mode Sidebar - Mobile */}
      {isAICentricMode && isMobile && (
        <AIModeSidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} isMobile={true} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <PhotonHeader
          isAdmin={isAdmin}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
          showSidebar={showSidebar}
          isAICentricMode={isAICentricMode}
          onOpenUploadDialog={isAdmin ? () => setShowUploadDialog(true) : null}
          docsCount={referenceDocs.length}
        />
        {isAdmin && (
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <span />
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900/95 border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5" />
                Add Reference Documents
              </DialogTitle>
            </DialogHeader>
            
            {/* Upload mode tabs */}
            <div className="flex gap-2 border-b border-slate-700 pb-3">
              <Button
                variant={uploadMode === 'local' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setUploadMode('local')}
                className={uploadMode === 'local' ? 'bg-blue-600 text-white' : 'text-slate-400'}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              <Button
                variant={uploadMode === 'drive' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setUploadMode('drive')}
                className={uploadMode === 'drive' ? 'bg-blue-600 text-white' : 'text-slate-400'}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Link Google Drive
              </Button>
            </div>

            {uploadMode === 'local' ? (
              <MultiFileUpload 
                onComplete={handleUploadComplete}
                onClose={() => setShowUploadDialog(false)}
                isAdmin={isAdmin}
              />
            ) : (
              <GoogleDrivePicker
                onComplete={handleUploadComplete}
                onClose={() => setShowUploadDialog(false)}
                isAdmin={isAdmin}
              />
            )}

            {/* Current knowledge base */}
            <div className="border-t border-slate-700 pt-4 mt-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-white">
                <Database className="h-4 w-4" />
                Active Knowledge Base ({referenceDocs.filter(d => d.is_active).length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {referenceDocs.map(doc => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-2 bg-slate-800/50 border border-slate-700 rounded hover:bg-slate-800/70 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <span className="text-sm truncate text-slate-100">{doc.title}</span>
                      {!doc.is_active && (
                        <Badge variant="outline" className="text-xs bg-slate-700 text-slate-300 border-slate-600">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteReferenceMutation.mutate(doc)}
                      >
                        <Trash2 className="h-4 w-4 text-red-400 hover:text-red-300" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        )}

      <main className="flex-1 flex max-w-7xl mx-auto w-full min-h-0">
        <div className="flex flex-1 gap-2 sm:gap-4 md:gap-6 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 min-h-0">
          {/* Sidebar - Conversations - Static Container */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="hidden md:block w-64 lg:w-72 flex-shrink-0"
          >
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm flex flex-col h-full overflow-hidden">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Conversations
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
                {convsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <AnimatedLoader size="sm" label="Loading..." />
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="text-white/60 text-xs text-center py-4">No conversations yet</p>
                ) : (
                  <AnimatePresence>
                    {conversations.map((conv, i) => (
                      <motion.button
                        key={conv.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => loadConversation(conv.id)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          conversationId === conv.id 
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20' 
                            : 'bg-slate-700/30 text-white hover:bg-slate-700/50 border border-slate-700/50'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="text-sm font-medium truncate">
                          {conv.metadata?.name || 'Chat Session'}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {new Date(conv.created_date).toLocaleDateString()}
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Chat Area */}
          <Card className="flex-1 border-slate-700 bg-slate-800/50 backdrop-blur-sm flex flex-col max-w-5xl mx-auto w-full min-h-0">
            <CardHeader className="pb-2 sm:pb-3 border-b border-slate-700 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-white flex items-center gap-2 text-sm sm:text-base">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
                  <span className="hidden sm:inline">{conversationId ? 'Active Session' : 'Start a New Conversation'}</span>
                  <span className="sm:hidden">P.H.O.T.O.N.</span>
                </CardTitle>
                <Badge variant="outline" className="border-slate-600 text-white text-xs">
                  <Database className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">{referenceDocs.length} PDFs</span>
                  <span className="sm:hidden">{referenceDocs.length}</span>
                </Badge>
              </div>
            </CardHeader>
            
            {/* Messages Container - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
              <div className="flex flex-col min-h-full max-w-4xl mx-auto w-full">
                {!conversationId ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center justify-center flex-1 text-center space-y-4 sm:space-y-6 px-4"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/30"
                    >
                      <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                      <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-3">
                        Welcome to P.H.O.T.O.N.
                      </h2>
                      <p className="text-slate-400 text-sm sm:text-base max-w-md leading-relaxed">
                        Your expert technical diagnostic and installation agent. Start a new conversation to troubleshoot, diagnose, or get installation guidance for fiber optic systems.
                      </p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                      <PremiumButton
                        onClick={createConversation}
                        glow
                        className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold shadow-lg"
                      >
                        <Plus className="h-4 w-4" />
                        Start New Session
                      </PremiumButton>
                    </motion.div>
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg, idx) => (
                      <EnhancedMessageBubble key={msg.id || idx} message={msg} />
                    ))}
                    <div ref={messagesEndRef} className="h-px" />
                  </div>
                )}
              </div>
            </div>

            {/* Input Area - Fixed at Bottom */}
            {conversationId && (
              <div className="border-t border-slate-700 px-3 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-4 shrink-0 bg-slate-800/80 backdrop-blur-sm">
                <form onSubmit={sendMessage} className="flex gap-2 max-w-4xl mx-auto w-full">
                  <Textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask P.H.O.T.O.N... (Ctrl+Enter or Shift+Enter to send)"
                    className="flex-1 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 resize-none text-sm sm:text-base min-h-[44px] rounded-lg focus:border-cyan-500/50 focus:ring-cyan-500/20"
                    rows={1}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' && e.ctrlKey) || (e.key === 'Enter' && !e.shiftKey)) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <PremiumButton 
                    type="submit" 
                    isLoading={isSending}
                    disabled={isSending || !inputMessage.trim()}
                    glow={!isSending && inputMessage.trim()}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 min-h-[44px] font-bold shadow-lg disabled:opacity-50"
                    size="sm"
                  >
                    {!isSending && <Send className="h-4 w-4" />}
                  </PremiumButton>
                </form>
              </div>
            )}
          </Card>
        </div>
      </main>
      </div>
    </div>
  );
}