import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GrantApplication, ComparativeAnalysis, ApplicationSection, ContextItem } from './types';
import { DEMO_GRANTS } from './constants';
import { analyzeGrants } from './services/geminiService';
import GrantForm from './components/GrantForm';
import AnalysisResult from './components/AnalysisResult';
import QueryView from './components/QueryView';
import ApplyView from './components/ApplyView';
import ContextView from './components/ContextView';
import { BarChart3, HelpCircle, UploadCloud, MessageSquare, PenTool, Download, Upload, Loader2, Book } from 'lucide-react';

const STORAGE_KEY = 'grantbloom_data_v1';

const App: React.FC = () => {
  // App State
  const [grants, setGrants] = useState<GrantApplication[]>([]);
  const [analysis, setAnalysis] = useState<ComparativeAnalysis | null>(null);
  const [applyContext, setApplyContext] = useState<string>('');
  const [applySections, setApplySections] = useState<ApplicationSection[]>([]);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  
  // UI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'context' | 'query' | 'apply'>('upload');
  const [isInitialized, setIsInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          if (parsed.grants) setGrants(parsed.grants);
          if (parsed.analysis) setAnalysis(parsed.analysis);
          if (parsed.applyContext) setApplyContext(parsed.applyContext);
          if (parsed.applySections) setApplySections(parsed.applySections);
          if (parsed.contextItems) setContextItems(parsed.contextItems);
        }
      } catch (e) {
        console.error("Failed to load saved data:", e);
        // Don't crash the app if local storage fails
      } finally {
        setIsInitialized(true);
      }
    };
    loadData();
  }, []);

  // Save to LocalStorage on change
  useEffect(() => {
    if (!isInitialized) return;
    try {
      const dataToSave = {
        grants,
        analysis,
        applyContext,
        applySections,
        contextItems
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error("Failed to save data:", e);
    }
  }, [grants, analysis, applyContext, applySections, contextItems, isInitialized]);

  const handleExport = () => {
    const dataToSave = {
      grants,
      analysis,
      applyContext,
      applySections,
      contextItems,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `grantbloom-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        // Simple validation
        if (!Array.isArray(parsed.grants)) throw new Error("Invalid file format: missing grants");

        if (confirm("This will overwrite your current data. Are you sure?")) {
          setGrants(parsed.grants || []);
          setAnalysis(parsed.analysis || null);
          setApplyContext(parsed.applyContext || '');
          setApplySections(parsed.applySections || []);
          setContextItems(parsed.contextItems || []);
          setError(null);
          // Force active tab to upload to show changes
          setActiveTab('upload');
        }
      } catch (err) {
        console.error(err);
        setError("Failed to import data. Please check the file format.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleAddGrant = (grant: GrantApplication) => {
    setGrants(prev => [...prev, grant]);
    setError(null);
  };

  const handleRemoveGrant = (id: string) => {
    setGrants(prev => prev.filter(g => g.id !== id));
    setAnalysis(null);
  };

  const handleAddContextItem = (item: ContextItem) => {
    setContextItems(prev => [...prev, item]);
  };

  const handleRemoveContextItem = (id: string) => {
    setContextItems(prev => prev.filter(i => i.id !== id));
  };

  const handleLoadDemo = () => {
    setGrants(DEMO_GRANTS);
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
    if (grants.length < 1) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await analyzeGrants(grants);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message || "Failed to analyze grants. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAnalysis(null);
    setError(null);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-slate-500 font-medium">Loading GrantBloom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand-100 selection:text-brand-900">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-600 rounded-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">GrantBloom AI</h1>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={handleExport}
               className="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors group relative"
               title="Save / Export Data"
             >
               <Download className="w-5 h-5" />
               <span className="absolute hidden group-hover:block w-32 bg-slate-800 text-white text-xs py-1 px-2 rounded -bottom-8 -left-12 text-center">Save to file</span>
             </button>
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors group relative"
               title="Open / Import Data"
             >
               <Upload className="w-5 h-5" />
               <span className="absolute hidden group-hover:block w-32 bg-slate-800 text-white text-xs py-1 px-2 rounded -bottom-8 -left-12 text-center">Open from file</span>
             </button>
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleImport} 
               className="hidden" 
               accept=".json"
             />
             <div className="h-6 w-px bg-slate-200 mx-1"></div>
             <a href="#" className="text-slate-500 hover:text-brand-600 transition-colors">
               <HelpCircle className="w-5 h-5" />
             </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm inline-flex">
            <button
              onClick={() => setActiveTab('upload')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all
                ${activeTab === 'upload' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
              `}
            >
              <UploadCloud className="w-4 h-4" />
              Upload
            </button>
            <button
              onClick={() => setActiveTab('context')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all
                ${activeTab === 'context' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
              `}
            >
              <Book className="w-4 h-4" />
              Context
            </button>
            <button
              onClick={() => setActiveTab('query')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all
                ${activeTab === 'query' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
              `}
            >
              <MessageSquare className="w-4 h-4" />
              Query
            </button>
            <button
              onClick={() => setActiveTab('apply')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all
                ${activeTab === 'apply' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
              `}
            >
              <PenTool className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-rose-100 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-3 animate-fade-in">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        {activeTab === 'upload' && (
          analysis ? (
            <AnalysisResult analysis={analysis} onReset={handleReset} />
          ) : (
            <GrantForm 
              grants={grants}
              onAdd={handleAddGrant}
              onRemove={handleRemoveGrant}
              onLoadDemo={handleLoadDemo}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
            />
          )
        )}

        {activeTab === 'context' && (
          <ContextView 
            items={contextItems}
            onAdd={handleAddContextItem}
            onRemove={handleRemoveContextItem}
          />
        )}

        {activeTab === 'query' && (
          <QueryView 
            grants={grants} 
            contextItems={contextItems}
            onSwitchToUpload={() => setActiveTab('upload')} 
          />
        )}

        {activeTab === 'apply' && (
          <ApplyView 
            analysis={analysis} 
            contextText={applyContext}
            setContextText={setApplyContext}
            sections={applySections}
            setSections={setApplySections}
            contextItems={contextItems}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} GrantInsight AI. Powered by Google Gemini.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;