import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MessageList } from './components/MessageList';
import { InputArea } from './components/InputArea';
import { Message, Role, Attachment, Assistant, ChatSession, MessagePart, LogEntry } from './types';
import { generateContent } from './services/geminiService';
import { saveSessionToDB, deleteSessionFromDB, getAllSessionsFromDB } from './services/storageService';
import { SettingsModal } from './components/SettingsModal';
import { 
  Menu,
  ChevronDown,
  Banana
} from 'lucide-react';

const INITIAL_ASSISTANTS: Assistant[] = [
  { 
    id: 'nano-banana', 
    name: 'Nano Banana', 
    icon: '🍌', 
    model: 'gemini-2.5-flash-image',
    systemInstruction: 'You are Nano Banana, a pure AI image generator. \nCRITICAL RULE: You must NEVER reply with text, chat, explanations, or code.\nIf the user sends text, generate an image that visualizes that text.\nIf the user sends "Hello", generate an image of a greeting.\nYour ONLY output must be the generated image(s).'
  },
  { 
    id: 'nano-banana-pro', 
    name: 'Nano Banana Pro', 
    icon: '🍌⁺', 
    model: 'gemini-3-pro-image-preview',
    systemInstruction: 'You are Nano Banana Pro, a high-fidelity AI artist.\nCRITICAL RULE: You must NEVER reply with text, chat, explanations, or code.\nYour task is solely to generate superior quality images based on the prompt.\nEven for simple greetings, generate an artistic visual representation.\nYour ONLY output must be the generated image(s).'
  }
];

const App: React.FC = () => {
  // Session State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showAssistantMenu, setShowAssistantMenu] = useState(false);
  
  // Logs State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Settings State
  const [baseUrl, setBaseUrl] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('gemini_base_url') || '' : ''));

  // Generation Options State (Lifted from InputArea)
  const [aspectRatio, setAspectRatio] = useState<string>('Default');
  const [generationCount, setGenerationCount] = useState<number>(4);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    setLogs(prev => [...prev, {
        id: Date.now().toString() + Math.random().toString().slice(2),
        timestamp: Date.now(),
        message,
        type
    }]);
  };

  // Load from IndexedDB on mount
  useEffect(() => {
    const initData = async () => {
        let loadedSessions = await getAllSessionsFromDB();
        
        // Migration: If DB is empty, try to salvage from localStorage once
        if (loadedSessions.length === 0) {
            const local = localStorage.getItem('chat_sessions');
            if (local) {
                try {
                    const parsed = JSON.parse(local);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        loadedSessions = parsed;
                        // Save migrated data to DB immediately
                        for (const s of loadedSessions) {
                            await saveSessionToDB(s);
                        }
                    }
                } catch(e) {
                    console.error("Migration failed", e);
                }
            }
        }

        // Default session if nothing exists
        if (loadedSessions.length === 0) {
            const newSession: ChatSession = {
                id: Date.now().toString(),
                title: '新对话',
                messages: [],
                assistantId: 'nano-banana',
                createdAt: Date.now()
            };
            await saveSessionToDB(newSession);
            loadedSessions = [newSession];
        }

        // Sort by creation time desc
        loadedSessions.sort((a, b) => b.createdAt - a.createdAt);
        setSessions(loadedSessions);

        // Restore active session or default to first
        const storedActiveId = localStorage.getItem('active_session_id');
        if (storedActiveId && loadedSessions.find(s => s.id === storedActiveId)) {
            setActiveSessionId(storedActiveId);
        } else {
            setActiveSessionId(loadedSessions[0].id);
        }

        setIsDataLoaded(true);
        addLog("系统初始化完成", 'success');
    };

    initData();
  }, []);

  // Track active session ID in local storage for convenience
  useEffect(() => {
    if (activeSessionId) {
        localStorage.setItem('active_session_id', activeSessionId);
    }
  }, [activeSessionId]);

  // Derived State
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const activeAssistant = INITIAL_ASSISTANTS.find(a => a.id === activeSession?.assistantId) || INITIAL_ASSISTANTS[0];

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: '新对话',
      messages: [],
      assistantId: 'nano-banana', 
      createdAt: Date.now()
    };
    
    // Save to DB and State
    saveSessionToDB(newSession);
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    
    addLog("创建新对话", 'info');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    // Delete from DB
    deleteSessionFromDB(id);

    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    
    if (activeSessionId === id) {
      if (newSessions.length > 0) {
        setActiveSessionId(newSessions[0].id);
      } else {
        // If we deleted the last one, create a new one immediately
        handleNewChat();
      }
    }
    addLog("删除对话会话", 'warning');
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === id) {
          const updated = { ...s, title: newTitle };
          saveSessionToDB(updated); // Sync to DB
          return updated;
      }
      return s;
    }));
  };

  const updateActiveSessionMessages = (newMessages: Message[], newTitle?: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const updated = { 
          ...s, 
          messages: newMessages,
          title: newTitle || s.title
        };
        saveSessionToDB(updated); // Sync to DB
        return updated;
      }
      return s;
    }));
  };

  const updateActiveSessionAssistant = (assistantId: string) => {
     setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
            const updated = { ...s, assistantId };
            saveSessionToDB(updated); // Sync to DB
            return updated;
        } 
        return s;
      }));
      setShowAssistantMenu(false);
      addLog(`切换模型为: ${assistantId}`, 'info');
  };

  const processMessage = async (
    text: string, 
    attachments: Attachment[], 
    history: Message[], 
    shouldAutoTitle: boolean,
    options?: { aspectRatio?: string, generationCount: number }
  ) => {
    
    // Create User Message
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      parts: [
        ...(text ? [{ text }] : []),
        ...attachments.map(a => ({
          inlineData: { mimeType: a.mimeType, data: a.data }
        }))
      ],
      timestamp: Date.now()
    };

    const messagesWithUser = [...history, newUserMsg];
    
    let newTitle = undefined;
    if (shouldAutoTitle && history.length === 0) {
      newTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
    }

    updateActiveSessionMessages(messagesWithUser, newTitle);
    setIsLoading(true);

    try {
      const numberOfGenerations = options?.generationCount || generationCount; 
      addLog(`开始任务: 生成 ${numberOfGenerations} 张图片, 模型: ${activeAssistant.model}`, 'info');
      
      const config: any = {};
      const targetAspectRatio = options?.aspectRatio || aspectRatio;
      if (targetAspectRatio && targetAspectRatio !== 'Default') {
        config.imageConfig = { aspectRatio: targetAspectRatio };
        addLog(`应用参数: 比例 ${targetAspectRatio}`, 'info');
      }

      // Execute generations in parallel with individual logging
      const promptPromises = Array.from({ length: numberOfGenerations }).map(async (_, i) => {
         addLog(`正在发起第 ${i + 1}/${numberOfGenerations} 个请求...`, 'info');
         try {
             const res = await generateContent(
                text,
                attachments.map(a => ({ mimeType: a.mimeType, data: a.data })),
                activeAssistant.model,
                undefined, // Use environment API key implicitly
                baseUrl,
                config, // Pass aspect ratio config
                activeAssistant.systemInstruction
            );
            addLog(`✅ 第 ${i + 1} 个请求成功返回`, 'success');
            return res;
         } catch (e: any) {
             const errMsg = e.message || e.toString();
             addLog(`❌ 第 ${i + 1} 个请求失败: ${errMsg}`, 'error');
             throw e;
         }
      });

      const results = await Promise.allSettled(promptPromises);
      
      const combinedParts: MessagePart[] = [];
      const errors: string[] = [];

      results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
              const imageOnlyParts = result.value.filter(p => p.inlineData);
              if (imageOnlyParts.length === 0) {
                  addLog(`⚠️ 请求 ${idx+1} 返回了结果但没有包含图片`, 'warning');
              }
              combinedParts.push(...imageOnlyParts);
          } else {
              errors.push(result.reason?.message || "Unknown error");
          }
      });

      if (combinedParts.length === 0 && errors.length > 0) {
          throw new Error(errors[0]); // Throw the first error to be caught below
      }

      // Handle partial success (some images generated, some failed)
      if (combinedParts.length > 0 && errors.length > 0) {
          const uniqueErrors = Array.from(new Set(errors));
          const errorNote = `⚠️ ${errors.length}张生成失败: ${uniqueErrors.map(e => {
             if (e.includes('SAFETY')) return '内容拦截';
             if (e.includes('RECITATION')) return '版权限制';
             return '未知错误';
          }).join(', ')}`;
          combinedParts.push({ text: errorNote });
          addLog(`任务部分完成，${errors.length} 个失败`, 'warning');
      } else {
          addLog(`任务全部完成，共生成 ${combinedParts.length} 张图片`, 'success');
      }

      const newModelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: Role.MODEL,
        parts: combinedParts,
        timestamp: Date.now()
      };

      updateActiveSessionMessages([...messagesWithUser, newModelMsg]);

    } catch (error: any) {
      console.error("Chat Error:", error);
      
      const errString = error.toString();
      const errStatus = error.status || error.code;
      const errDetails = error.message || '';
      
      addLog(`❌ 任务彻底失败: ${errDetails}`, 'error');

      let errorMessage = "生成失败，请重试。";
      let detailedReason = "";

      // Detailed Error Mapping
      if (errDetails.includes('FINISH_SAFETY')) {
          errorMessage = `🚫 内容敏感，已拦截`;
          detailedReason = "API 返回 FINISH_SAFETY，触发了安全过滤器。";
      } 
      else if (errDetails.includes('FINISH_RECITATION') || errDetails.includes('copyright')) {
          errorMessage = `©️ 涉及版权，无法生成`;
          detailedReason = "API 返回 FINISH_RECITATION，检测到潜在的版权内容。";
      }
      else if (errDetails.includes('PROMPT_BLOCKED')) {
          errorMessage = `🛑 提示词违规`;
          detailedReason = "API 直接拦截了提示词 (PROMPT_BLOCKED)。";
      }
      else if (errDetails.includes('NO_CONTENT_RETURNED')) {
          errorMessage = `❓ 生成失败 (API未返回数据)`;
          detailedReason = "API 调用成功但返回了空内容，可能是模型暂时无法处理该请求。";
      }
      else if (errString.includes('403') || errStatus === 403) {
        errorMessage = `❌ 权限拒绝 (403)`;
        detailedReason = "API Key 无效、过期，或该 Key 没有访问此模型的权限。";
      } 
      else if (errString.includes('429') || errStatus === 429 || errDetails.includes('Quota exceeded')) {
         errorMessage = `⚠️ 额度已满 (429)`;
         detailedReason = "API 请求频率过高，触发了配额限制，请稍后重试。";
      }
      else if (errString.includes('500') || errStatus === 500) {
        errorMessage = `🔥 服务器错误 (500)`;
        detailedReason = "Google 服务器内部错误。";
      }
      else if (errString.includes('503') || errStatus === 503) {
        errorMessage = `🐌 服务繁忙 (503)`;
        detailedReason = "Google 服务暂时不可用，可能是负载过高。";
      }
      else if (errDetails.includes('fetch failed')) {
         errorMessage = `🌐 网络连接失败`;
         detailedReason = "无法连接到 API 端点，请检查网络或代理设置。";
      }
      else {
        // Fallback for truly unknown errors
        errorMessage = `❌ 错误: ${errDetails.slice(0, 100)}`;
        detailedReason = `原始错误: ${errDetails}`;
      }

      const errorMsg: Message = {
        id: Date.now().toString(),
        role: Role.MODEL,
        parts: [{ text: `${errorMessage}\n\n🔍 原因: ${detailedReason}` }],
        timestamp: Date.now()
      };
      updateActiveSessionMessages([...messagesWithUser, errorMsg]);

    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (text: string, attachments: Attachment[], options?: { aspectRatio?: string, generationCount: number }) => {
    if (!activeSession) return;
    processMessage(
        text, 
        attachments, 
        activeSession.messages, 
        activeSession.title === 'New Chat' || activeSession.title === '新对话',
        options || { aspectRatio, generationCount }
    );
  };

  const handleEditMessage = (messageId: string, newText: string) => {
    if (!activeSession) return;
    
    const index = activeSession.messages.findIndex(m => m.id === messageId);
    if (index === -1) return;

    const originalMsg = activeSession.messages[index];
    const attachments = originalMsg.parts
      .filter(p => p.inlineData && p.inlineData.data)
      .map(p => ({
        mimeType: p.inlineData!.mimeType,
        data: p.inlineData!.data,
        previewUrl: ''
      }));

    const historyBefore = activeSession.messages.slice(0, index);
    addLog(`编辑消息并重新生成`, 'info');
    processMessage(newText, attachments, historyBefore, false, { aspectRatio, generationCount });
  };

  const handleRegenerateMessage = (messageId: string) => {
    if (!activeSession) return;
    
    let targetUserMsgIndex = activeSession.messages.findIndex(m => m.id === messageId);
    
    if (targetUserMsgIndex === -1) return;

    const targetMsg = activeSession.messages[targetUserMsgIndex];
    if (targetMsg.role === Role.MODEL) {
      targetUserMsgIndex = targetUserMsgIndex - 1;
    }

    if (targetUserMsgIndex < 0) return;

    const userMsg = activeSession.messages[targetUserMsgIndex];
    const attachments = userMsg.parts
      .filter(p => p.inlineData && p.inlineData.data)
      .map(p => ({
        mimeType: p.inlineData!.mimeType,
        data: p.inlineData!.data,
        previewUrl: ''
      }));
    const text = userMsg.parts.find(p => p.text)?.text || '';
    const historyBefore = activeSession.messages.slice(0, targetUserMsgIndex);

    addLog(`重新生成消息`, 'info');
    processMessage(text, attachments, historyBefore, false, { aspectRatio, generationCount });
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!activeSession) return;
    
    const index = activeSession.messages.findIndex(m => m.id === messageId);
    if (index === -1) return;

    let deleteCount = 1;
    if (activeSession.messages[index].role === Role.USER) {
      if (index + 1 < activeSession.messages.length && activeSession.messages[index + 1].role === Role.MODEL) {
        deleteCount = 2;
      }
    }

    const newMessages = [...activeSession.messages];
    newMessages.splice(index, deleteCount);
    
    updateActiveSessionMessages(newMessages);
  };

  const handleSaveSettings = (url: string) => {
    setBaseUrl(url);
    localStorage.setItem('gemini_base_url', url);
    setIsSettingsOpen(false);
    addLog(`更新 API Base URL: ${url}`, 'info');
  };

  if (!isDataLoaded) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-black text-brand-400">
            <Banana size={40} className="animate-bounce" />
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-black overflow-hidden selection:bg-brand-500/30 font-sans">
      
      {/* Sidebar - Desktop */}
      <div className={`${isSidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 relative hidden md:block`}>
        <Sidebar 
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewChat={handleNewChat}
          onSelectSession={setActiveSessionId}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          logs={logs}
          showLogs={showLogs}
          onToggleLogs={() => setShowLogs(!showLogs)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 bg-zinc-950/50">
        
        {/* Header */}
        <div className="h-16 border-b border-zinc-900/80 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur-md z-10 shrink-0">
             
             {/* Left: Mobile Menu & Assistant Selector */}
             <div className="flex items-center gap-3">
               <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-zinc-400 hover:text-zinc-200 md:hidden p-2 -ml-2">
                  <Menu size={20} />
               </button>
               {!isSidebarOpen && (
                 <button onClick={() => setIsSidebarOpen(true)} className="text-zinc-400 hover:text-zinc-200 hidden md:block p-2 -ml-2">
                    <Menu size={20} />
                 </button>
               )}
               
               {/* Assistant Dropdown */}
               <div className="relative">
                 <button 
                    onClick={() => setShowAssistantMenu(!showAssistantMenu)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-900 transition-colors text-zinc-200 text-sm font-medium border border-transparent hover:border-zinc-800"
                 >
                    <span className="text-lg">{activeAssistant.icon}</span>
                    <span className="font-semibold">{activeAssistant.name}</span>
                    <ChevronDown size={14} className="text-zinc-500" />
                 </button>

                 {showAssistantMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowAssistantMenu(false)}></div>
                      <div className="absolute top-full left-0 mt-2 w-72 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-20 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/5">
                        <div className="px-4 py-2 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">切换模型</div>
                        {INITIAL_ASSISTANTS.map(a => (
                          <button
                            key={a.id}
                            onClick={() => updateActiveSessionAssistant(a.id)}
                            className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-zinc-900 transition-colors ${activeSession.assistantId === a.id ? 'bg-zinc-900' : ''}`}
                          >
                             <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-lg border border-zinc-800">
                                {a.icon}
                             </div>
                             <div className="flex flex-col">
                               <span className={`font-semibold ${activeSession.assistantId === a.id ? 'text-brand-400' : 'text-zinc-200'}`}>{a.name}</span>
                               <span className="text-[10px] text-zinc-500 font-mono opacity-70">{a.model}</span>
                             </div>
                             {activeSession.assistantId === a.id && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                             )}
                          </button>
                        ))}
                      </div>
                    </>
                 )}
               </div>
             </div>

             {/* Right: Status */}
             <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isLoading ? 'bg-brand-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse' : 'bg-zinc-800'}`}></div>
             </div>
        </div>
        
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="absolute inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}>
             <div className="h-full w-72 bg-zinc-950 shadow-2xl border-r border-zinc-900" onClick={e => e.stopPropagation()}>
                <Sidebar 
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  onNewChat={() => { handleNewChat(); setIsSidebarOpen(false); }}
                  onSelectSession={(id) => { setActiveSessionId(id); setIsSidebarOpen(false); }}
                  onDeleteSession={handleDeleteSession}
                  onRenameSession={handleRenameSession}
                  onOpenSettings={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); }}
                  onToggleSidebar={() => setIsSidebarOpen(false)}
                  logs={logs}
                  showLogs={showLogs}
                  onToggleLogs={() => setShowLogs(!showLogs)}
                />
             </div>
          </div>
        )}

        {/* Ensure we have an active session before rendering message list */}
        {activeSession && (
             <MessageList 
             messages={activeSession.messages} 
             isLoading={isLoading} 
             activeAssistantName={activeAssistant.name}
             onDeleteMessage={handleDeleteMessage}
             onEditMessage={handleEditMessage}
             onRegenerateMessage={handleRegenerateMessage}
             />
        )}
       
        <InputArea 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          modelName={activeAssistant.model}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          generationCount={generationCount}
          setGenerationCount={setGenerationCount}
        />
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        initialBaseUrl={baseUrl}
      />
    </div>
  );
};

export default App;