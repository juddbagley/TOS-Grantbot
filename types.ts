export enum Outcome {
  WON = 'WON',
  LOST = 'LOST',
  PENDING = 'PENDING' // Included for completeness, though analysis focuses on resolved
}

export type GrantLocation = 'TOSA SLC' | 'TOSV SLC' | 'TOSA Denver';

export interface GrantApplication {
  id: string;
  title: string;
  content: string; // The text of the application or abstract
  outcome: Outcome;
  organization?: string;
  amountRequested?: number;
  amountAwarded?: number;
  locations?: GrantLocation[];
}

export interface ThemeAnalysis {
  name: string;
  description: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  impactScore: number; // 1-10 scale of how much this factor contributed to the outcome
  frequency: number; // How often this theme appeared
}

export interface ComparativeAnalysis {
  executiveSummary: string;
  winningStrengths: string[];
  losingWeaknesses: string[];
  keyThemes: ThemeAnalysis[];
  actionableAdvice: string[];
  successRateByTheme: { theme: string; rate: number }[];
}

export interface ContextItem {
  id: string;
  type: 'link' | 'text' | 'file';
  title: string;
  content: string; // URL for link, extracted text for file/text
  dateAdded: string;
}

export interface AppState {
  grants: GrantApplication[];
  analysis: ComparativeAnalysis | null;
  isAnalyzing: boolean;
  error: string | null;
}

export interface FeedbackComment {
  id: string;
  text: string;
  timestamp: Date | string;
  originalDraft: string; // Stored to allow Undo
}

export interface ApplicationSection {
  id: string;
  question: string;
  draft: string;
  lastFeedback: FeedbackComment | null;
  isGenerating: boolean;
}