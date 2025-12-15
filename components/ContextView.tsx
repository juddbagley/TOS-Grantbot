import React, { useState, useRef } from 'react';
import { ContextItem } from '../types';
import { Plus, Trash2, Link as LinkIcon, FileText, Upload, Loader2, Book, Globe } from 'lucide-react';
// @ts-ignore
import mammoth from 'mammoth';

interface ContextViewProps {
  items: ContextItem[];
  onAdd: (item: ContextItem) => void;
  onRemove: (id: string) => void;
}

const ContextView: React.FC<ContextViewProps> = ({ items, onAdd, onRemove }) => {
  const [activeTab, setActiveTab] = useState<'links' | 'files'>('links');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- File Extraction Logic (Duplicated for isolation) ---
  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
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

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkUrl.trim() || !newLinkTitle.trim()) return;

    onAdd({
      id: crypto.randomUUID(),
      type: 'link',
      title: newLinkTitle,
      content: newLinkUrl,
      dateAdded: new Date().toISOString()
    });
    setNewLinkUrl('');
    setNewLinkTitle('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
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

      if (text) {
        onAdd({
          id: crypto.randomUUID(),
          type: 'file',
          title: file.name,
          content: text.replace(/\s+/g, ' ').trim(),
          dateAdded: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to read file');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const links = items.filter(i => i.type === 'link');
  const files = items.filter(i => i.type !== 'link');

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Intro */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Book className="w-6 h-6 text-brand-600" />
            Knowledge Base
        </h2>
        <p className="text-slate-500">
          Add authoritative sources, statistics (e.g. homelessness, substance abuse), and leadership presentations here. 
          The AI will reference this context across all features, ensuring your drafts and queries are always up-to-date.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Links Section */}
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    External Reference Links
                 </h3>
                 <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-600">{links.length} saved</span>
            </div>
            
            <form onSubmit={handleLinkSubmit} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div>
                    <input
                        type="text"
                        value={newLinkTitle}
                        onChange={e => setNewLinkTitle(e.target.value)}
                        placeholder="Source Title (e.g. 2024 HUD Report)"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>
                <div>
                    <input
                        type="url"
                        value={newLinkUrl}
                        onChange={e => setNewLinkUrl(e.target.value)}
                        placeholder="https://example.org/stats"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>
                <button 
                    type="submit"
                    disabled={!newLinkUrl.trim() || !newLinkTitle.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                    <Plus className="w-4 h-4" /> Add Source Link
                </button>
            </form>

            <div className="space-y-2">
                {links.map(link => (
                    <div key={link.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-start group hover:border-emerald-200 transition-colors">
                        <div className="overflow-hidden">
                            <h4 className="font-semibold text-slate-800 text-sm truncate">{link.title}</h4>
                            <a href={link.content} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline truncate block">
                                {link.content}
                            </a>
                        </div>
                        <button 
                            onClick={() => onRemove(link.id)}
                            className="text-slate-300 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {links.length === 0 && (
                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <p className="text-sm">No links added yet.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Files Section */}
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Internal Documents
                 </h3>
                 <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-600">{files.length} saved</span>
            </div>

            <div 
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`
                    bg-white p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors group
                    ${isProcessing ? 'border-slate-300 bg-slate-50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50'}
                `}
            >
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.txt"
                    className="hidden" 
                />
                
                {isProcessing ? (
                     <div className="flex flex-col items-center py-2">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                        <span className="text-xs font-medium text-slate-500">Processing document...</span>
                     </div>
                ) : (
                    <div className="flex flex-col items-center py-2">
                        <div className="p-2 bg-blue-100 rounded-full text-blue-600 mb-2 group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">Upload Presentation / Text</p>
                        <p className="text-xs text-slate-400">PDF, DOCX, TXT</p>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                {files.map(file => (
                    <div key={file.id} className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-start group hover:border-blue-200 transition-colors">
                        <div>
                            <h4 className="font-semibold text-slate-800 text-sm">{file.title}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {file.content.length.toLocaleString()} characters • Added {new Date(file.dateAdded).toLocaleDateString()}
                            </p>
                        </div>
                        <button 
                            onClick={() => onRemove(file.id)}
                            className="text-slate-300 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {files.length === 0 && (
                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <p className="text-sm">No documents uploaded yet.</p>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default ContextView;