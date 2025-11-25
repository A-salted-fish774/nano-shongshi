import React, { useRef, useState, KeyboardEvent, useEffect } from 'react';
import { 
  Plus, 
  Image as ImageIcon, 
  ArrowUp,
  X,
  Mic,
  MicOff,
  Scan,
  Copy,
  Check
} from 'lucide-react';
import { Attachment } from '../types';

interface InputAreaProps {
  onSendMessage: (text: string, attachments: Attachment[], options: { aspectRatio: string, generationCount: number }) => void;
  isLoading: boolean;
  modelName: string;
  // Props for controlled state
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  generationCount: number;
  setGenerationCount: (value: number) => void;
}

const ASPECT_RATIOS = [
  { label: '默认', value: 'Default' },
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
];

const COUNTS = [
  { label: '单图', value: 1 },
  { label: '双图', value: 2 },
  { label: '四图', value: 4 },
];

export const InputArea: React.FC<InputAreaProps> = ({ 
    onSendMessage, 
    isLoading, 
    modelName,
    aspectRatio,
    setAspectRatio,
    generationCount,
    setGenerationCount
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [showCountMenu, setShowCountMenu] = useState(false);

  // Refs for closing menus on click outside
  const ratioMenuRef = useRef<HTMLDivElement>(null);
  const countMenuRef = useRef<HTMLDivElement>(null);
  
  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ratioMenuRef.current && !ratioMenuRef.current.contains(event.target as Node)) {
        setShowRatioMenu(false);
      }
      if (countMenuRef.current && !countMenuRef.current.contains(event.target as Node)) {
        setShowCountMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Initialize Speech Recognition if available
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'zh-CN'; 

        recognition.onresult = (event: any) => {
           let finalTranscript = '';
           for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                 finalTranscript += event.results[i][0].transcript;
              }
           }
           if (finalTranscript) {
              setText(prev => prev + finalTranscript);
           }
        };

        recognition.onend = () => {
           setIsListening(false);
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("此浏览器不支持语音识别。");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch(e) {
        console.error("Speech recognition error", e);
        setIsListening(false);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;
    onSendMessage(text, attachments, { aspectRatio, generationCount });
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
    // Stop listening on send if active
    if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newAttachments: Attachment[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const base64 = await convertFileToBase64(file);
        newAttachments.push({
          mimeType: file.type,
          data: base64,
          previewUrl: URL.createObjectURL(file),
        });
      }
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Content = base64String.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  }

  return (
    <div className="px-6 pb-8 pt-4 w-full max-w-3xl mx-auto font-sans">
      <div 
        className={`relative group bg-zinc-900/90 backdrop-blur-xl rounded-[28px] border transition-all duration-300 ${
          isFocused 
            ? 'border-zinc-700 shadow-[0_8px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-zinc-700/50' 
            : 'border-zinc-800 shadow-xl'
        }`}
      >
        
        {/* Attachment Preview Area */}
        {attachments.length > 0 && (
          <div className="px-5 pt-5 flex gap-3 overflow-x-auto scrollbar-hide">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group/att shrink-0 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-700/50 bg-zinc-950 relative shadow-md">
                    <img 
                    src={att.previewUrl} 
                    alt="attachment" 
                    className="w-full h-full object-cover opacity-90 group-hover/att:opacity-100 transition-opacity"
                    />
                </div>
                <button 
                  onClick={() => removeAttachment(idx)}
                  className="absolute -top-2 -right-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-full p-1 border border-zinc-700 shadow-lg opacity-0 group-hover/att:opacity-100 transition-all scale-90 group-hover/att:scale-100"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isListening ? "正在聆听..." : "与 Nano Banana 对话..."}
          className={`w-full bg-transparent text-zinc-100 placeholder-zinc-500 px-6 py-5 focus:outline-none resize-none min-h-[64px] max-h-[250px] text-[16px] leading-relaxed rounded-[28px] ${isListening ? 'animate-pulse text-brand-400' : ''}`}
          rows={1}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 pb-4 pl-5">
          
          <div className="flex items-center gap-1.5">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full transition-all"
                title="添加媒体"
            >
              <Plus size={20} strokeWidth={2} />
            </button>
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full transition-all hidden sm:block"
                title="上传图片"
            >
              <ImageIcon size={20} strokeWidth={2} />
            </button>
             <button 
                onClick={toggleListening}
                className={`p-2.5 rounded-full transition-all hidden sm:block ${isListening ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                title="语音输入"
            >
              {isListening ? <MicOff size={20} strokeWidth={2} /> : <Mic size={20} strokeWidth={2} />}
            </button>

            {/* Divider */}
            <div className="w-[1px] h-6 bg-zinc-800 mx-1 hidden sm:block"></div>

            {/* Aspect Ratio Selector */}
            <div className="relative" ref={ratioMenuRef}>
              <button 
                onClick={() => { setShowRatioMenu(!showRatioMenu); setShowCountMenu(false); }}
                className={`p-2.5 rounded-full transition-all flex items-center gap-1.5 ${aspectRatio !== 'Default' ? 'text-brand-400 bg-brand-400/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                title="图片比例"
              >
                <Scan size={20} strokeWidth={2} />
                {aspectRatio !== 'Default' && <span className="text-xs font-medium hidden md:inline">{aspectRatio}</span>}
              </button>
              
              {showRatioMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden min-w-[120px] p-1 animate-in slide-in-from-bottom-2 fade-in duration-200 z-20">
                  <div className="text-[10px] text-zinc-500 font-medium px-2 py-1 mb-1 uppercase tracking-wider">选择比例</div>
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => { setAspectRatio(ratio.value); setShowRatioMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between hover:bg-zinc-800 transition-colors ${aspectRatio === ratio.value ? 'bg-zinc-800 text-brand-400' : 'text-zinc-300'}`}
                    >
                      <span>{ratio.label}</span>
                      {aspectRatio === ratio.value && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Generation Count Selector */}
            <div className="relative" ref={countMenuRef}>
              <button 
                onClick={() => { setShowCountMenu(!showCountMenu); setShowRatioMenu(false); }}
                className={`p-2.5 rounded-full transition-all flex items-center gap-1.5 ${generationCount > 1 ? 'text-brand-400 bg-brand-400/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                title="生成数量"
              >
                <Copy size={20} strokeWidth={2} />
                {generationCount > 1 && <span className="text-xs font-medium hidden md:inline">{generationCount}张</span>}
              </button>
              
              {showCountMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden min-w-[120px] p-1 animate-in slide-in-from-bottom-2 fade-in duration-200 z-20">
                  <div className="text-[10px] text-zinc-500 font-medium px-2 py-1 mb-1 uppercase tracking-wider">并发数量</div>
                  {COUNTS.map((count) => (
                    <button
                      key={count.value}
                      onClick={() => { setGenerationCount(count.value); setShowCountMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between hover:bg-zinc-800 transition-colors ${generationCount === count.value ? 'bg-zinc-800 text-brand-400' : 'text-zinc-300'}`}
                    >
                      <span>{count.label}</span>
                      {generationCount === count.value && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <input 
              type="file" 
              multiple 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileSelect}
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleSend}
              disabled={isLoading || (!text && attachments.length === 0)}
              className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center ${
                text || attachments.length > 0
                  ? 'bg-brand-500 text-zinc-950 hover:bg-brand-400 hover:scale-105 shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
                  : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <ArrowUp size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="text-center mt-5 flex items-center justify-center gap-2 opacity-30 hover:opacity-100 transition-opacity duration-500 group cursor-default">
         <span className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase">Model: {modelName}</span>
      </div>
    </div>
  );
};