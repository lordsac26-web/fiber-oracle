import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`relative max-w-[85%] sm:max-w-[75%] ${isUser ? 'ml-auto' : 'mr-auto'}`}>
        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 shadow-lg ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700/90 text-slate-100 border border-slate-600/50'
          }`}
        >
          {message.role === 'assistant' ? (
            <ReactMarkdown 
              className="prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              components={{
                p: ({children}) => <p className="mb-2 last:mb-0 leading-relaxed break-words">{children}</p>,
                ul: ({children}) => <ul className="mb-2 last:mb-0 ml-4 list-disc">{children}</ul>,
                ol: ({children}) => <ol className="mb-2 last:mb-0 ml-4 list-decimal">{children}</ol>,
                li: ({children}) => <li className="mb-1 break-words">{children}</li>,
                code: ({inline, children}) => 
                  inline ? (
                    <code className="px-1.5 py-0.5 rounded bg-slate-600 text-cyan-300 text-sm font-mono break-words">
                      {children}
                    </code>
                  ) : (
                    <code className="block px-3 py-2 rounded bg-slate-800 text-cyan-300 text-sm font-mono overflow-x-auto my-2">
                      {children}
                    </code>
                  ),
                h1: ({children}) => <h1 className="text-xl font-bold mb-2 break-words">{children}</h1>,
                h2: ({children}) => <h2 className="text-lg font-bold mb-2 break-words">{children}</h2>,
                h3: ({children}) => <h3 className="text-base font-bold mb-2 break-words">{children}</h3>,
                strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
                em: ({children}) => <em className="italic text-slate-200">{children}</em>,
                a: ({children, href}) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline break-all">
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
          )}
          
          {/* Tool Calls */}
          {message.tool_calls && message.tool_calls.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-slate-600 pt-2">
              {message.tool_calls.map((tool, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                  {tool.status === 'running' || tool.status === 'in_progress' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : tool.status === 'completed' || tool.status === 'success' ? (
                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                  ) : tool.status === 'failed' || tool.status === 'error' ? (
                    <AlertCircle className="h-3 w-3 text-red-400" />
                  ) : (
                    <div className="h-3 w-3 rounded-full bg-slate-600" />
                  )}
                  <span className="truncate">{tool.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <div className={`text-xs text-slate-400 mt-1 px-2 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.created_date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}