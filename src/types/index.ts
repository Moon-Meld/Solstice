import { ConstellationAlignment } from './graph';

export type AtelierType = 'self-portrait' | 'constellation' | 'the-rehearsal' | 'odyssey';

export interface StarBullet {
  id: string;
  original: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  metrics: string[];
  actionVerb: string;
  potencyScore: number; // 0 - 100
  refined: string;
  critique: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  period: string;
  location: string;
  rawBullets: string[];
  starBullets: StarBullet[];
}

export interface CandidateProfile {
  name: string;
  title: string;
  email: string;
  targetRole: string;
  summary: string;
  skills: string[];
  experiences: ExperienceItem[];
  education: {
    institution: string;
    degree: string;
    period: string;
    highlights: string;
  }[];
}

export type InterviewerPersona = 
  | 'tech-lead'       // Rigorous, architecture & performance focused
  | 'product-director'// Visionary, metrics, trade-offs & user empathy
  | 'empathetic-hr'   // Culture, growth mindset, conflict resolution
  | 'quant-principal';// Mathematical rigor, probability, mental acuity

export interface InterviewMessage {
  id: string;
  sender: 'interviewer' | 'candidate' | 'solstice-mentor';
  content: string;
  timestamp: string;
  evaluation?: {
    score: number;
    quickFeedback: string;
  };
  hint?: string;
}

export interface DirectorsCutReport {
  overallScore: number;
  dimensions: {
    technicalRigor: number;
    structuralClarity: number;
    metricImpact: number;
    executivePresence: number;
  };
  executiveSummary: string;
  strengths: string[];
  growthVectors: string[];
  goldenExemplar: {
    question: string;
    exemplarAnswer: string;
    breakdownRationale: string;
  };
}

export interface InterviewSession {
  id: string;
  persona: InterviewerPersona;
  targetCompany: string;
  targetRole: string;
  roundName: string;
  messages: InterviewMessage[];
  status: 'idle' | 'in-progress' | 'completed';
  report?: DirectorsCutReport;
}

export type ApplicationStage = 
  | 'discovered' 
  | 'tailored' 
  | 'interviewing' 
  | 'offer' 
  | 'negotiating' 
  | 'archived';

export interface OdysseyOpportunity {
  id: string;
  company: string;
  role: string;
  stage: ApplicationStage;
  alignmentScore: number;
  salaryRange?: string;
  location: string;
  deadline?: string;
  notes: string;
  actionItems: string[];
  outreachDraft?: {
    subject: string;
    recipientType: 'hiring-manager' | 'peer-engineer' | 'recruiter';
    body: string;
    rationale: string;
  };
}

export interface LLMConfig {
  mode: 'hybrid' | 'gemini' | 'openai';
  apiKey?: string;
  modelName?: string;
  status: 'ready' | 'invalid_key' | 'evaluating';
}

export interface OrchestratorState {
  activeAtelier: AtelierType;
  profile: CandidateProfile;
  alignment: ConstellationAlignment | null;
  activeInterview: InterviewSession | null;
  opportunities: OdysseyOpportunity[];
  llmConfig: LLMConfig;
}
