# FRED Enterprise Implementation Plan
## Y-12 FCU Self-Hosted AI with Knowledge Management & Billing

**Timeline:** 30 Days
**Start Date:** November 29, 2025
**Target Completion:** December 29, 2025

---

## Executive Summary

Transform FRED from a GPT-4o pay-per-use chatbot into a fully self-hosted enterprise AI platform with:
1. **Self-hosted H200 GPU inference** (gpt-oss-120b) - eliminates per-token costs
2. **Knowledge ingestion system** - real Y-12 FCU data (earnings, metrics, reports)
3. **Automated web crawlers** - weekly regulatory/industry updates
4. **Usage metering & invoicing** - track tokens per executive, generate invoices
5. **Request analytics** - log queries to identify capability gaps
6. **Automatic capability expansion** - learn from user requests

---

## Phase 1: H200 Self-Hosted Migration (Days 1-5)

### 1.1 Update Edge Function for H200 Server

**Current:** `api.openai.com` → GPT-4o (pay-per-use)
**New:** `86.38.238.94:8001` → gpt-oss-120b (self-hosted)

```typescript
// supabase/functions/fred-ai/index.ts
const H200_API_URL = 'http://86.38.238.94:8001/v1/chat/completions'
const H200_MODEL = 'gpt-oss-120b'

// Call H200 instead of OpenAI
const response = await fetch(H200_API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: H200_MODEL,
    messages: openaiMessages,
    max_tokens: maxTokens,
    temperature: temperature,
  }),
})
```

### 1.2 Fallback Strategy

```typescript
// Primary: H200 self-hosted
// Fallback: OpenAI GPT-4o (if H200 unavailable)
try {
  response = await callH200(messages)
} catch (error) {
  console.warn('H200 unavailable, falling back to OpenAI')
  response = await callOpenAI(messages)
}
```

### 1.3 Health Monitoring

Create health check endpoint to monitor H200 availability:
- `GET /functions/v1/fred-health` → returns H200 status
- Alert if H200 goes down, auto-switch to fallback

---

## Phase 2: Database Schema for FRED Enterprise (Days 3-7)

### 2.1 New Tables

```sql
-- supabase/migrations/003_fred_enterprise_schema.sql

-- FRED Usage Tracking
CREATE TABLE public.fred_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  executive_email VARCHAR(255) NOT NULL,
  session_id UUID NOT NULL,
  request_id UUID NOT NULL,
  query TEXT NOT NULL,
  response TEXT,
  model VARCHAR(50) NOT NULL, -- 'gpt-oss-120b' or 'gpt-4o'
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  latency_ms INTEGER,
  cost_usd DECIMAL(10,6), -- calculated cost
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FRED Knowledge Documents
CREATE TABLE public.fred_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type VARCHAR(50) NOT NULL, -- 'upload', 'crawler', 'api'
  source_url TEXT,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  content_embedding VECTOR(1536), -- for RAG retrieval
  category VARCHAR(100), -- 'regulatory', 'financial', 'hr', 'lending'
  subcategory VARCHAR(100),
  effective_date DATE,
  expiration_date DATE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FRED Crawler Jobs
CREATE TABLE public.fred_crawler_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  url_pattern TEXT NOT NULL,
  schedule VARCHAR(50) NOT NULL, -- cron expression
  category VARCHAR(100) NOT NULL,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',
  config JSONB, -- selector, depth, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FRED Crawler Results
CREATE TABLE public.fred_crawler_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.fred_crawler_jobs(id),
  url TEXT NOT NULL,
  title VARCHAR(500),
  content TEXT,
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'pending'
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  knowledge_id UUID REFERENCES public.fred_knowledge(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FRED Invoices
CREATE TABLE public.fred_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL, -- Y-12 FCU account
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  total_tokens INTEGER NOT NULL,
  total_requests INTEGER NOT NULL,
  subtotal_usd DECIMAL(10,2) NOT NULL,
  tax_usd DECIMAL(10,2) DEFAULT 0,
  total_usd DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sent', 'paid'
  due_date DATE,
  paid_at TIMESTAMPTZ,
  details JSONB, -- breakdown by executive
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FRED Capability Requests (auto-learning)
CREATE TABLE public.fred_capability_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  query TEXT NOT NULL,
  detected_intent VARCHAR(255),
  capability_gap TEXT,
  suggested_action TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'new', -- 'new', 'reviewing', 'implemented', 'rejected'
  implemented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_fred_usage_user ON public.fred_usage(user_id);
CREATE INDEX idx_fred_usage_email ON public.fred_usage(executive_email);
CREATE INDEX idx_fred_usage_created ON public.fred_usage(created_at);
CREATE INDEX idx_fred_knowledge_category ON public.fred_knowledge(category);
CREATE INDEX idx_fred_knowledge_active ON public.fred_knowledge(is_active);
CREATE INDEX idx_fred_invoices_customer ON public.fred_invoices(customer_id);
CREATE INDEX idx_fred_invoices_status ON public.fred_invoices(status);
```

### 2.2 Vector Extension for RAG

```sql
-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embedding index
CREATE INDEX idx_fred_knowledge_embedding
  ON public.fred_knowledge
  USING ivfflat (content_embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## Phase 3: Knowledge Ingestion System (Days 5-12)

### 3.1 Document Upload API

New Edge Function: `supabase/functions/fred-knowledge/index.ts`

```typescript
// POST /functions/v1/fred-knowledge
// - Upload documents (PDF, DOCX, CSV)
// - Parse and chunk content
// - Generate embeddings via H200
// - Store in fred_knowledge table
```

### 3.2 Y-12 FCU Data Sources to Ingest

| Source | Type | Frequency | Category |
|--------|------|-----------|----------|
| Quarterly Earnings Reports | PDF | Quarterly | financial |
| Monthly Board Decks | PPTX/PDF | Monthly | board |
| NCUA 5300 Call Reports | XML | Quarterly | regulatory |
| HR Metrics Dashboard | API/CSV | Weekly | hr |
| Loan Portfolio Reports | CSV | Daily | lending |
| Member Growth Data | API | Daily | operations |
| FSB Integration Status | Manual | Weekly | integration |

### 3.3 Embedding Pipeline

```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  // Use H200 for embeddings (or fallback to OpenAI ada-002)
  const response = await fetch('http://86.38.238.94:8001/v1/embeddings', {
    method: 'POST',
    body: JSON.stringify({
      model: 'text-embedding-ada-002', // or H200 equivalent
      input: text
    })
  })
  return response.data[0].embedding
}
```

---

## Phase 4: Weekly Crawler System (Days 8-15)

### 4.1 Crawler Configuration

```typescript
const CRAWLER_JOBS = [
  {
    name: 'NCUA Regulations',
    url: 'https://www.ncua.gov/regulation-supervision/letters-credit-unions-other-guidance',
    schedule: '0 6 * * 1', // Every Monday 6am
    category: 'regulatory',
    selectors: {
      title: 'h1.page-title',
      content: '.field--name-body',
      date: '.date-display-single'
    }
  },
  {
    name: 'CFPB Updates',
    url: 'https://www.consumerfinance.gov/rules-policy/',
    schedule: '0 6 * * 2', // Every Tuesday 6am
    category: 'regulatory'
  },
  {
    name: 'Credit Union Times',
    url: 'https://www.cutimes.com/credit-unions/',
    schedule: '0 6 * * 3', // Every Wednesday 6am
    category: 'industry'
  },
  {
    name: 'CUNA News',
    url: 'https://news.cuna.org/',
    schedule: '0 6 * * 4', // Every Thursday 6am
    category: 'industry'
  },
  {
    name: 'Federal Reserve Updates',
    url: 'https://www.federalreserve.gov/newsevents.htm',
    schedule: '0 6 * * 5', // Every Friday 6am
    category: 'regulatory'
  }
]
```

### 4.2 Crawler Edge Function

New Edge Function: `supabase/functions/fred-crawler/index.ts`

```typescript
// Triggered by Supabase cron or external scheduler
// 1. Fetch URL with puppeteer/playwright
// 2. Extract content based on selectors
// 3. Check for duplicates
// 4. Generate embeddings
// 5. Store in fred_knowledge
// 6. Log results in fred_crawler_results
```

### 4.3 Scheduler Setup

Use Supabase pg_cron or external service (e.g., GitHub Actions):

```yaml
# .github/workflows/fred-crawlers.yml
name: FRED Weekly Crawlers
on:
  schedule:
    - cron: '0 6 * * 1-5' # Weekdays at 6am UTC
jobs:
  run-crawlers:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger FRED Crawler
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/fred-crawler" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}"
```

---

## Phase 5: Token Tracking & Invoicing (Days 12-20)

### 5.1 Usage Logging in Edge Function

```typescript
// After each FRED request, log usage
await supabase.from('fred_usage').insert({
  user_id: user.id,
  executive_email: executiveEmail,
  session_id: sessionId,
  request_id: requestId,
  query: messages[messages.length - 1].content,
  response: assistantMessage,
  model: isH200 ? 'gpt-oss-120b' : 'gpt-4o',
  prompt_tokens: usage.prompt_tokens,
  completion_tokens: usage.completion_tokens,
  total_tokens: usage.total_tokens,
  latency_ms: Date.now() - startTime,
  cost_usd: calculateCost(usage, isH200)
})
```

### 5.2 Cost Calculation

```typescript
const PRICING = {
  'gpt-oss-120b': {
    prompt: 0.00, // Self-hosted, no per-token cost
    completion: 0.00,
    monthlyInfra: 5000.00 // Fixed infrastructure cost
  },
  'gpt-4o': {
    prompt: 0.0025, // $2.50 per 1M tokens
    completion: 0.01 // $10 per 1M tokens
  }
}

function calculateCost(usage: Usage, isH200: boolean): number {
  const pricing = isH200 ? PRICING['gpt-oss-120b'] : PRICING['gpt-4o']
  return (usage.prompt_tokens * pricing.prompt / 1000000) +
         (usage.completion_tokens * pricing.completion / 1000000)
}
```

### 5.3 Invoice Generation

New Edge Function: `supabase/functions/fred-invoice/index.ts`

```typescript
// POST /functions/v1/fred-invoice
// Generates monthly invoice for Y-12 FCU

async function generateInvoice(month: string) {
  // 1. Aggregate usage for billing period
  const usage = await supabase
    .from('fred_usage')
    .select('executive_email, sum(total_tokens), count(*)')
    .gte('created_at', startOfMonth)
    .lt('created_at', endOfMonth)
    .group('executive_email')

  // 2. Calculate costs
  const breakdown = usage.map(u => ({
    executive: u.executive_email,
    tokens: u.sum,
    requests: u.count,
    cost: calculateCost(u.sum)
  }))

  // 3. Create invoice record
  const invoice = await supabase.from('fred_invoices').insert({
    invoice_number: `FRED-${month}-001`,
    customer_id: Y12_CUSTOMER_ID,
    billing_period_start: startOfMonth,
    billing_period_end: endOfMonth,
    total_tokens: sumTokens,
    total_requests: sumRequests,
    subtotal_usd: subtotal,
    total_usd: subtotal,
    details: { breakdown }
  })

  // 4. Generate PDF invoice
  return generatePDF(invoice)
}
```

### 5.4 Usage Dashboard

New React component: `src/pages/admin/FredUsage.tsx`

- Token usage by executive (chart)
- Request volume over time
- Model distribution (H200 vs fallback)
- Cost breakdown
- Export to CSV

---

## Phase 6: Request Analytics & Capability Expansion (Days 18-25)

### 6.1 Intent Detection

```typescript
// Analyze each query for capability gaps
async function analyzeQuery(query: string) {
  const intents = [
    { pattern: /quarterly.*report|earnings/i, intent: 'quarterly_report', exists: false },
    { pattern: /compare.*branch|branch.*comparison/i, intent: 'branch_comparison', exists: true },
    { pattern: /predict|forecast|projection/i, intent: 'forecasting', exists: false },
    { pattern: /competitor|market share/i, intent: 'competitive_intel', exists: false }
  ]

  for (const { pattern, intent, exists } of intents) {
    if (pattern.test(query) && !exists) {
      await logCapabilityGap(query, intent)
    }
  }
}
```

### 6.2 Capability Request Queue

```typescript
// Log capability gaps for review
async function logCapabilityGap(query: string, intent: string) {
  await supabase.from('fred_capability_requests').insert({
    user_id: auth.uid(),
    query: query,
    detected_intent: intent,
    capability_gap: `User requested ${intent} which is not fully implemented`,
    suggested_action: getSuggestedAction(intent),
    priority: getPriority(intent)
  })
}
```

### 6.3 Admin Review Interface

New page: `src/pages/admin/FredCapabilities.tsx`

- List of detected capability gaps
- Frequency of each request type
- Priority scoring
- Implementation status tracking
- One-click "Implement" workflow

### 6.4 Auto-Learning Pipeline

Weekly job to:
1. Analyze `fred_capability_requests` for patterns
2. Generate report of most-requested features
3. Auto-create knowledge entries for common queries
4. Alert engineering team for complex features

---

## Phase 7: RAG Integration (Days 20-27)

### 7.1 Context Retrieval

```typescript
// Before calling H200, retrieve relevant knowledge
async function getRelevantContext(query: string): Promise<string> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query)

  // Semantic search in knowledge base
  const { data: docs } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 5
  })

  // Format as context
  return docs.map(d => `
    ## ${d.title}
    ${d.content}
    Source: ${d.source_url || 'Internal Document'}
  `).join('\n\n')
}
```

### 7.2 Enhanced System Prompt

```typescript
const systemMessage = FRED_SYSTEM_PROMPT + `

## Available Knowledge Context
The following information is from Y-12 FCU's internal knowledge base:

${relevantContext}

Use this context to provide accurate, data-driven responses. Cite sources when referencing specific documents.
`
```

---

## Phase 8: Testing & Deployment (Days 25-30)

### 8.1 Test Cases

| Test | Expected Result |
|------|-----------------|
| H200 availability | Successful inference in <3s |
| Fallback to OpenAI | Graceful degradation when H200 down |
| Usage logging | All requests logged with tokens |
| Invoice generation | Accurate monthly totals |
| Crawler execution | Weekly updates ingested |
| RAG retrieval | Relevant context returned |
| Capability detection | Gaps logged for review |

### 8.2 Deployment Checklist

- [ ] H200 server connectivity verified
- [ ] Edge Functions deployed (fred-ai, fred-knowledge, fred-crawler, fred-invoice)
- [ ] Database migrations applied
- [ ] Crawler schedules configured
- [ ] Usage dashboard built
- [ ] Admin capabilities page built
- [ ] Invoice PDF generation working
- [ ] Alert monitoring configured
- [ ] Documentation updated

---

## Cost Analysis

### Current (OpenAI Pay-Per-Use)
- ~100K tokens/month = ~$3-5/month
- Scales linearly with usage

### Proposed (H200 Self-Hosted)
- Fixed infrastructure: $5,000/month (estimated)
- Per-token: $0 (self-hosted)
- Break-even: ~50M tokens/month

### Recommendation
For Y-12 FCU's executive team (4-5 users), current usage is likely low. Consider:
1. Start with H200 to establish infrastructure
2. Track actual usage for 3 months
3. Evaluate cost-effectiveness

---

## Deliverables Summary

| Deliverable | Priority | Complexity |
|-------------|----------|------------|
| H200 migration | P0 | Low |
| Usage tracking | P0 | Medium |
| Knowledge schema | P1 | Low |
| Crawler system | P1 | High |
| Invoice generation | P1 | Medium |
| RAG integration | P2 | High |
| Capability detection | P2 | Medium |
| Admin dashboards | P2 | Medium |

---

## Questions for Stakeholder

1. **H200 Server Access**: Confirm endpoint `86.38.238.94:8001` and authentication requirements
2. **Billing Model**: Fixed monthly fee or per-token pricing for Y-12?
3. **Data Sources**: Which Y-12 internal reports should be ingested first?
4. **Crawler Scope**: Any specific regulatory sites to prioritize?
5. **Invoice Format**: PDF template requirements?

---

*Plan created: November 29, 2025*
*Author: Claude Code*
