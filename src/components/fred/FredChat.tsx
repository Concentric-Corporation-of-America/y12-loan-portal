import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Loader2, 
  Bot, 
  User, 
  Sparkles,
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  CheckCircle,
  Clock
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface FredChatProps {
  executiveEmail?: string;
  executiveName?: string;
  executiveRole?: string;
}

// Executive profiles for personalization
const EXECUTIVE_PROFILES: Record<string, {
  name: string;
  role: string;
  focus: string[];
  greeting: string;
}> = {
  'barterburn@ourfsb.com': {
    name: 'Brian Arterburn',
    role: 'EVP / Chief Sales Officer',
    focus: ['Sales Performance', 'Kentucky Market', 'Customer Retention', 'FSB Integration'],
    greeting: "Good morning, Brian! I'm ready to help you with Kentucky market insights, sales performance metrics, and FSB integration updates. What would you like to explore today?"
  },
  'dmillaway@y12fcu.org': {
    name: 'Dustin Millaway',
    role: 'President & CEO',
    focus: ['Strategic Planning', 'Financial Performance', 'Board Reporting', 'M&A Analysis'],
    greeting: "Good morning, Dustin! I'm here to assist with enterprise-wide analytics, strategic initiatives, and board-level insights. How can I help you today?"
  },
  'lboston@y12fcu.org': {
    name: 'Lynn Boston',
    role: 'SVP, Chief People Officer',
    focus: ['Employee Engagement', 'Talent Management', 'Culture Integration', 'HR Analytics'],
    greeting: "Good morning, Lynn! I'm ready to help with workforce analytics, employee engagement metrics, and culture integration insights. What would you like to review?"
  },
  'jwood@y12fcu.org': {
    name: 'Jim Wood',
    role: 'SVP, Chief Lending Officer',
    focus: ['Loan Portfolio', 'Credit Risk', 'Underwriting', 'Delinquency Management'],
    greeting: "Good morning, Jim! I'm here to assist with loan portfolio analytics, credit risk assessments, and lending performance metrics. What would you like to analyze?"
  }
};

// Sample responses based on executive role
const SAMPLE_RESPONSES: Record<string, Record<string, string>> = {
  sales: {
    performance: `**Kentucky Market Performance - Q4 2025**

**Overall Metrics:**
- Total deposits: $423M (+3.2% QoQ)
- New member accounts: 847 (+12% vs Q3)
- Loan originations: $28.4M (+8.7% QoQ)

**Branch Performance:**
| Branch | New Accounts | Deposits | Conversion |
|--------|-------------|----------|------------|
| London | 195 (23%) | $98M | 34% |
| Middlesboro | 142 (17%) | $87M | 31% |
| Corbin | 128 (15%) | $72M | 34% |

**Opportunities Identified:**
- 127 FSB customers pending Y-12 membership conversion
- Auto loan cross-sell: 312 members with maturing loans
- Business banking pipeline: 8 qualified leads

Would you like me to drill down into any specific branch or metric?`,
    retention: `**Customer Retention Analysis**

**Current Retention Rate: 97.3%** (Target: 95%)

**Churn Risk Indicators:**
- 23 accounts flagged as high-risk
- Primary reasons: Rate sensitivity (45%), Service issues (30%), Relocation (25%)

**Retention Actions Recommended:**
1. Proactive outreach to 12 high-value accounts
2. Rate match offers for 8 competitive situations
3. Service recovery for 3 escalated cases

**FSB Customer Conversion Status:**
- Total FSB customers: 8,234
- Converted to Y-12 members: 7,892 (95.8%)
- Pending conversion: 342
- Declined: 127

Shall I generate the retention action plan or focus on specific accounts?`
  },
  ceo: {
    board: `**Board Summary - FSB Integration Progress**

**Integration Status: 78% Complete**

**Completed Milestones:**
- Legal entity consolidation (July 2025)
- Core banking system migration (September 2025)
- Brand alignment ("FSB, A Division of Y-12")
- Staff training program (94% completion)

**In Progress:**
- Product harmonization (target: Q1 2026)
- Digital banking platform unification (85%)
- Member communication campaign (ongoing)

**Financial Impact:**
- Combined assets: $2.56B
- Synergy savings realized: $1.2M (vs $1.5M target)
- Member retention: 97.3% (exceeds 95% target)

**Risk Items:**
- 2 Kentucky branches below efficiency targets
- IT system integration delayed 3 weeks
- 12 FSB staff positions still unfilled

**Recommendation:** Schedule integration steering committee review for December 15th.

Shall I generate the full board presentation deck?`,
    financial: `**Enterprise Financial Dashboard - November 2025**

**Key Performance Indicators:**
| Metric | Actual | Target | Variance |
|--------|--------|--------|----------|
| ROA | 0.92% | 0.85% | +0.07% |
| ROE | 9.8% | 9.0% | +0.8% |
| NIM | 3.24% | 3.15% | +0.09% |
| Efficiency | 68.2% | 70.0% | +1.8% |

**Asset Quality:**
- Total loans: $1.87B
- Delinquency (30+): 0.73%
- Charge-offs YTD: 0.42%
- CECL reserve: $18.2M (adequate)

**Capital Position:**
- Net worth ratio: 10.8%
- Risk-based capital: 14.2%
- NCUA well-capitalized threshold: Met

**Strategic Initiatives Status:**
- FSB Integration: 78% complete
- Digital Transformation: On track
- Branch Expansion: Under evaluation

Would you like detailed analysis on any specific area?`
  },
  hr: {
    engagement: `**Employee Engagement Dashboard**

**Overall Engagement Score: 4.2/5.0** (up from 4.0 in Q3)

**Key Metrics:**
- Employee satisfaction: 87%
- Voluntary turnover: 8.2% (industry avg: 12%)
- Training completion: 94%
- Internal promotion rate: 23%

**FSB Integration Pulse:**
- FSB staff engagement: 3.9/5.0 (improving)
- Cross-training completion: 78%
- Culture alignment score: 82%

**Recognition Highlights:**
- Top Workplace 2025 (National)
- Best Places to Work (Knoxville)
- Credit Union Rock Star nominations: 3

**Action Items:**
- 12 FSB staff flagged for retention risk
- Leadership development cohort 3 starting January
- Annual engagement survey launching December 1st

Would you like the retention risk analysis or survey questions?`,
    talent: `**Talent Pipeline Report**

**Current Headcount: 362** (+12 from FSB integration)

**Open Positions: 18**
| Department | Positions | Priority |
|------------|-----------|----------|
| Lending | 5 | High |
| IT | 4 | High |
| Branch Ops | 6 | Medium |
| Marketing | 3 | Low |

**Succession Planning:**
- Critical roles identified: 12
- Successors ready now: 8 (67%)
- Successors ready in 1-2 years: 4

**Training & Development:**
- Leadership program participants: 24
- Certification completions YTD: 87
- Average training hours/employee: 32

**Diversity Metrics:**
- Women in leadership: 48%
- Minority representation: 23%
- Veterans: 8%

Shall I drill down into any specific area?`
  },
  lending: {
    portfolio: `**Loan Portfolio Health Report**

**Portfolio Overview:**
- Total loans outstanding: $1.87B
- Loan-to-share ratio: 78.4%
- Average yield: 6.23%

**Performance by Category:**
| Category | Balance | Growth | Delinquency |
|----------|---------|--------|-------------|
| Auto | $612M | +4.2% | 0.82% |
| Mortgage | $743M | +2.1% | 0.34% |
| Personal | $298M | +6.8% | 1.24% |
| Business | $217M | +8.3% | 0.67% |

**Credit Quality:**
- 30+ day delinquency: 0.73% (target: <1.0%)
- Charge-off rate: 0.42% (target: <0.5%)
- CECL reserve: $18.2M (adequate)

**Alerts:**
- 3 business loans on watch list
- Auto delinquency trending up (+0.12% MoM)
- Mortgage refinance volume down 23%

**Opportunities:**
- HELOC campaign potential: $45M
- Auto loan recapture: 234 members
- Business loan pipeline: $12.4M

Want the watch list details or campaign projections?`,
    risk: `**Credit Risk Dashboard**

**Portfolio Risk Summary:**
- Average credit score: 712
- Weighted average LTV: 78%
- Debt-to-income average: 34%

**Risk Distribution:**
| Risk Tier | Balance | % Portfolio | Trend |
|-----------|---------|-------------|-------|
| Prime (720+) | $1.12B | 60% | Stable |
| Near-Prime | $485M | 26% | +2% |
| Subprime | $265M | 14% | -1% |

**Watch List:**
- Total accounts: 47
- Total exposure: $8.4M
- New additions this month: 5
- Resolved this month: 3

**Early Warning Indicators:**
- Payment pattern changes: 23 accounts
- Credit score declines: 18 accounts
- Employment changes: 12 accounts

**Concentration Risk:**
- Largest single borrower: $2.1M (within limits)
- Geographic concentration: 82% Tennessee/Kentucky
- Industry concentration: Diversified

Shall I generate the detailed watch list report?`
  }
};

export function FredChat({ executiveEmail, executiveName, executiveRole }: FredChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get executive profile
  const profile = executiveEmail ? EXECUTIVE_PROFILES[executiveEmail] : null;
  const displayName = executiveName || profile?.name || 'Executive';
  const displayRole = executiveRole || profile?.role || 'Y-12 FCU Leadership';

  // Initialize with greeting
  useEffect(() => {
    const greeting = profile?.greeting || 
      "Good morning! I'm FRED, your Financial Research & Executive Decision assistant. I'm here to help you with financial analysis, regulatory insights, and strategic decision support. How can I assist you today?";
    
    setMessages([{
      id: '1',
      role: 'assistant',
      content: greeting,
      timestamp: new Date()
    }]);
  }, [profile]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Simulate AI response based on query
  const generateResponse = async (query: string): Promise<string> => {
    const lowerQuery = query.toLowerCase();
    
    // Determine response category based on role and query
    if (profile?.focus.includes('Sales Performance') || lowerQuery.includes('sales') || lowerQuery.includes('kentucky') || lowerQuery.includes('performance')) {
      if (lowerQuery.includes('retention') || lowerQuery.includes('churn')) {
        return SAMPLE_RESPONSES.sales.retention;
      }
      return SAMPLE_RESPONSES.sales.performance;
    }
    
    if (profile?.focus.includes('Strategic Planning') || lowerQuery.includes('board') || lowerQuery.includes('integration') || lowerQuery.includes('fsb')) {
      return SAMPLE_RESPONSES.ceo.board;
    }
    
    if (lowerQuery.includes('financial') || lowerQuery.includes('roi') || lowerQuery.includes('assets')) {
      return SAMPLE_RESPONSES.ceo.financial;
    }
    
    if (profile?.focus.includes('Employee Engagement') || lowerQuery.includes('engagement') || lowerQuery.includes('employee') || lowerQuery.includes('culture')) {
      return SAMPLE_RESPONSES.hr.engagement;
    }
    
    if (lowerQuery.includes('talent') || lowerQuery.includes('hiring') || lowerQuery.includes('succession')) {
      return SAMPLE_RESPONSES.hr.talent;
    }
    
    if (profile?.focus.includes('Loan Portfolio') || lowerQuery.includes('loan') || lowerQuery.includes('portfolio') || lowerQuery.includes('lending')) {
      return SAMPLE_RESPONSES.lending.portfolio;
    }
    
    if (lowerQuery.includes('risk') || lowerQuery.includes('delinquency') || lowerQuery.includes('credit')) {
      return SAMPLE_RESPONSES.lending.risk;
    }
    
    // Default response
    return `I understand you're asking about "${query}". Let me analyze this for you.

**Analysis in Progress...**

Based on Y-12 FCU's current data and industry benchmarks, here are my initial findings:

1. **Current Status:** The area you've inquired about is performing within expected parameters.

2. **Key Metrics:** I'm pulling the relevant KPIs from our data warehouse.

3. **Recommendations:** I'll provide actionable insights once the analysis is complete.

Would you like me to:
- Generate a detailed report on this topic?
- Compare against industry benchmarks?
- Schedule a follow-up analysis?

Please let me know how I can best assist you, ${displayName}.`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };
    setMessages(prev => [...prev, typingMessage]);

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    const response = await generateResponse(userMessage.content);

    // Remove typing indicator and add response
    setMessages(prev => {
      const filtered = prev.filter(m => m.id !== 'typing');
      return [...filtered, {
        id: Date.now().toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }];
    });

    setIsLoading(false);
    inputRef.current?.focus();
  };

  const quickActions = [
    { icon: TrendingUp, label: 'Performance', query: 'Show me the latest performance metrics' },
    { icon: DollarSign, label: 'Financial', query: 'What is our current financial position?' },
    { icon: Users, label: 'Team', query: 'How is employee engagement trending?' },
    { icon: FileText, label: 'Reports', query: 'Generate a board summary report' }
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto h-[700px] flex flex-col shadow-xl">
      <CardHeader className="bg-gradient-to-r from-[#1a365d] to-[#0f2942] text-white rounded-t-lg pb-4">
        <div className="flex items-center gap-4">
          {/* FRED Avatar */}
          <div className="relative">
            <img 
              src="/fred-avatar.svg" 
              alt="FRED AI Assistant" 
              className="w-16 h-16 rounded-full border-2 border-emerald-400 shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          
          <div className="flex-1">
            <CardTitle className="text-xl flex items-center gap-2">
              FRED
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 text-xs">
                AI Powered
              </Badge>
            </CardTitle>
            <p className="text-sm text-gray-300">
              Financial Research & Executive Decision Assistant
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Personalized for {displayName} | {displayRole}
            </p>
          </div>

          {/* Status indicators */}
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-1 text-emerald-400">
              <CheckCircle className="w-3 h-3" />
              <span>H200 Connected</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400">
              <Clock className="w-3 h-3" />
              <span>Real-time Data</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Quick Actions */}
        <div className="flex gap-2 p-3 border-b bg-gray-50">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setInput(action.query);
                inputRef.current?.focus();
              }}
            >
              <action.icon className="w-3 h-3 mr-1" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#1a365d] flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-[#1a365d] text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.isTyping ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">FRED is analyzing...</span>
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap prose prose-sm max-w-none">
                      {message.content.split('\n').map((line, i) => {
                        // Handle markdown-style formatting
                        if (line.startsWith('**') && line.endsWith('**')) {
                          return <p key={i} className="font-bold my-1">{line.replace(/\*\*/g, '')}</p>;
                        }
                        if (line.startsWith('|')) {
                          return <p key={i} className="font-mono text-xs my-0.5">{line}</p>;
                        }
                        if (line.startsWith('- ')) {
                          return <p key={i} className="ml-4 my-0.5">{line}</p>;
                        }
                        if (line.match(/^\d+\./)) {
                          return <p key={i} className="ml-4 my-0.5">{line}</p>;
                        }
                        return <p key={i} className="my-1">{line}</p>;
                      })}
                    </div>
                  )}
                  
                  {!message.isTyping && (
                    <p className="text-xs opacity-50 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask FRED about financial metrics, regulatory compliance, strategic insights..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="bg-[#1a365d] hover:bg-[#0f2942]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Powered by H200 GPU + GPT-OSS-120B | GAAP & NCUA Compliant Analysis
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default FredChat;
