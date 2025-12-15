import React, { useRef, useState } from 'react';
import { ApplicationSection, ComparativeAnalysis, FeedbackComment, ContextItem } from '../types';
import { generateSectionDraft } from '../services/geminiService';
import QuestionSection from './QuestionSection';
import { Upload, Plus, FileText, Loader2, BookOpen } from 'lucide-react';
// @ts-ignore
import mammoth from 'mammoth';

interface ApplyViewProps {
  analysis: ComparativeAnalysis | null;
  contextText: string;
  setContextText: (text: string) => void;
  sections: ApplicationSection[];
  setSections: React.Dispatch<React.SetStateAction<ApplicationSection[]>>;
  contextItems: ContextItem[];
}

const ApplyView: React.FC<ApplyViewProps> = ({ 
  analysis, 
  contextText, 
  setContextText, 
  sections, 
  setSections,
  contextItems
}) => {
  const [newQuestion, setNewQuestion] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- File Extraction Logic (Shared Pattern) ---
  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    // Dynamic import to avoid initialization crashes
    // @ts-ignore
    const pdfjsModule = await import('pdfjs-dist');
    // Robustly handle export structure (Namespace vs Default)
    const pdfjs = pdfjsModule.default || pdfjsModule;

    if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
    }

    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // @ts-ignore
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text;
  };

  const extractDocxText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractPdfText(file);
      } else if (file.name.endsWith('.docx')) {
        text = await extractDocxText(file);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.rtf')) {
        text = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsText(file);
        });
      } else {
        alert('Unsupported file type');
        return;
      }
      setContextText(contextText + (contextText ? '\n\n' : '') + text);
    } catch (err) {
      console.error(err);
      alert('Failed to read file');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    const id = crypto.randomUUID();
    const section: ApplicationSection = {
      id,
      question: newQuestion,
      draft: '',
      lastFeedback: null,
      isGenerating: true,
    };

    setSections(prev => [...prev, section]);
    setNewQuestion('');

    try {
      // Pass the global contextItems here
      const draft = await generateSectionDraft(section.question, contextText, analysis, contextItems);
      setSections(prev => prev.map(s => s.id === id ? { ...s, draft, isGenerating: false } : s));
    } catch (error) {
      setSections(prev => prev.map(s => s.id === id ? { ...s, draft: "Error generating draft.", isGenerating: false } : s));
    }
  };

  const handleUpdateDraft = (id: string, newDraft: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, draft: newDraft } : s));
  };

  const handleFeedback = (id: string, commentText: string, newDraft: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        draft: newDraft,
        lastFeedback: {
          id: crypto.randomUUID(),
          text: commentText,
          timestamp: new Date(),
          originalDraft: s.draft
        }
      };
    }));
  };

  const handleUndo = (id: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== id || !s.lastFeedback) return s;
      return {
        ...s,
        draft: s.lastFeedback.originalDraft,
        lastFeedback: null
      };
    }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {/* Header / Intro */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Drafter</h2>
        <p className="text-slate-500 mb-6">
          Upload guidelines and add questions. The AI will draft responses using the context you provide combined with the winning insights from the Grant Library.
        </p>
        
        {contextItems.length > 0 && (
             <div className="mb-6 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2 text-sm text-emerald-700">
                <BookOpen className="w-4 h-4" />
                <span>Incorporating {contextItems.length} sources from Global Knowledge Base.</span>
             </div>
        )}

        {/* Context Upload Area */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
          <div className="flex justify-between items-center mb-3">
             <h3 className="font-semibold text-slate-700 flex items-center gap-2">
               <FileText className="w-4 h-4 text-brand-500" />
               Current Application Guidelines
             </h3>
             <button 
               onClick={() => fileInputRef.current?.click()}
               disabled={isProcessingFile}
               className="text-sm text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all"
             >
               {isProcessingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
               Upload Documents
             </button>
             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.docx,.txt" />
          </div>
          
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            placeholder="Paste application specific guidelines here..."
            className="w-full h-32 p-3 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-y"
          />
        </div>

        {/* Add Question Input */}
        <form onSubmit={handleAddQuestion} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Enter an application question (e.g., 'Describe the target population')"
              className="w-full pl-4 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={!newQuestion.trim() || !contextText.trim()}
            className="px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Generate Draft
          </button>
        </form>
        {!contextText.trim() && (
          <p className="text-xs text-amber-600 mt-2 ml-1 flex items-center gap-1">
             <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
             Add application guidelines first to generate high-quality drafts.
          </p>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {sections.map((section) => (
          <QuestionSection 
            key={section.id} 
            section={section} 
            onUpdate={handleUpdateDraft}
            onFeedback={handleFeedback}
            onUndo={handleUndo}
          />
        ))}
        {sections.length === 0 && (
          <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No questions added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplyView;