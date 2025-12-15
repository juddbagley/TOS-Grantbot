import React, { useState, useEffect } from 'react';
import { ApplicationSection } from '../types';
import { Edit2, Copy, MessageSquare, Save, X, RotateCcw, Check, AlignLeft, AlertCircle, Sparkles } from 'lucide-react';
import { refineSectionDraft } from '../services/geminiService';

interface QuestionSectionProps {
  section: ApplicationSection;
  onUpdate: (id: string, newDraft: string) => void;
  onFeedback: (id: string, comment: string, newDraft: string) => void;
  onUndo: (id: string) => void;
}

const QuestionSection: React.FC<QuestionSectionProps> = ({ section, onUpdate, onFeedback, onUndo }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [editText, setEditText] = useState(section.draft);
  const [feedbackText, setFeedbackText] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    setWordCount(section.draft.trim().split(/\s+/).filter(Boolean).length);
  }, [section.draft]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(section.draft);
    // Could add toast notification here
  };

  const handleSaveEdit = () => {
    onUpdate(section.id, editText);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(section.draft);
    setIsEditing(false);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;
    setIsRefining(true);
    try {
      const newDraft = await refineSectionDraft(section.question, section.draft, feedbackText);
      onFeedback(section.id, feedbackText, newDraft);
      setShowFeedbackInput(false);
      setFeedbackText('');
    } catch (e) {
      console.error(e);
      alert("Failed to refine draft");
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group transition-all hover:shadow-md">
      
      {/* Question Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 text-lg">{section.question}</h3>
      </div>

      <div className="flex relative">
        {/* Main Content Area */}
        <div className="flex-1 p-6">
          
          {isEditing ? (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-2 text-xs text-slate-400 border-b border-slate-100 pb-2">
                <AlignLeft className="w-3 h-3" />
                <span>Editing Mode</span>
                <span className="ml-auto">{editText.trim().split(/\s+/).filter(Boolean).length} words</span>
              </div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                spellCheck={true}
                className="w-full h-64 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-y font-sans text-slate-700 leading-relaxed text-base"
              />
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={handleSaveEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
                <button 
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {section.isGenerating ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-100 rounded w-full"></div>
                  <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                </div>
              ) : (
                <>
                  <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {section.draft}
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="text-xs text-slate-400 font-medium">
                      {wordCount} words
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditText(section.draft);
                          setIsEditing(true);
                          setShowFeedbackInput(false);
                        }}
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors tooltip"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setShowFeedbackInput(!showFeedbackInput);
                          setIsEditing(false);
                        }}
                        className={`p-2 rounded-lg transition-colors ${showFeedbackInput ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50'}`}
                        title="Give Feedback"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleCopy}
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Copy to Clipboard"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Feedback Input Area */}
          {showFeedbackInput && !isEditing && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-100 animate-slide-up">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Refine with AI
                </h4>
                <button onClick={() => setShowFeedbackInput(false)} className="text-yellow-600 hover:text-yellow-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="E.g., Make it more formal, emphasize the community impact, shorten it by 10%..."
                className="w-full p-3 border border-yellow-200 rounded-lg bg-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none text-sm text-slate-700 min-h-[80px]"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={handleSubmitFeedback}
                  disabled={isRefining || !feedbackText.trim()}
                  className="flex items-center gap-2 px-4 py-1.5 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                >
                  {isRefining ? 'Refining...' : 'Update Response'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Comment Bubble / History Indicator */}
        {section.lastFeedback && (
          <div className="absolute right-0 top-20 translate-x-[90%] hover:translate-x-0 transition-transform duration-300 z-10 w-64">
             <div className="bg-yellow-50 border border-yellow-200 shadow-sm p-3 rounded-l-xl rounded-r-none relative group/comment cursor-pointer">
                <div className="absolute -left-3 top-4 w-3 h-6 bg-yellow-50 border-y border-l border-yellow-200 rounded-l-full flex items-center justify-center">
                    <MessageSquare className="w-3 h-3 text-yellow-600" />
                </div>
                <div className="text-xs text-yellow-800 mb-2 font-medium">Last Feedback:</div>
                <p className="text-sm text-slate-700 italic mb-3">"{section.lastFeedback.text}"</p>
                <button 
                  onClick={() => onUndo(section.id)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 hover:underline w-full justify-end"
                >
                  <RotateCcw className="w-3 h-3" />
                  Undo Change
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionSection;
