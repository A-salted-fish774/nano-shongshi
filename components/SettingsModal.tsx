import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, MonitorPlay, Globe } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (baseUrl: string) => void;
  initialBaseUrl: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialBaseUrl,
}) => {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);

  useEffect(() => {
    if (isOpen) {
      setBaseUrl(initialBaseUrl);
    }
  }, [isOpen, initialBaseUrl]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(baseUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <MonitorPlay size={18} className="text-emerald-500" />
            <h2 className="text-lg font-medium text-zinc-100 tracking-tight">设置</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-zinc-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          
          {/* Base URL Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Globe size={14} />
              <span>API 代理地址 (可选)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://generativelanguage.googleapis.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between mt-auto">
            <button
              onClick={() => {
                  setBaseUrl('');
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 transition-colors px-2 py-1.5 rounded-lg hover:bg-zinc-800"
            >
              <RotateCcw size={12} />
              重置
            </button>
            
            <div className="flex gap-3">
                <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 font-medium transition-colors"
                >
                取消
                </button>
                <button
                onClick={handleSave}
                className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-medium rounded-lg shadow-lg shadow-zinc-900/20 transition-all flex items-center gap-2"
                >
                <Save size={16} />
                保存更改
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};