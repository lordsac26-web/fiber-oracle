import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Copy, Zap, CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";

const FunctionDisplay = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || 'Function';
  const status = toolCall?.status || 'pending';
  const results = toolCall?.results;
  
  const parsedResults = (() => {
    if (!results) return null;
    try {
      return typeof results === 'string' ? JSON.parse(results) : results;
    } catch {
      return results;
    }
  })();
  
  const parsedArguments = (() => {
    if (!toolCall?.arguments_string) return null;
    try {
      return JSON.parse(toolCall.arguments_string);
    } catch {
      return toolCall.arguments_string;
    }
  })();

  const isError = results && (
    (typeof results === 'string' && /error|failed/i.test(results)) ||
    (parsedResults?.success === false)
  );
  
  const statusConfig = {
    pending: { icon: Clock, color: 'text-slate-400', text: 'Pending' },
    running: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
    in_progress: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
    completed: isError ? 
      { icon: AlertCircle, color: 'text-red-500', text: 'Failed' } : 
      { icon: CheckCircle2, color: 'text-emerald-500', text: 'Success' },
    success: { icon: CheckCircle2, color: 'text-emerald-500', text: 'Success' },
    failed: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' },
    error: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' }
  }[status] || { icon: Zap, color: 'text-slate-500', text: '' };
  
  const Icon = statusConfig.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-3 text-xs"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all w-full",
          "hover:bg-slate-700/50",
          expanded ? "bg-slate-700/50 border-slate-600" : "bg-slate-800/50 border-slate-700"
        )}
      >
        <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
        <span className="text-slate-300">{name.split('.').pop()}</span>
        {statusConfig.text && (
          <span className={cn("text-slate-500", isError && "text-red-500")}>
            • {statusConfig.text}
          </span>
        )}
      </button>
      
      {expanded && !statusConfig.spin && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-2 ml-3 pl-3 border-l-2 border-slate-600 space-y-2"
        >
          {toolCall.arguments_string && (
            <div>
              <div className="text-xs text-slate-400 mb-1">Parameters:</div>
              <pre className="bg-slate-900/50 rounded p-2 text-xs text-slate-300 overflow-auto max-h-32">
                {typeof parsedArguments === 'object' ? JSON.stringify(parsedArguments, null, 2) : parsedArguments}
              </pre>
            </div>
          )}
          {parsedResults && (
            <div>
              <div className="text-xs text-slate-400 mb-1">Result:</div>
              <pre className="bg-slate-900/50 rounded p-2 text-xs text-slate-300 overflow-auto max-h-32">
                {typeof parsedResults === 'object' ? JSON.stringify(parsedResults, null, 2) : parsedResults}
              </pre>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default function EnhancedMessageBubble({ message }) {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex gap-2 mb-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-md flex-shrink-0 mt-auto mb-1"
        >
          <Zap className="h-4 w-4 text-white" />
        </motion.div>
      )}
      
      <div className={cn("max-w-[75%] sm:max-w-[80%] lg:max-w-[70%]", isUser && "flex flex-col items-end")}>
        {message.content && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "relative px-4 py-2.5 shadow-md",
              isUser
                ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl rounded-tr-sm"
                : "bg-slate-700/80 text-slate-100 rounded-2xl rounded-tl-sm"
            )}
          >
            {/* Tail pointer */}
            <div className={cn(
              "absolute top-0 w-0 h-0",
              isUser 
                ? "right-0 border-l-[12px] border-l-emerald-500 border-t-[12px] border-t-transparent translate-x-[6px]"
                : "left-0 border-r-[12px] border-r-slate-700/80 border-t-[12px] border-t-transparent -translate-x-[6px]"
            )} />
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  code: ({ inline, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="relative group/code my-2">
                        <pre className="bg-slate-900/80 text-slate-100 rounded-lg p-3 overflow-x-auto border border-slate-700">
                          <code className={className} {...props}>{children}</code>
                        </pre>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-slate-700 hover:bg-slate-600"
                          onClick={() => {
                            navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <code className="px-1.5 py-0.5 rounded bg-slate-900/50 text-cyan-300 text-xs font-mono">
                        {children}
                      </code>
                    );
                  },
                  a: ({ children, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                      {children}
                    </a>
                  ),
                  p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-2 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="my-2 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="my-1">{children}</li>,
                  h1: ({ children }) => <h1 className="text-lg font-bold my-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold my-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold my-2">{children}</h3>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-slate-600 pl-3 my-2 text-slate-400 italic">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </motion.div>
        )}
        
        {message.tool_calls?.length > 0 && (
          <div className="mt-2 w-full space-y-1">
            {message.tool_calls.map((toolCall, idx) => (
              <FunctionDisplay key={idx} toolCall={toolCall} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}