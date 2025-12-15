import React, { useState, useRef } from 'react';
import { GrantApplication, Outcome, GrantLocation } from '../types';
import { Plus, Trash2, FileText, Check, X, AlertTriangle, DollarSign, Trophy, Frown, MapPin, Upload, Loader2 } from 'lucide-react';
// @ts-ignore
import mammoth from 'mammoth';

interface GrantFormProps {
  grants: GrantApplication[];
  onAdd: (grant: GrantApplication) => void;
  onRemove: (id: string) => void;
  onLoadDemo: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

const AVAILABLE_LOCATIONS: GrantLocation[] = ['TOSA SLC', 'TOSV SLC', 'TOSA Denver'];

const GrantForm: React.FC<GrantFormProps> = ({ 
  grants, onAdd, onRemove, onLoadDemo, onAnalyze, isAnalyzing 
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [outcome, setOutcome] = useState<Outcome>(Outcome.WON);
  const [amountRequested, setAmountRequested] = useState('');
  const [amountAwarded, setAmountAwarded] = useState('');
  const [locations, setLocations] = useState<GrantLocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleLocation = (loc: GrantLocation) => {
    setLocations(prev => 
      prev.includes(loc) 
        ? prev.filter(l => l !== loc) 
        : [...prev, loc]
    );
  };

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
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.name.endsWith('.docx')
      ) {
        text = await extractDocxText(file);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.rtf')) {
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      } else {
        alert('Unsupported file type. Please upload PDF, DOCX, TXT, or RTF.');
        return;
      }

      if (text) {
        const cleanText = text.replace(/\s+/g, ' ').trim();
        setContent(cleanText);
        if (!title) {
            const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.');
            setTitle(fileNameWithoutExt);
        }
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      alert('Failed to extract text from file.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    onAdd({
      id: crypto.randomUUID(),
      title,
      content,
      outcome,
      amountRequested: amountRequested ? parseFloat(amountRequested) : undefined,
      amountAwarded: outcome === Outcome.WON && amountAwarded ? parseFloat(amountAwarded) : 0,
      locations: locations.length > 0 ? locations : undefined
    });

    setTitle('');
    setContent('');
    setAmountRequested('');
    setAmountAwarded('');
    setLocations([]);
    setOutcome(Outcome.WON);
    setShowForm(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      
      {/* Intro Section */}
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">The Other Side's Grantbot.</h2>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
          Provide past grant applications for analysis. Indicate whether or not each application was successful, the amount rewarded versus the amount requested, and the target location.
        </p>
      </div>

      {/* Grant List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" />
            Uploaded Submissions ({grants.length})
          </h3>
          {grants.length === 0 && (
             <button 
             onClick={onLoadDemo}
             className="text-sm text-brand-600 hover:text-brand-700 font-medium px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
           >
             Load Demo Data
           </button>
          )}
        </div>

        {grants.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p>No grants added yet.</p>
            <p className="text-sm mt-2">Add manually or load demo data to start.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {grants.map((grant) => (
              <li key={grant.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-start group">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1 ${
                      grant.outcome === Outcome.WON 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {grant.outcome === Outcome.WON ? <Trophy className="w-3 h-3" /> : <Frown className="w-3 h-3" />}
                      {grant.outcome}
                    </span>
                    <h4 className="font-medium text-slate-900">{grant.title}</h4>
                    {grant.amountRequested && (
                      <span className="text-xs text-slate-400 font-mono border-l border-slate-200 pl-3">
                        ${grant.amountRequested.toLocaleString()} req
                        {grant.outcome === Outcome.WON && grant.amountAwarded !== undefined && (
                           <> / ${grant.amountAwarded.toLocaleString()} awarded</>
                        )}
                      </span>
                    )}
                  </div>
                  {grant.locations && grant.locations.length > 0 && (
                    <div className="flex gap-2 mb-2">
                      {grant.locations.map(loc => (
                        <span key={loc} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                          <MapPin className="w-3 h-3" />
                          {loc}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-slate-500 line-clamp-2 pr-8">{grant.content}</p>
                </div>
                <button 
                  onClick={() => onRemove(grant.id)}
                  className="text-slate-300 hover:text-rose-500 p-2 opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Remove grant"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showForm ? (
          <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-lg border border-slate-200 animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800">New Entry</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Outcome Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Outcome</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`
                    flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all
                    ${outcome === Outcome.WON 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm ring-1 ring-emerald-500' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}
                  `}>
                    <input 
                      type="radio" 
                      name="outcome" 
                      value={Outcome.WON}
                      checked={outcome === Outcome.WON}
                      onChange={() => setOutcome(Outcome.WON)}
                      className="hidden"
                    />
                    <Trophy className="w-5 h-5" />
                    <span className="font-semibold">Won</span>
                  </label>

                  <label className={`
                    flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all
                    ${outcome === Outcome.LOST 
                      ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm ring-1 ring-rose-500' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}
                  `}>
                    <input 
                      type="radio" 
                      name="outcome" 
                      value={Outcome.LOST}
                      checked={outcome === Outcome.LOST}
                      onChange={() => setOutcome(Outcome.LOST)}
                      className="hidden"
                    />
                    <Frown className="w-5 h-5" />
                    <span className="font-semibold">Lost</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                    placeholder="e.g. Community Garden Initiative"
                  />
                </div>

                {/* Conditional Inputs for Amounts */}
                {outcome === Outcome.WON && (
                  <>
                     <div className="animate-fade-in">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount Requested</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="number"
                          required
                          min="0"
                          value={amountRequested}
                          onChange={e => setAmountRequested(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                          placeholder="50000"
                        />
                      </div>
                    </div>
                    <div className="animate-fade-in">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount Awarded</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-emerald-500" />
                        <input
                          type="number"
                          required
                          min="0"
                          value={amountAwarded}
                          onChange={e => setAmountAwarded(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 rounded-lg border border-emerald-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                          placeholder="50000"
                        />
                      </div>
                    </div>
                  </>
                )}

                {outcome === Outcome.LOST && (
                  <div className="animate-fade-in md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount Requested</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        required
                        min="0"
                        value={amountRequested}
                        onChange={e => setAmountRequested(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                        placeholder="50000"
                      />
                    </div>
                  </div>
                )}
                
                {/* Location Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Target Location(s)</label>
                  <div className="flex flex-wrap gap-3">
                    {AVAILABLE_LOCATIONS.map((loc) => (
                      <label 
                        key={loc}
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all select-none
                          ${locations.includes(loc)
                            ? 'bg-blue-50 border-blue-300 text-blue-700 ring-1 ring-blue-300'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={locations.includes(loc)}
                          onChange={() => toggleLocation(loc)}
                          className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                        />
                        <span className="text-sm font-medium">{loc}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Application Content
                </label>
                
                {/* File Upload Area */}
                <div className="mb-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                      relative group cursor-pointer border-2 border-dashed rounded-xl p-6 transition-all text-center
                      ${isProcessingFile ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-300 hover:border-brand-400 hover:bg-brand-50'}
                    `}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.docx,.txt,.rtf"
                      className="hidden"
                    />
                    
                    {isProcessingFile ? (
                      <div className="flex flex-col items-center justify-center py-2 text-slate-500">
                         <Loader2 className="w-8 h-8 animate-spin mb-2 text-brand-500" />
                         <span className="font-medium">Extracting text...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2">
                        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3 group-hover:bg-white group-hover:text-brand-500 transition-colors shadow-sm">
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">Click to upload original document</p>
                        <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, TXT, RTF</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Text Area (Editable after upload) */}
                <div className="relative">
                  <div className="absolute top-2 right-2 text-xs text-slate-400 pointer-events-none bg-white/80 px-2 rounded">
                    {content ? `${content.length} chars` : 'Or paste text below'}
                  </div>
                  <textarea
                    required
                    rows={8}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all resize-y text-sm leading-relaxed"
                    placeholder="Paste the executive summary, methodology, or impact statement here..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingFile}
                  className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all group"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Add Application Manually</span>
          </button>
        )}

        <button
          onClick={onAnalyze}
          disabled={grants.length < 2 || isAnalyzing || showForm}
          className={`
            flex items-center justify-center gap-2 p-4 rounded-xl font-bold text-white shadow-lg transition-all
            ${grants.length < 2 || showForm
              ? 'bg-slate-300 cursor-not-allowed' 
              : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:shadow-xl hover:scale-[1.02]'}
          `}
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Generate Analysis Report
            </>
          )}
        </button>
      </div>
      
      {grants.length < 2 && grants.length > 0 && !showForm && (
        <p className="text-center text-sm text-amber-600 bg-amber-50 p-2 rounded-lg inline-block mx-auto w-full">
          <AlertTriangle className="inline w-4 h-4 mr-2 mb-0.5" />
          Add at least 2 applications to perform a comparative analysis.
        </p>
      )}

    </div>
  );
};

export default GrantForm;