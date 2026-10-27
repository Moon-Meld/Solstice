import { CandidateProfile } from '../types';

export const DOMAIN_RESUME_TEMPLATES: { id: string; label: string; role: string; profile: CandidateProfile }[] = [
  {
    id: 'ai-infra',
    label: '前沿 AI 基础设施工程师 (AI Infra & Systems)',
    role: 'role-openai-ai-infra',
    profile: {
      name: 'Alexandre Sterling (盛凌)',
      title: 'Systems & Distributed Computing Artisan',
      email: 'alexandre.sterling@solstice.dev',
      targetRole: 'role-openai-ai-infra',
      summary: '聚焦分布式加速器集群拓扑、底层内存模型及万卡并行训练调度。擅长从第一性原理拆解延迟瓶颈与显存墙约束。',
      skills: ['skill-python', 'skill-dist-sys', 'skill-rag-triad', 'skill-vector-db', 'skill-first-principles'],
      experiences: [
        {
          id: 'exp-ai-1',
          company: 'Aether Supercomputing Labs',
          role: 'Distributed Systems Engineer',
          period: '2023 - 2026',
          location: 'San Francisco, CA',
          rawBullets: [
            'Worked on PyTorch model training and fixed GPU memory issues when running large batches.',
            'Helped improve the database speed and wrote some API endpoints in Go for the payments service.',
            'Assisted in building an AI chatbot for customer support that answered user questions.'
          ],
          starBullets: [
            {
              id: 'sb-ai-1',
              original: 'Worked on PyTorch model training and fixed GPU memory issues when running large batches.',
              situation: '在 128 节点 H100 集群进行 32k 长上下文训练时，频繁因张量激活值碎片引发 GPU OOM 崩溃。',
              task: '重写显存分配与梯度同步机制，在零额外硬件投入下保障长文本并行吞吐。',
              action: '主导实现 Triton 自定义算子融合与 ZeRO-3 动态显存分段，解耦异步通信与计算流水线。',
              result: '将显存峰值开销压降 44%，上下文容量从 8k 扩增至 32k，任务持续完成率达 99.8%。',
              metrics: ['-44% 显存峰值', '4× 上下文扩展 (32k)', '99.8% 任务高可用'],
              actionVerb: '主导实现',
              potencyScore: 95,
              refined: '主导实现 Triton 自定义融合算子与 ZeRO-3 动态显存分段，将显存峰值开销压降 44%，支撑 32k 极限长文本在 128 节点无阻塞训练。',
              critique: '以强统御力动词替换被动表述，精准绑定底层机制（Triton, ZeRO-3）与硬核量化收益。'
            }
          ]
        }
      ],
      education: [
        {
          institution: 'UC Berkeley / 清华大学',
          degree: '计算机科学与应用数学学士 (B.S.)',
          period: '2019 - 2023',
          highlights: '最高荣誉毕业 (Summa Cum Laude)，SysML 会议分布式通信论文一作。'
        }
      ]
    }
  },
  {
    id: 'quant-dev',
    label: '顶级高频量化开发/策略师 (Quant Systems Dev)',
    role: 'role-jane-street-quant',
    profile: {
      name: 'Vance Lin (林越)',
      title: 'Ultra-Low Latency & Quantitative Systems Engineer',
      email: 'vance.lin@quant-solstice.io',
      targetRole: 'role-jane-street-quant',
      summary: '深耕高频订单簿微观结构、Linux 内核旁路网络及微秒级交易循环优化。追求绝对的确定性与贝叶斯审慎。',
      skills: ['skill-cpp', 'skill-low-latency', 'skill-time-series', 'skill-stochastic-calc'],
      experiences: [
        {
          id: 'exp-quant-1',
          company: 'Hyperion Alpha Securities',
          role: 'Low-Latency C++ Engineer',
          period: '2023 - 2026',
          location: 'New York, NY',
          rawBullets: [
            'Optimized the market data order book feed in C++ to make tick processing faster.',
            'Helped analyze trade slippage and fixed network packet loss issues in trading engines.'
          ],
          starBullets: [
            {
              id: 'sb-q-1',
              original: 'Optimized the market data order book feed in C++ to make tick processing faster.',
              situation: '全球主交易所行情发生瞬时波动剧震时，行情解析队列因锁竞争产生高达 120μs 的抖动。',
              task: '重构 L2/L3 订单簿状态机，将 Tick-to-Trade 端到端处理延迟压降至微秒以下。',
              action: '采用 Modern C++20 设计无锁环形队列，结合 Solarflare DPDK 内核旁路与 CPU 亲和性硬绑定。',
              result: '撮合反应延迟从 142μs 骤降至 8.2μs（压缩 94%），在极限行情下的滑点回撤减少 $1.8M。',
              metrics: ['-94% 反应延迟 (8.2μs)', '0 锁竞争开销', '减少 $1.8M 滑点损耗'],
              actionVerb: '架构并实现了',
              potencyScore: 96,
              refined: '架构并实现了基于 Modern C++20 与 DPDK 内核旁路的无锁订单簿处理引擎，将 Tick-to-Trade 延迟压降至 8.2μs，挽回 $1.8M 行情滑点损耗。',
              critique: '精准呈现微秒级低延迟硬核技术栈，以财务滑点收益彰显极致工程话语权。'
            }
          ]
        }
      ],
      education: [
        {
          institution: 'MIT (麻省理工学院)',
          degree: '电子工程与计算机科学理学硕士 (M.Eng.)',
          period: '2021 - 2023',
          highlights: 'Putnam 数学竞赛全美前 50，主修随机微积分与计算机体系结构。'
        }
      ]
    }
  },
  {
    id: 'product-architect',
    label: 'AI 平台产品架构师 (AI Product & Platform Lead)',
    role: 'role-stripe-ai-product',
    profile: {
      name: 'Claire Chen (陈舒予)',
      title: 'Principal AI Product Architect',
      email: 'claire.chen@platform-craft.com',
      targetRole: 'role-stripe-ai-product',
      summary: '贯通前沿大模型能力与企业级严肃商业场景。专注于零幻觉金融级 Graph-RAG 工作流、开发者体验与单位经济模型。',
      skills: ['skill-python', 'skill-rag-triad', 'skill-cross-orchestration', 'skill-star-framing'],
      experiences: [
        {
          id: 'exp-prod-1',
          company: 'Nexus Financial Infrastructure',
          role: 'Staff Product Engineering Lead',
          period: '2023 - 2026',
          location: 'San Francisco, CA',
          rawBullets: [
            'Built an AI copilot for developer documentation and customer chargeback disputes.',
            'Coordinated between engineering and sales teams to launch new platform features.'
          ],
          starBullets: [
            {
              id: 'sb-p-1',
              original: 'Built an AI copilot for developer documentation and customer chargeback disputes.',
              situation: '跨境商户在面临欺诈争议与对账审计时，人工核对耗时均值达 4.2 天，客服积压严重。',
              task: '打造兼具确定性金融账本校验与自然语言交互的智能副驾，消除幻觉法律风险。',
              action: '设计确定性计算沙盒与 Graph-RAG 双通道验证架构，主导 12 人跨职能团队实现 6 周敏捷交付。',
              result: '纠纷自动核销率从 14% 提升至 68%，审计合规零差错，年化节省运营成本 $2.4M。',
              metrics: ['+54% 自动化核销率', '$2.4M 年化运营降本', '0 合规差错'],
              actionVerb: '统筹奠定',
              potencyScore: 93,
              refined: '统筹奠定金融级 Graph-RAG 智能纠纷裁决平台，实现审计数据零幻觉验证，自动化核销率提升至 68%，年化节省人工成本 $2.4M。',
              critique: '无缝将技术架构（确定性沙盒+双通道）与高管层商业指标（$2.4M 节约）融为一体。'
            }
          ]
        }
      ],
      education: [
        {
          institution: 'Stanford University (斯坦福大学)',
          degree: '管理科学与工程学士 (B.S.)',
          period: '2018 - 2022',
          highlights: '兼修计算机系统，斯坦福人工智能协会 (SAIL) 核心成员。'
        }
      ]
    }
  }
];

export class ResumeParserService {
  /**
   * Parses arbitrary raw resume text into structured CandidateProfile
   */
  public parseRawResumeText(rawText: string, currentTargetRole: string): CandidateProfile {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const name = lines[0] || '候选人 (Artisan Candidate)';
    const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.\w+/);
    const email = emailMatch ? emailMatch[0] : 'artisan@solstice.dev';

    // Extract skills dynamically
    const detectedSkills: string[] = ['skill-python', 'skill-first-principles'];
    if (/c\+\+|cpp/i.test(rawText)) detectedSkills.push('skill-cpp');
    if (/distributed|raft|paxos|consensus/i.test(rawText)) detectedSkills.push('skill-dist-sys');
    if (/rag|vector|embedding|retrieval/i.test(rawText)) detectedSkills.push('skill-rag-triad');
    if (/cuda|gpu|triton|kernel/i.test(rawText)) detectedSkills.push('skill-cuda');
    if (/low latency|latency|dpdk|microsecond/i.test(rawText)) detectedSkills.push('skill-low-latency');

    // Extract bullets
    const rawBullets = lines
      .filter(l => l.startsWith('-') || l.startsWith('•') || l.startsWith('*') || l.length > 30)
      .map(l => l.replace(/^[-•*]\s*/, ''))
      .slice(0, 4);

    const safeBullets = rawBullets.length > 0 ? rawBullets : [
      '负责核心业务高可用微服务重构与性能调优。',
      '主导团队完成系统自动化测试流水线与监控体系搭建。'
    ];

    return {
      name,
      title: 'Senior Software & AI Infrastructure Engineer',
      email,
      targetRole: currentTargetRole,
      summary: lines.slice(1, 3).join(' ') || '专注于高性能计算、系统架构与严谨工程实践的资深技术专家。',
      skills: Array.from(new Set(detectedSkills)),
      experiences: [
        {
          id: `exp-${Date.now()}`,
          company: 'Technology Corporation',
          role: 'Core Systems Engineer',
          period: '2023 - Present',
          location: 'Remote / Hybrid',
          rawBullets: safeBullets,
          starBullets: [
            {
              id: `sb-${Date.now()}`,
              original: safeBullets[0],
              situation: '面对生产环境核心吞吐与高并发约束。',
              task: '主导系统架构升级并消除关键路径性能损耗。',
              action: '设计分段缓存流水线与高吞吐并行调度模型。',
              result: '提升系统稳定性至 99.95%，显著压降调用延迟。',
              metrics: ['99.95% 可用性', '-40% 响应时延'],
              actionVerb: '重构并交付',
              potencyScore: 91,
              refined: `重构并交付基于高吞吐并行调度的新一代核心处理引擎，系统可用性提升至 99.95%，显著压降调用延迟。`,
              critique: '快速提炼技术攻坚主线，建立清晰的量化因果关系。'
            }
          ]
        }
      ],
      education: [
        {
          institution: '知名大学 (Leading University)',
          degree: '计算机科学学士 / 硕士',
          period: '2019 - 2023',
          highlights: '专业排名前 5%，深度钻研操作系统与分布式算法。'
        }
      ]
    };
  }
}

export const resumeParserService = new ResumeParserService();
