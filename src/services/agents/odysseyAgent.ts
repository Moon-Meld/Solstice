import { OdysseyOpportunity } from '../../types';
import { kgEngine } from '../kgEngine';

export class OdysseyAgent {
  /**
   * Generates tailored cold outreach message attuned to target company's cultural DNA
   */
  public generateNetworkingDraft(
    companyName: string,
    targetRole: string,
    recipientType: 'hiring-manager' | 'peer-engineer' | 'recruiter',
    candidateStrengths: string[]
  ): { subject: string; body: string; rationale: string } {
    const companyCulture = kgEngine.getAllNodes().find(n => n.type === 'company' && n.label.toLowerCase().includes(companyName.toLowerCase()));

    const cultureKeyword = companyCulture ? companyCulture.description : 'High-impact engineering innovation';

    if (recipientType === 'hiring-manager') {
      return {
        subject: `Architectural resonance & ${targetRole} exploration — [Your Name]`,
        body: `Hi [Hiring Manager Name],\n\nI’ve followed ${companyName}’s recent milestones in distributed infrastructure, particularly your focus on ${cultureKeyword}.\n\nOver the past few years, my work has focused on ${candidateStrengths.slice(0, 2).join(' and ')}, where I recently compressed p99 latency by 58% on high-throughput serving clusters.\n\nI’ve put together a brief technical breakdown of how I’d approach the latency bottlenecks in your upcoming cluster scaling. Would you be open to a 10-minute engineering discussion next Tuesday afternoon?\n\nBest regards,\n[Your Name]`,
        rationale: 'Hiring managers ignore generic flattery; they respond immediately to specific technical resonance, quantified wins, and upfront architectural value.'
      };
    }

    if (recipientType === 'peer-engineer') {
      return {
        subject: `Quick question on ${companyName}'s distributed consensus pipeline`,
        body: `Hey [Engineer Name],\n\nLoved your recent write-up on cache invalidation in multi-region environments. I'm currently researching similar failure modes around Paxos leader leases.\n\nI’m exploring the ${targetRole} role on your team. How does the group balance rapid frontier model deployment with formal verification invariants?\n\nWould love to buy you a virtual coffee or trade notes if you have 10 minutes.\n\nCheers,\n[Your Name]`,
        rationale: 'Peer engineers value genuine curiosity, intellectual craft, and peer-to-peer technical humility.'
      };
    }

    // Recruiter
    return {
      subject: `Application: ${targetRole} — ${companyName} (Proven Background in ${candidateStrengths[0] || 'AI Infrastructure'})`,
      body: `Hi [Recruiter Name],\n\nI’m reaching out regarding the ${targetRole} opening at ${companyName}. Given your strategic priority on ${cultureKeyword}, my background in ${candidateStrengths.join(', ')} directly matches your core technical requirements.\n\nI have previously engineered production systems handling 85k QPS with 99.99% availability, and I would love to connect to discuss how I can contribute to this quarter's roadmap.\n\nAttached is my portfolio and resume for your review.\n\nBest,\n[Your Name]`,
      rationale: 'Recruiters scan for immediate keyword-to-impact alignment and crisp qualification proof.'
    };
  }

  /**
   * Generates an Offer & Compensation Negotiation Strategy
   */
  public generateNegotiationStrategy(opportunity: OdysseyOpportunity): {
    strategyName: string;
    leveragePoints: string[];
    script: string;
    counterOfferTarget: string;
  } {
    return {
      strategyName: 'The Sovereign Artisan Counter-Proposal',
      leveragePoints: [
        `High Graph-RAG Resonance (${opportunity.alignmentScore}% match) across core mission bottlenecks`,
        'Demonstrated ability to step immediately into L5/L6 architectural ownership without ramp-up friction',
        'Competing market momentum across frontier infrastructure teams'
      ],
      counterOfferTarget: opportunity.salaryRange ? `${opportunity.salaryRange} + 15% Equity Adjustment` : '$210,000 Base + $280,000 Equity / 4yr',
      script: `“Thank you so much for the offer. After speaking with the team, I am more convinced than ever that ${opportunity.company} is the exact arena where my background in ${opportunity.role} will drive outsized leverage.\n\nGiven the specialized scope of the role—specifically the mandate to architect and de-risk our distributed infrastructure—and based on competing opportunities I am evaluating, I would be prepared to sign immediately if we can align the equity component to [Target Equity] and base salary to [Target Base].\n\nI see this as a multi-year partnership and look forward to building this together.”`
    };
  }
}

export const odysseyAgent = new OdysseyAgent();
