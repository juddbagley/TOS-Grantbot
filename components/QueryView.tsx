import React, { useState, useEffect, useRef } from 'react';
import { GrantApplication, ContextItem } from '../types';
import { Send, Bot, User, AlertCircle, Loader2 } from 'lucide-react';
import { createGrantChat } from '../services/geminiService';
// @ts-ignore
import { Chat } from '@google/genai';

interface QueryViewProps {
  grants: GrantApplication[];
  contextItems: ContextItem[];
  onSwitchToUpload: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

const QueryView: React.FC<QueryViewProps> = ({ grants, contextItems, onSwitchToUpload }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'welcome', 
      role: 'model', 
      content: 'I have analyzed the grant applications you uploaded. Ask me anything about their content, outcomes, budgets, or locations.' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSession = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat session when grants or context change
  useEffect(() => {
    if (grants.length > 0) {
      chatSession.current = createGrantChat(grants, contextItems);
      // Optional: Add a system message indicating context update if messages already exist
      if (messages.length > 1 && contextItems.length > 0) {
          // Silent update of the session, no need to spam the user unless desired
      }
    }
  }, [grants, contextItems]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatSession.current) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatSession.current.sendMessage({ message: userMessage.content });
      const text = response.text;
      
      const aiMessage: Message = { 
        id: crypto.randomUUID(), 
        role: 'model', 
        content: text || "I couldn't generate a response." 
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'model', 
        content: "Sorry, I encountered an error processing your request." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (grants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="bg-amber-50 p-6 rounded-full mb-6">
          <AlertCircle className="w-12 h-12 text-amber-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">No Data Available</h3>
        <p className="text-slate-500 max-w-md text-center mb-8">
          Please upload or add grant applications in the Upload tab before querying the AI.
        </p>
        <button
          onClick={onSwitchToUpload}
          className="px-6 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          Go to Upload Tab
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[600px] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-lg text-brand-600">
            <Bot className="w-5 h-5" />
            </div>
            <div>
            <h3 className="font-semibold text-slate-800">Grant Analyst AI</h3>
            <p className="text-xs text-slate-500">{grants.length} applications loaded</p>
            </div>
        </div>
        {contextItems.length > 0 && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                {contextItems.length} Context Sources Active
            </span>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1
              ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-brand-100 text-brand-600'}
            `}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`
              p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed
              ${msg.role === 'user' 
                ? 'bg-slate-800 text-white rounded-tr-none' 
                : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'}
            `}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-4">
             <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 bg-brand-100 text-brand-600">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              <span className="text-sm text-slate-400">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the grants (e.g., 'What was the total requested amount?')"
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default QueryView;