import React, { useState, useEffect, useRef } from 'react';
import { useQueryStore } from '../store/query.store';
import { useRAGQuery } from '../hooks/useRAGQuery';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { marked } from 'marked';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  BookOpen,
  Filter,
  CheckCircle
} from 'lucide-react';

export const Copilot: React.FC = () => {
  const [input, setInput] = useState('');
  const chatHistory = useQueryStore((state) => state.chatHistory);
  const clearChat = useQueryStore((state) => state.clearChat);
  const { askQuestion, loading } = useRAGQuery();

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Filters state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>([]);
  const [equipmentFilter, setEquipmentFilter] = useState('');

  // Voice Input hook
  const { isListening, toggleListening, isSupported } = useVoiceInput((transcript) => {
    setInput(transcript);
  });

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const queryText = input;
    setInput('');

    const filters: any = {};
    if (selectedDocTypes.length > 0) filters.docTypes = selectedDocTypes;
    if (equipmentFilter) filters.equipmentTags = [equipmentFilter];

    await askQuestion(queryText, filters);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setInput(suggestion);
    // Submit in next tick
    setTimeout(() => {
      const btn = document.getElementById('chat-send-btn');
      if (btn) btn.click();
    }, 100);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const docTypeOptions = ['PID', 'SOP', 'WorkOrder', 'InspectionReport', 'OEMManual', 'IncidentReport'];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#0A0E17] overflow-hidden relative">
      
      {/* Sidebar Filter Panel */}
      {showFilters && (
        <aside className="w-72 border-r border-slate-800 glass-panel p-5 flex flex-col gap-5 z-20">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Retrieval Filters</h3>
            <button onClick={() => setShowFilters(false)} className="text-xs text-slate-500 hover:text-slate-300">Close</button>
          </div>

          {/* Doc Type Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Scope</label>
            <div className="flex flex-col gap-1.5">
              {docTypeOptions.map((type) => {
                const checked = selectedDocTypes.includes(type);
                return (
                  <label key={type} className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) {
                          setSelectedDocTypes(selectedDocTypes.filter((t) => t !== type));
                        } else {
                          setSelectedDocTypes([...selectedDocTypes, type]);
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-sky-500"
                    />
                    {type}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Equipment Tag Scoping */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset Scoping</label>
            <input
              type="text"
              value={equipmentFilter}
              onChange={(e) => setEquipmentFilter(e.target.value)}
              placeholder="e.g. Pump P-101"
              className="w-full glass-input text-xs text-slate-300"
            />
          </div>
        </aside>
      )}

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Chat Window Toolbar */}
        <div className="h-12 border-b border-slate-800/80 px-6 flex items-center justify-between glass-panel">
          <div className="flex items-center gap-3">
            <Sparkles size={16} className="text-sky-400" />
            <span className="text-xs font-semibold text-slate-300">Grounded Domain Answering</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg border text-slate-400 hover:text-slate-200 transition-colors ${
                showFilters ? 'bg-slate-800 border-slate-700' : 'bg-transparent border-slate-800'
              }`}
            >
              <Filter size={14} />
            </button>
            <button onClick={clearChat} className="text-xs text-slate-500 hover:text-slate-300">Clear chat</button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400 shadow-xl shadow-sky-500/5">
                <Sparkles size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Welcome to IKIP Expert Copilot</h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Ask me about operating procedures (SOPs), equipment status history, local safety codes, or plant downtime root causes.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full pt-4">
                {[
                  "What is the start-up sequence for pump P-101?",
                  "Show safety distances under OISD-118",
                  "Explain failure mode of Compressor K-202",
                  "What actions were taken for INC-2023-089?"
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggestionClick(q)}
                    className="p-3 text-left rounded-xl glass-card text-xs text-slate-300 hover:text-slate-100"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatHistory.map((msg, index) => {
              const isBot = msg.sender === 'bot';
              return (
                <div
                  key={index}
                  className={`flex gap-4 ${isBot ? 'bg-slate-900/35 p-5 rounded-2xl border border-slate-800/40' : ''}`}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-md">
                    {isBot ? (
                      <div className="bg-sky-500/10 text-sky-400 w-full h-full flex items-center justify-center rounded-lg">AI</div>
                    ) : (
                      <div className="bg-slate-700 text-slate-300 w-full h-full flex items-center justify-center rounded-lg">U</div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3 overflow-hidden">
                    {/* Message Body */}
                    {isBot ? (
                      msg.text ? (
                        <div 
                          className="prose prose-invert prose-xs text-sm text-slate-300 leading-relaxed max-w-none" 
                          dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) as string }} 
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping"></span>
                          Generating answer...
                        </div>
                      )
                    ) : (
                      <p className="text-sm text-slate-100 font-medium">{msg.text}</p>
                    )}

                    {/* Citations & Source Tags */}
                    {isBot && msg.sources && msg.sources.length > 0 && (
                      <div className="pt-4 border-t border-slate-800/60 mt-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <BookOpen size={12} />
                          Supporting Evidence & Sources:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-[10px] text-slate-300">
                              <span className="font-semibold text-sky-400">{s.title}</span>
                              <span className="text-slate-500">|</span>
                              <span className="text-slate-400">Page {s.pageNumbers?.join(', ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Confidence Meter */}
                    {isBot && msg.confidence && (
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <CheckCircle size={10} className="text-sky-400" />
                          Grounded Confidence: 
                          <span className={`font-bold uppercase ${
                            msg.confidence === 'High' ? 'text-emerald-400' : msg.confidence === 'Medium' ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {msg.confidence}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Suggested follow-ups */}
                    {isBot && msg.suggestedQueries && msg.suggestedQueries.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1.5">
                        {msg.suggestedQueries.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(q)}
                            className="px-2.5 py-1 rounded-full bg-slate-800/40 hover:bg-slate-800 hover:text-sky-400 border border-slate-700/50 text-[10px] text-slate-400 transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Controls */}
        <div className="p-4 border-t border-slate-800/80 glass-panel">
          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            
            {/* Input Bar */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about plant maintenance or regulations..."
              className="flex-1 glass-input py-3.5 pr-24 text-sm bg-slate-950/80"
              disabled={loading}
            />

            {/* Input buttons overlay inside input bar */}
            <div className="absolute right-3 flex gap-1.5">
              
              {/* Mic Icon */}
              {isSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2 rounded-lg transition-colors ${
                    isListening ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-transparent text-slate-400 hover:text-slate-200'
                  }`}
                  title="Speak to Ask"
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}

              {/* Submit Arrow */}
              <button
                type="submit"
                id="chat-send-btn"
                disabled={loading || !input.trim()}
                className="p-2 rounded-lg bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
export default Copilot;
