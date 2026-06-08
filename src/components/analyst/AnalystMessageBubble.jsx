import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Activity, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Renders a single agent/user message in the ONT Analyst chat.
 * Tool calls (analyzeOntTrends etc.) are shown as collapsible chips so the
 * user can inspect what the analyst looked at.
 */
function ToolChip({ toolCall }) {
  const [open, setOpen] = useState(false);
  const status = toolCall?.status || 'pending';
  const running = status === 'running' || status === 'pending' || status === 'in_progress';
  const failed = status === 'failed' || status === 'error';
  const Icon = running ? Loader2 : failed ? AlertCircle : CheckCircle2;
  const name = (toolCall?.name || 'analysis').split('.').pop();

  let results = toolCall?.results;
  try {
    if (typeof results === 'string') results = JSON.parse(results);
  } catch {
    /* keep raw */
  }

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors',
          open ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50'
        )}
      >
        <Icon className={cn('h-3 w-3', running && 'animate-spin text-blue-500', failed ? 'text-red-500' : 'text-green-600')} />
        <span className="text-slate-700">{name}</span>
        {!running && (results || toolCall?.arguments_string) && (
          <ChevronRight className={cn('h-3 w-3 text-slate-400 transition-transform', open && 'rotate-90')} />
        )}
      </button>
      {open && !running && (
        <div className="mt-1.5 ml-3 pl-3 border-l-2 border-slate-200 space-y-2">
          {toolCall?.arguments_string && (
            <pre className="bg-slate-50 rounded-md p-2 text-[11px] text-slate-600 whitespace-pre-wrap">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
                } catch {
                  return toolCall.arguments_string;
                }
              })()}
            </pre>
          )}
          {results && (
            <pre className="bg-slate-50 rounded-md p-2 text-[11px] text-slate-600 whitespace-pre-wrap max-h-64 overflow-auto">
              {typeof results === 'object' ? JSON.stringify(results, null, 2) : String(results)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnalystMessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mt-0.5">
          <Activity className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={cn('max-w-[85%]', isUser && 'flex flex-col items-end')}>
        {message.content && (
          <div
            className={cn(
              'rounded-2xl px-4 py-2.5',
              isUser ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200'
            )}
          >
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold my-2">{children}</h3>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {message.tool_calls?.length > 0 && (
          <div className="space-y-1">
            {message.tool_calls.map((tc, i) => (
              <ToolChip key={i} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}