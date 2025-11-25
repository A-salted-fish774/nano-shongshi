import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Settings, 
  PanelLeft,
  Banana,
  MessageSquare,
  Edit2,
  Trash2,
  Activity
} from 'lucide-react';
import { ChatSession, LogEntry } from '../types';
import { LogViewer } from './LogViewer';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  logs: LogEntry[];
  showLogs: boolean;
  onToggleLogs: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  activeSessionId,
  onNewChat, 
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onOpenSettings,
  onToggleSidebar,
  logs,
  showLogs,
  onToggleLogs
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const startEditing = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
    setDeleteConfirmId(null);
  };

  const saveTitle = (id: string) => {
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deleteConfirmId === id) {
      onDeleteSession(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  return (
    <div className="w-full h-full flex flex-col border-r border-zinc-900 bg-zinc-950 font-sans">
      
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 mb-2 flex-shrink-0">
        <div className="flex items-center gap-3 text-zinc-100 font-medium tracking-tight">
           <div className="w-8 h-8 bg-zinc-900/50 rounded-xl border border-zinc-800 flex items-center justify-center text-brand-400 shadow-lg shadow-brand-glow">
             <Banana size={18} strokeWidth={2} className="fill-brand-400/20" />
           </div>
           <span className="text-[15px] font-semibold tracking-tight text-zinc-200">Nano Space</span>
        </div>
        <button 
          onClick={onToggleSidebar}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-2 hover:bg-zinc-900 rounded-lg"
        >
           <PanelLeft size={18} strokeWidth={1.5} />
        </button>
      </div>

      {/* Primary Action */}
      <div className="px-4 mb-6 flex-shrink-0">
        <button 
          onClick={onNewChat}
          className="group w-full flex items-center justify-between bg-zinc-900 hover:bg-zinc-800/80 text-zinc-300 transition-all py-3 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 active:scale-[0.98] shadow-sm"
        >
          <div className="flex items-center gap-3">
            <Plus size={18} strokeWidth={2} className="text-zinc-500 group-hover:text-brand-400 transition-colors" />
            <span className="text-[14px] font-medium">开启新对话</span>
          </div>
        </button>
      </div>

      {/* Section Label */}
      <div className="px-6 pb-2 text-[11px] font-semibold text-zinc-600 uppercase tracking-widest opacity-80 flex-shrink-0">
        历史记录
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-thin scrollbar-thumb-zinc-900">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] transition-all border cursor-pointer ${
              session.id === activeSessionId
                ? 'bg-zinc-900 text-brand-400 border-zinc-800 shadow-sm' 
                : 'text-zinc-500 hover:bg-zinc-900/40 hover:text-zinc-300 border-transparent'
            }`}
            onClick={() => onSelectSession(session.id)}
          >
            <MessageSquare size={16} className={`flex-shrink-0 ${session.id === activeSessionId ? 'text-brand-400 fill-brand-400/10' : 'text-zinc-700 group-hover:text-zinc-500'}`} />
            
            {editingId === session.id ? (
              <div className="flex-1 flex items-center gap-1 min-w-0">
                <input
                  ref={editInputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle(session.id);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  onBlur={() => saveTitle(session.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-zinc-950 text-zinc-200 px-2 py-1 rounded border border-brand-500/30 focus:outline-none focus:border-brand-500"
                />
              </div>
            ) : (
              <span className="truncate flex-1 font-medium">{session.title}</span>
            )}

            {/* Hover Actions */}
            {editingId !== session.id && (
              <div className={`flex items-center gap-1 ${session.id === activeSessionId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                
                {deleteConfirmId === session.id ? (
                   <span className="text-[10px] text-red-400 font-medium animate-in fade-in mr-2">确认?</span>
                ) : null}

                <button 
                  onClick={(e) => startEditing(e, session)}
                  className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <Edit2 size={12} />
                </button>
                <button 
                  onClick={(e) => handleDeleteClick(e, session.id)}
                  className={`p-1.5 hover:bg-zinc-800 rounded-md transition-colors ${deleteConfirmId === session.id ? 'text-red-400 bg-zinc-800' : 'text-zinc-500 hover:text-red-400'}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
        
        {sessions.length === 0 && (
            <div className="px-4 py-12 text-center">
                <div className="inline-block p-3 rounded-full bg-zinc-900 mb-3 text-zinc-700">
                    <Banana size={20} />
                </div>
                <div className="text-xs text-zinc-600 font-medium">暂无历史记录</div>
            </div>
        )}
      </div>

      {/* Log Viewer & Toggle */}
      <div className="flex-shrink-0 flex flex-col">
        <LogViewer logs={logs} isVisible={showLogs} />
        
        <div className="border-t border-zinc-900">
             <button 
              onClick={onToggleLogs}
              className={`flex items-center gap-3 text-xs w-full px-4 py-2 hover:bg-zinc-900 transition-colors ${showLogs ? 'text-brand-400' : 'text-zinc-600 hover:text-zinc-400'}`}
             >
                <Activity size={14} />
                <span className="font-medium">实时日志 {logs.length > 0 && !showLogs && `(${logs.length})`}</span>
                {showLogs && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></div>}
             </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-900 flex-shrink-0">
        <button 
          onClick={onOpenSettings}
          className="flex items-center gap-3 text-zinc-500 hover:text-zinc-200 transition-colors text-sm w-full px-4 py-3 rounded-xl hover:bg-zinc-900"
        >
           <Settings size={18} strokeWidth={1.5} />
           <span className="font-medium">设置</span>
        </button>
      </div>
    </div>
  );
};