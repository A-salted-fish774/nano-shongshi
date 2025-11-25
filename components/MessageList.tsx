import React, { useEffect, useRef, useState } from 'react';
import { Message, Role } from '../types';
import { Sparkles, Copy, ThumbsUp, ThumbsDown, RefreshCw, X, ZoomIn, Edit2, Trash2, Check, Banana, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  activeAssistantName?: string;
  onDeleteMessage?: (id: string) => void;
  onEditMessage?: (id: string, newText: string) => void;
  onRegenerateMessage?: (id: string) => void;
}

interface PreviewState {
    images: string[];
    index: number;
}

export const MessageList: React.FC<MessageListProps> = ({ 
    messages, 
    isLoading, 
    activeAssistantName,
    onDeleteMessage,
    onEditMessage,
    onRegenerateMessage
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Image Preview State (Updated to support navigation)
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);
  
  // Editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Image Zoom/Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, isLoading, editingMessageId]);

  useEffect(() => {
    if (editingMessageId && textareaRef.current) {
       textareaRef.current.style.height = 'auto';
       textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
       textareaRef.current.focus();
    }
  }, [editingMessageId]);

  // Reset zoom and pan when switching images
  useEffect(() => {
    if (previewState) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [previewState?.index, previewState?.images]); // Depend on index change

  // Handle Keyboard Navigation (ESC, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewState) setPreviewState(null);
        if (editingMessageId) setEditingMessageId(null);
      }
      
      if (previewState) {
          if (e.key === 'ArrowLeft') {
              handlePrevImage();
          }
          if (e.key === 'ArrowRight') {
              handleNextImage();
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewState, editingMessageId]);

  // Handle Ctrl + Wheel to zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!previewState) return;

      if (e.ctrlKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.002;
        setZoom(prev => Math.min(Math.max(0.1, prev + delta), 10));
      }
    };

    const modalEl = modalRef.current;
    if (modalEl) {
      modalEl.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (modalEl) {
        modalEl.removeEventListener('wheel', handleWheel);
      }
    };
  }, [previewState]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const startEditing = (msg: Message) => {
    const textPart = msg.parts.find(p => p.text);
    if (textPart) {
        setEditingMessageId(msg.id);
        setEditValue(textPart.text || '');
    }
  };

  const saveEdit = (id: string) => {
    if (onEditMessage && editValue.trim()) {
        onEditMessage(id, editValue.trim());
        setEditingMessageId(null);
    }
  };

  const handleCopy = (text: string) => {
     navigator.clipboard.writeText(text);
  };

  const handleDownloadImage = () => {
    if (previewState) {
        const currentSrc = previewState.images[previewState.index];
        const link = document.createElement('a');
        link.href = currentSrc;
        link.download = `nano-banana-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  // Navigation Handlers
  const handlePrevImage = () => {
      setPreviewState(prev => {
          if (!prev || prev.index <= 0) return prev;
          return { ...prev, index: prev.index - 1 };
      });
  };

  const handleNextImage = () => {
      setPreviewState(prev => {
          if (!prev || prev.index >= prev.images.length - 1) return prev;
          return { ...prev, index: prev.index + 1 };
      });
  };

  // Helper to open preview with context
  const openPreview = (images: string[], index: number) => {
      setPreviewState({ images, index });
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-8 scroll-smooth scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent font-sans" ref={scrollRef}>
        
        {/* Empty State */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 -mt-16 animate-in fade-in duration-700">
            <div className="w-20 h-20 bg-zinc-900/50 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-zinc-800/50 ring-1 ring-zinc-800/50">
              <Banana size={36} strokeWidth={1.5} className="text-brand-400 fill-brand-400/10" />
            </div>
            <h2 className="text-2xl font-medium text-zinc-100 mb-3 tracking-tight">
              {activeAssistantName || "Nano Banana"}
            </h2>
            <p className="text-zinc-500 max-w-sm text-[15px] leading-relaxed font-light">
              有什么可以帮你的吗？
            </p>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-10 pb-4">
          {messages.map((msg) => {
            // Separate Text and Image parts for clean rendering
            const textParts = msg.parts.filter(p => p.text);
            const imageParts = msg.parts.filter(p => p.inlineData);
            
            // Pre-calculate image URLs for this message for the gallery context
            const messageImageUrls = imageParts.map(p => `data:${p.inlineData!.mimeType};base64,${p.inlineData!.data}`);

            return (
            <div key={msg.id} className="group animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
              {/* Header */}
              <div className="flex items-center gap-4 mb-3">
                 {msg.role === Role.USER ? (
                   <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[11px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-700/50 shadow-sm">
                     你
                   </div>
                 ) : (
                   <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shadow-lg shadow-brand-500/10 border border-zinc-700/50">
                     <Banana size={16} className="text-brand-400 fill-brand-400/20" />
                   </div>
                 )}
                 <span className="text-[13px] font-medium text-zinc-400 tracking-wide uppercase opacity-80">
                   {msg.role === Role.USER ? '用户' : 'Nano Banana'}
                 </span>
              </div>

              {/* Content Container */}
              <div className={`pl-12 space-y-4`}>
                 <div className="flex flex-col gap-4 max-w-full">
                  
                  {/* 1. Render Images Grid First (Unified Size) */}
                  {imageParts.length > 0 && (
                      <div className={`grid gap-2 ${imageParts.length > 1 ? 'grid-cols-2 w-fit' : 'grid-cols-1 w-fit'}`}>
                          {imageParts.map((part, idx) => (
                              <div 
                                key={`img-${idx}`}
                                className="relative group/img rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 cursor-zoom-in shrink-0 shadow-md w-72 h-72"
                                onClick={() => openPreview(messageImageUrls, idx)}
                              >
                                  <img 
                                      src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                                      alt="Generated content" 
                                      className="w-full h-full object-cover transition-all duration-500 group-hover/img:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                                      <ZoomIn className="text-white opacity-0 group-hover/img:opacity-100 drop-shadow-md transition-opacity duration-300 transform scale-90 group-hover/img:scale-100" size={24} />
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}

                  {/* 2. Render Text Parts (Descriptions or Error Messages) */}
                  {textParts.length > 0 && (
                      <div className="flex flex-col gap-2 max-w-[540px]">
                        {textParts.map((part, idx) => (
                            <React.Fragment key={`txt-${idx}`}>
                                {editingMessageId === msg.id ? (
                                    <div className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3">
                                        <textarea
                                            ref={textareaRef}
                                            value={editValue}
                                            onChange={(e) => {
                                                setEditValue(e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = `${e.target.scrollHeight}px`;
                                            }}
                                            className="w-full bg-transparent text-zinc-200 text-[15px] leading-7 resize-none focus:outline-none scrollbar-hide"
                                            rows={1}
                                        />
                                        <div className="flex justify-end gap-2 mt-3">
                                            <button 
                                                onClick={() => setEditingMessageId(null)}
                                                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                                            >
                                                取消
                                            </button>
                                            <button 
                                                onClick={() => saveEdit(msg.id)}
                                                className="px-3 py-1.5 text-xs font-medium text-zinc-950 bg-brand-500 hover:bg-brand-400 rounded-md transition-colors flex items-center gap-1.5"
                                            >
                                                <Check size={12} />
                                                发送
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full text-zinc-200 leading-7 text-[15px] whitespace-pre-wrap font-normal tracking-wide antialiased selection:bg-brand-500/20 selection:text-brand-100">
                                        {part.text}
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                      </div>
                  )}
                </div>

                {/* Footer Actions (User) */}
                {msg.role === Role.USER && !editingMessageId && (
                    <div className="flex items-center justify-end">
                       <div className="flex items-center gap-1 bg-zinc-900/50 backdrop-blur rounded-lg border border-zinc-800/50 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button 
                            onClick={() => onRegenerateMessage && onRegenerateMessage(msg.id)}
                            className="p-1.5 text-zinc-500 hover:text-brand-400 hover:bg-zinc-800 rounded-md transition-all"
                            title="重新生成"
                          >
                             <RefreshCw size={14} />
                          </button>
                          <button 
                            onClick={() => startEditing(msg)}
                            className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 rounded-md transition-all"
                            title="编辑"
                          >
                             <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => {
                                const text = msg.parts.map(p => p.text).join('');
                                handleCopy(text);
                            }}
                            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-all"
                            title="复制"
                          >
                             <Copy size={14} />
                          </button>
                          <div className="w-[1px] h-3 bg-zinc-800 mx-0.5"></div>
                          <button 
                            onClick={() => onDeleteMessage && onDeleteMessage(msg.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-md transition-all"
                            title="删除"
                          >
                             <Trash2 size={14} />
                          </button>
                       </div>
                    </div>
                )}

                {/* Footer Actions (Model) */}
                {msg.role === Role.MODEL && (
                  <div className="flex items-center gap-3 pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                        onClick={() => {
                            const text = msg.parts.map(p => p.text).join('');
                            handleCopy(text);
                        }}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors p-1" 
                        title="复制"
                    >
                        <Copy size={13} strokeWidth={2} />
                    </button>
                    <button 
                        onClick={() => onRegenerateMessage && onRegenerateMessage(msg.id)}
                        className="text-zinc-600 hover:text-zinc-300 transition-colors p-1" 
                        title="重新生成"
                    >
                        <RefreshCw size={13} strokeWidth={2} />
                    </button>
                    <div className="h-3 w-[1px] bg-zinc-800"></div>
                    <button className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"><ThumbsUp size={13} strokeWidth={2} /></button>
                    <button className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"><ThumbsDown size={13} strokeWidth={2} /></button>
                  </div>
                )}
              </div>
            </div>
            );
          })}

          {isLoading && (
            <div className="pl-12 animate-in fade-in duration-300">
               <div className="flex items-center gap-1.5 h-6">
                  <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce"></div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Image Preview Modal */}
      {previewState && (
        <div 
          ref={modalRef}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-300 select-none font-sans"
          onClick={() => setPreviewState(null)}
        >
          {/* Top Actions */}
          <div className="absolute top-6 right-6 z-[120] flex items-center gap-3">
            <button 
                className="p-3 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-brand-600 rounded-full transition-all border border-zinc-700/50 cursor-pointer shadow-lg backdrop-blur-md"
                onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadImage();
                }}
                title="下载图片"
            >
                <Download size={24} />
            </button>
            <button 
                className="p-3 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 rounded-full transition-all border border-zinc-700/50 cursor-pointer shadow-lg backdrop-blur-md"
                onClick={(e) => {
                e.stopPropagation();
                setPreviewState(null);
                }}
                title="关闭"
            >
                <X size={24} />
            </button>
          </div>

          {/* Previous Button */}
          {previewState.images.length > 1 && (
            <button 
                className={`absolute left-6 top-1/2 -translate-y-1/2 z-[120] p-4 rounded-full transition-all border border-zinc-700/50 backdrop-blur-md ${previewState.index > 0 ? 'text-zinc-200 hover:text-brand-400 bg-zinc-800/50 hover:bg-zinc-800 cursor-pointer shadow-lg' : 'text-zinc-700 bg-zinc-900/30 cursor-not-allowed border-transparent'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                }}
                disabled={previewState.index <= 0}
            >
                <ChevronLeft size={32} />
            </button>
          )}

          {/* Next Button */}
          {previewState.images.length > 1 && (
            <button 
                className={`absolute right-6 top-1/2 -translate-y-1/2 z-[120] p-4 rounded-full transition-all border border-zinc-700/50 backdrop-blur-md ${previewState.index < previewState.images.length - 1 ? 'text-zinc-200 hover:text-brand-400 bg-zinc-800/50 hover:bg-zinc-800 cursor-pointer shadow-lg' : 'text-zinc-700 bg-zinc-900/30 cursor-not-allowed border-transparent'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                }}
                disabled={previewState.index >= previewState.images.length - 1}
            >
                <ChevronRight size={32} />
            </button>
          )}
          
          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()} 
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
             <img 
                src={previewState.images[previewState.index]} 
                alt="Full preview" 
                style={{ 
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                className="max-w-full max-h-full object-contain shadow-2xl"
                onMouseDown={handleMouseDown}
                draggable={false}
             />
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-none">
             <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 px-5 py-2.5 rounded-full text-xs text-zinc-300 flex items-center gap-3 shadow-xl tracking-wide">
                <span>Ctrl + 滚轮缩放</span>
                <div className="w-[1px] h-3 bg-zinc-700"></div>
                <span className="text-brand-400">拖拽移动</span>
                <div className="w-[1px] h-3 bg-zinc-700"></div>
                <span>Esc 关闭</span>
                {previewState.images.length > 1 && (
                    <>
                        <div className="w-[1px] h-3 bg-zinc-700"></div>
                        <span>← → 切换</span>
                        <span className="text-zinc-500 ml-1 font-mono">{previewState.index + 1} / {previewState.images.length}</span>
                    </>
                )}
             </div>
          </div>
        </div>
      )}
    </>
  );
};