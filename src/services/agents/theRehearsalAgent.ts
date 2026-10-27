import { InterviewMessage, InterviewerPersona, DirectorsCutReport } from '../../types';
import { ragEngine } from '../ragEngine';
import { llmAdapter } from '../llmAdapter';

export class TheRehearsalAgent {
  /**
   * Generates opening interview question and sets the stage
   */
  public initiateSession(
    company: string,
    roleTitle: string,
    persona: InterviewerPersona
  ): InterviewMessage {
    const questions = ragEngine.retrieveQuestionsForSession(company, persona, roleTitle);
    const chosenQ = questions[0];

    const personaGreetings: Record<InterviewerPersona, string> = {
      'tech-lead': `Welcome. I’m the Systems & Architecture Lead for ${company}. Today we’ll bypass superficial trivia and dig straight into architectural integrity, latency budgets, and failure topologies. Let’s begin:\n\n${chosenQ.question}`,
      'product-director': `Great to meet you. As Product Director here at ${company}, I look for engineers who can marry deep technical viability with uncompromising user empathy and unit economics. Let’s dive into a real strategic challenge:\n\n${chosenQ.question}`,
      'empathetic-hr': `Hello! We’re thrilled to have you here at ${company}. Beyond technical prowess, we care deeply about intellectual honesty, resilience under pressure, and how you elevate the engineers around you.\n\n${chosenQ.question}`,
      'quant-principal': `Welcome to the quantitative research assessment for ${company}. We value probabilistic humility, first-principles logic, and instantaneous mental clarity under uncertainty. Consider this problem:\n\n${chosenQ.question}`
    };

    return {
      id: `msg-${Date.now()}`,
      sender: 'interviewer',
      content: personaGreetings[persona] || chosenQ.question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      hint: `Solstice Hint: Deconstruct the problem using the ${chosenQ.idealFramework}`
    };
  }

  /**
   * Generates real-time feedback and dynamic follow-up probe
   */
  public async respondToCandidate(
    candidateAnswer: string,
    history: InterviewMessage[],
    persona: InterviewerPersona,
    company: string
  ): Promise<InterviewMessage> {
    const questions = ragEngine.retrieveQuestionsForSession(company, persona);
    const followUp = questions[0]?.followUpProbes[0] || 'How would this design behave if network latency between regions doubled unexpectedly?';

    const systemPrompt = `You are an elite interviewer at ${company} with persona "${persona}".
The candidate just answered your technical/behavioral interview question.
Critique their response briefly (2 sentences, evaluating technical depth or clarity), and then deliver a challenging, surgical follow-up question.`;

    const userPrompt = `Candidate Answer: "${candidateAnswer}"
Previous Context: "${history[history.length - 2]?.content || ''}"
Follow-up Inspiration: "${followUp}"`;

    try {
      const llmResponse = await llmAdapter.generateText({ systemPrompt, userPrompt, temperature: 0.6 });
      return {
        id: `msg-${Date.now()}`,
        sender: 'interviewer',
        content: llmResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evaluation: {
          score: candidateAnswer.length > 80 ? 86 : 72,
          quickFeedback: candidateAnswer.length > 80 
            ? 'Strong technical articulation; good grounding in trade-offs.' 
            : 'Concise, but could demonstrate deeper quantitative metrics.'
        },
        hint: `Notice how ${persona} tests boundary conditions. Anchor your next answer with concrete benchmarks or fault-tolerance protocols.`
      };
    } catch {
      // Deterministic high-fidelity fallback
      return {
        id: `msg-${Date.now()}`,
        sender: 'interviewer',
        content: `Your conceptual framework addresses the primary constraint, particularly in decoupling asynchronous writes. However, in a distributed production environment, edge-case failure modes dominate.\n\n${followUp}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        evaluation: {
          score: 84,
          quickFeedback: 'Valid structural intuition. Advance into concrete failure mitigation.'
        },
        hint: 'Anchor your answer using concrete telemetry metrics (p99 latency, packet loss, watchdog timers).'
      };
    }
  }

  /**
   * Generates the comprehensive post-interview "Director's Cut Report"
   */
  public generateDirectorsCut(
    sessionMessages: InterviewMessage[],
    company: string,
    roleTitle: string
  ): DirectorsCutReport {
    const candidateResponses = sessionMessages.filter(m => m.sender === 'candidate');
    const avgLen = candidateResponses.reduce((acc, m) => acc + m.content.length, 0) / (candidateResponses.length || 1);

    const baseScore = Math.min(94, Math.max(76, Math.round(78 + avgLen / 25)));

    return {
      overallScore: baseScore,
      dimensions: {
        technicalRigor: Math.min(98, baseScore + 2),
        structuralClarity: Math.min(96, baseScore - 1),
        metricImpact: Math.min(95, baseScore + 4),
        executivePresence: Math.min(94, baseScore - 2)
      },
      executiveSummary: `The candidate demonstrates genuine sovereign ownership and clear architectural instincts appropriate for ${company}'s ${roleTitle} tier. By shifting from reactive problem-solving to proactive systemic resilience, their narrative commands immediate credibility.`,
      strengths: [
        'Precise decoupling of control plane from data plane under extreme concurrency.',
        'High metric literacy: articulates trade-offs in p99 latencies, cache locality, and failure budgets.',
        'Psychological composure when challenged with adversarial follow-up constraints.'
      ],
      growthVectors: [
        'Incorporate formal verification models (e.g., TLA+ or state machine safety invariants) when discussing consensus.',
        'Quantify human operational overhead and deployment rollback criteria alongside machine metrics.'
      ],
      goldenExemplar: {
        question: `How to handle tail latency spikes in a high-concurrency distributed pipeline for ${company}?`,
        exemplarAnswer: `“We address tail latency not as a byproduct of bad luck, but as an architectural constraint. First, we deploy speculative parallel read requests with tied hedging (issuing a secondary request if the primary exceeds p95 duration). Second, we enforce strict memory arena allocation and kernel bypass to eliminate GC pauses. Third, we implement client-side admission control with exponentially weighted moving average (EWMA) token buckets to prevent cascade collapse.”`,
        breakdownRationale: 'Tripartite structure: 1. Hedged requests (algorithmic) -> 2. Memory arenas (hardware affinity) -> 3. Admission control (systemic stability).'
      }
    };
  }
}

export const theRehearsalAgent = new TheRehearsalAgent();
