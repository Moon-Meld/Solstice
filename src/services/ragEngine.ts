import { BENCHMARK_JDS, BenchmarkJD } from '../data/benchmarkJDs';
import { INTERVIEW_QUESTION_BANK, InterviewQuestionItem } from '../data/questionBanks';
import { POWER_VERBS, STAR_GOLDEN_EXAMPLES, PowerVerb, StarTransformationRule } from '../data/starTemplates';

export class DynamicRAGEngine {
  private jds: BenchmarkJD[] = BENCHMARK_JDS;
  private questions: InterviewQuestionItem[] = INTERVIEW_QUESTION_BANK;
  private powerVerbs: PowerVerb[] = POWER_VERBS;
  private starExamples: StarTransformationRule[] = STAR_GOLDEN_EXAMPLES;

  /**
   * Tokenizes text and cleans punctuation for vector/lexical similarity
   */
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  /**
   * Jaccard & Term Frequency Cosine Similarity Simulation
   */
  public calculateSemanticResonance(query: string, document: string): number {
    const qTokens = new Set(this.tokenize(query));
    const dTokens = new Set(this.tokenize(document));

    if (qTokens.size === 0 || dTokens.size === 0) return 0;

    let intersection = 0;
    for (const token of qTokens) {
      if (dTokens.has(token)) {
        intersection++;
      }
    }

    const similarity = intersection / Math.sqrt(qTokens.size * dTokens.size);
    return Math.min(1.0, similarity * 1.5); // boosted scaling
  }

  /**
   * RAG Retrieval: Finds closest benchmark JD for a candidate profile or query
   */
  public retrieveRelevantJD(roleQuery: string): BenchmarkJD {
    let bestJD = this.jds[0];
    let maxScore = -1;

    for (const jd of this.jds) {
      const docText = `${jd.title} ${jd.company} ${jd.overview} ${jd.hardRequirements.join(' ')}`;
      const score = this.calculateSemanticResonance(roleQuery, docText);
      if (score > maxScore) {
        maxScore = score;
        bestJD = jd;
      }
    }

    return bestJD;
  }

  /**
   * RAG Retrieval: Finds interview questions tailored to company, role, and interviewer persona
   */
  public retrieveQuestionsForSession(
    company: string, 
    persona: string, 
    _roleQuery?: string
  ): InterviewQuestionItem[] {
    const matches = this.questions.filter(q => {
      const companyMatch = q.targetCompany.toLowerCase().includes(company.toLowerCase()) || 
                           company.toLowerCase().includes(q.targetCompany.toLowerCase());
      const personaMatch = q.persona === persona;
      return companyMatch && personaMatch;
    });

    if (matches.length > 0) return matches;

    // Fallback: match by persona or company alone
    const partialMatches = this.questions.filter(q => q.persona === persona || q.targetCompany.toLowerCase().includes(company.toLowerCase()));
    if (partialMatches.length > 0) return partialMatches;

    return this.questions.slice(0, 3);
  }

  /**
   * RAG Retrieval: Finds high-potency action verb recommendations
   */
  public suggestPowerVerbs(sentence: string): { originalFound?: string; suggestions: PowerVerb[] } {
    const lower = sentence.toLowerCase();
    for (const pv of this.powerVerbs) {
      for (const weak of pv.substituteFor) {
        if (lower.includes(weak)) {
          const suggestions = this.powerVerbs.filter(p => p.category === pv.category || p.impactTier === 'Executive');
          return { originalFound: weak, suggestions };
        }
      }
    }
    return { suggestions: this.powerVerbs.slice(0, 4) };
  }

  /**
   * RAG Retrieval: Retrieves the most aligned STAR golden example for learning/reference
   */
  public retrieveClosestStarExemplar(bullet: string): StarTransformationRule {
    let best = this.starExamples[0];
    let maxScore = -1;

    for (const eg of this.starExamples) {
      const score = this.calculateSemanticResonance(bullet, eg.before + ' ' + eg.domain);
      if (score > maxScore) {
        maxScore = score;
        best = eg;
      }
    }

    return best;
  }

  /**
   * Evaluates ATS Resonance & Keyword Saturation
   */
  public evaluateAtsResonance(resumeText: string, targetRole: string) {
    const targetJD = this.retrieveRelevantJD(targetRole);
    const resumeTokens = new Set(this.tokenize(resumeText));

    const allKeywords = [
      ...targetJD.hardRequirements.flatMap(r => this.tokenize(r)),
      ...targetJD.keyMissions.flatMap(m => this.tokenize(m))
    ];

    const uniqueKeywords = Array.from(new Set(allKeywords)).filter(k => k.length > 3);
    const matched: string[] = [];
    const missing: string[] = [];

    for (const kw of uniqueKeywords) {
      if (resumeTokens.has(kw)) {
        matched.push(kw);
      } else {
        missing.push(kw);
      }
    }

    const ratio = uniqueKeywords.length > 0 ? (matched.length / uniqueKeywords.length) : 0.5;
    const score = Math.round(Math.min(98, Math.max(35, ratio * 100 + 20)));

    return {
      targetJD,
      score,
      matchedKeywords: matched.slice(0, 8),
      missingCriticalKeywords: missing.slice(0, 6)
    };
  }
}

export const ragEngine = new DynamicRAGEngine();
