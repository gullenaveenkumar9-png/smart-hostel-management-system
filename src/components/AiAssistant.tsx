import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, CornerDownLeft } from 'lucide-react';
import { askGeminiAssistant } from '../utils/api';

interface AiAssistantProps {
  userRole: string;
  userId: string;
  userName: string;
}

export default function AiAssistant({ userRole, userId, userName }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ sender: 'ai' | 'user'; text: string; time: string }[]>([
    {
      sender: 'ai',
      text: `Hello ${userName}! I am your Smart Hostel AI Assistant. Ask me anything about room vacancies, your leaves, complaints, payments, or today's mess menu!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Suggestions based on roles
  const studentSuggestions = [
    "Are there any empty rooms available?",
    "What is the mess menu for today?",
    "Check my leave application status.",
    "Do I have any pending fee payments?",
  ];

  const wardenSuggestions = [
    "List students with pending fees",
    "How many empty rooms are there?",
    "Summarize attendance today",
    "List pending complaints",
  ];

  const suggestions = userRole === 'student' ? studentSuggestions : wardenSuggestions;

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: textToSend, time: timeStr };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await askGeminiAssistant(textToSend, userRole, userId, userName);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai' as const,
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai' as const,
          text: "Sorry, I had trouble reaching the server. Please check your Gemini API key configuration in settings.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="ai-assistant-root" className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          id="btn-open-ai"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-5 py-4 bg-blue-600/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-blue-400/30 backdrop-blur-md cursor-pointer"
        >
          <Sparkles className="w-5 h-5 animate-pulse text-yellow-300" />
          <span className="font-semibold text-sm">Ask Hostel AI</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          id="ai-chat-window"
          className="w-[420px] max-w-[95vw] h-[550px] bg-slate-950/80 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300 backdrop-blur-lg"
        >
          {/* Header */}
          <div className="bg-white/5 px-4 py-4 text-white flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/20">
                <Bot className="w-6 h-6 text-yellow-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  Hostel AI Companion
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-emerald-400/20">Live</span>
                </h3>
                <p className="text-[11px] text-slate-400">Gemini 2.5 Flash Powered</p>
              </div>
            </div>
            <button
              id="btn-close-ai"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 text-white font-medium text-xs ${
                    msg.sender === 'user' ? 'bg-blue-600/80 border border-blue-500/30' : 'bg-slate-800 border border-white/10'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className="space-y-1">
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-600/80 text-white rounded-tr-none border border-blue-400/30 backdrop-blur'
                        : 'glass-card border-white/5 text-slate-100 rounded-tl-none whitespace-pre-wrap'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <p className={`text-[9px] text-slate-500 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 max-w-[85%] mr-auto items-start">
                <div className="p-2 rounded-full h-8 w-8 bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 text-white">
                  <Bot className="w-4 h-4 animate-spin text-indigo-400" />
                </div>
                <div className="glass-card border-white/5 px-4 py-2.5 rounded-2xl rounded-tl-none text-xs text-slate-400 flex items-center gap-2">
                  <span className="flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                  <span>AI is searching hostel records...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Preset Chips */}
          <div className="px-3 py-2 bg-white/5 border-t border-white/10 flex gap-1.5 overflow-x-auto scrollbar-thin select-none">
            {suggestions.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSend(sug)}
                className="shrink-0 text-[10px] font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/25 px-2.5 py-1.5 rounded-full transition-all cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Footer Input */}
          <div className="p-3 bg-white/5 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-slate-100"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim()}
              className="p-2.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl disabled:bg-white/5 disabled:text-slate-500 border border-blue-400/20 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
