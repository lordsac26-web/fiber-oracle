import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Activity, Send, Loader2, Sparkles } from 'lucide-react';
import AnalystMessageBubble from '@/components/analyst/AnalystMessageBubble';

const AGENT_NAME = 'ont_analyst';

const SUGGESTIONS = [
  'Show me the newest critical ONTs from the latest report',
  'Is the latest critical on this PON a new issue or aging?',
  'Does this ONT\'s degradation correlate with weather?',
  'Are multiple ONTs on the same port trending down together?',
];

export default function ONTAnalyst() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const scrollRef = useRef(null);

  // Create a conversation on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      const convo = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: 'ONT Analyst Session', description: 'ONT performance trend analysis' },
      });
      if (!active) return;
      setConversation(convo);
      setMessages(convo.messages || []);
      setInitializing(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Subscribe to streaming updates.
  useEffect(() => {
    if (!conversation?.id) return undefined;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      const last = (data.messages || [])[data.messages.length - 1];
      if (last && last.role === 'assistant' && last.status !== 'running') setSending(false);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  // Auto-scroll on new content.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = useCallback(
    async (text) => {
      const content = (text ?? input).trim();
      if (!content || !conversation || sending) return;
      setInput('');
      setSending(true);
      await base44.agents.addMessage(conversation, { role: 'user', content });
    },
    [input, conversation, sending]
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">ONT Analyst</h1>
            <p className="text-xs text-slate-500">Your assistant analyst for ONT performance trends</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {initializing ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Starting analyst…
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-base font-semibold text-slate-800 mb-1">Ask about any ONT or PON port</h2>
              <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                Give me a serial (FSAN) or a PON port and I'll tell you whether a critical is new or aging,
                when it started, if it's a PON-wide trend, and whether weather looks involved.
              </p>
              <div className="grid sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-sm px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-slate-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => <AnalystMessageBubble key={m.id || i} message={m} />)
          )}
          {sending && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-center gap-2 text-slate-400 text-sm pl-11">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about an ONT serial or PON port…"
              disabled={initializing || sending}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || sending || initializing} size="icon">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}