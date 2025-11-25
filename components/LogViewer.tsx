import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal, XCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface LogViewerProps {
  logs: LogEntry[];
  isVisible: boolean;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, isVisible }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-48 border-t border-zinc-800 bg-zinc-950 font-mono text-[10px] animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-zinc-500">
        <Terminal size={10} />
        <span className="uppercase tracking-wider font-semibold">System Logs</span>
      </div>
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800"
      >
        {logs.length === 0 && (
            <div className="text-zinc-700 italic px-1">等待任务...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 items-start opacity-90 hover:opacity-100 transition-opacity">
            <span className="text-zinc-600 shrink-0 select-none">
              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' })}
            </span>
            <div className="flex items-center gap-1.5 break-all">
                {log.type === 'info' && <Info size={10} className="text-blue-500 mt-0.5 shrink-0" />}
                {log.type === 'success' && <CheckCircle size={10} className="text-emerald-500 mt-0.5 shrink-0" />}
                {log.type === 'error' && <XCircle size={10} className="text-red-500 mt-0.5 shrink-0" />}
                {log.type === 'warning' && <AlertTriangle size={10} className="text-amber-500 mt-0.5 shrink-0" />}
                <span className={`
                    ${log.type === 'error' ? 'text-red-400' : ''}
                    ${log.type === 'success' ? 'text-emerald-400' : ''}
                    ${log.type === 'warning' ? 'text-amber-400' : ''}
                    ${log.type === 'info' ? 'text-zinc-300' : ''}
                `}>
                    {log.message}
                </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};