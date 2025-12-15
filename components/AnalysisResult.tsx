import React from 'react';
import { ComparativeAnalysis } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend
} from 'recharts';
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, Lightbulb } from 'lucide-react';

interface AnalysisResultProps {
  analysis: ComparativeAnalysis;
  onReset: () => void;
}

const AnalysisResult: React.FC<AnalysisResultProps> = ({ analysis, onReset }) => {
  const sortedThemes = [...analysis.keyThemes].sort((a, b) => b.impactScore - a.impactScore);
  
  // Data for impact chart
  const impactData = sortedThemes.map(t => ({
    name: t.name,
    score: t.impactScore,
    sentiment: t.sentiment
  }));

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Summary */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="text-brand-600" />
          Executive Summary
        </h2>
        <p className="text-slate-700 leading-relaxed text-lg">
          {analysis.executiveSummary}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Winners Section */}
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <h3 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Winning Factors
          </h3>
          <ul className="space-y-3">
            {analysis.winningStrengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-3 bg-white/60 p-3 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <span className="text-emerald-900 font-medium">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Losers Section */}
        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 shadow-sm">
          <h3 className="text-xl font-bold text-rose-800 mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Common Pitfalls
          </h3>
          <ul className="space-y-3">
            {analysis.losingWeaknesses.map((weakness, idx) => (
              <li key={idx} className="flex items-start gap-3 bg-white/60 p-3 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <span className="text-rose-900 font-medium">{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Impact Factors</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={impactData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 10]} hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{fill: 'transparent'}}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                  {impactData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.sentiment === 'POSITIVE' ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-center text-slate-400 mt-2">Scale 1-10: Higher impact on decision outcome</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <h3 className="text-lg font-semibold text-slate-800 mb-6">Success Probability by Theme</h3>
           <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analysis.successRateByTheme}
                  dataKey="rate"
                  nameKey="theme"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analysis.successRateByTheme.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Actionable Advice */}
      <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-lg">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
          <Lightbulb className="text-yellow-400" />
          Strategic Recommendations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.actionableAdvice.map((advice, idx) => (
            <div key={idx} className="flex gap-4 p-4 bg-slate-700/50 rounded-xl border border-slate-700">
              <span className="text-brand-300 font-bold text-lg">0{idx + 1}</span>
              <p className="text-slate-200 leading-relaxed">{advice}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center pt-8">
        <button 
          onClick={onReset}
          className="px-8 py-3 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          Analyze Different Grants
        </button>
      </div>
    </div>
  );
};

export default AnalysisResult;
