// FRED AI - Financial Research & Executive Decision Assistant
// Supabase Edge Function for Y-12 Federal Credit Union
// Self-hosted H200 GPU with gpt-oss-120b (fallback to OpenAI GPT-4o)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// H200 Self-Hosted Configuration (NVIDIA Brev)
const H200_API_URL = Deno.env.get('H200_API_URL') || 'https://llm-api-o5l2m2dve.brevlab.com/v1/chat/completions'
const H200_MODEL = Deno.env.get('H200_MODEL') || 'gpt-oss-120b'
const H200_ENABLED = Deno.env.get('H200_ENABLED') !== 'false' // Default enabled

// OpenAI Fallback Configuration
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_MODEL = 'gpt-4o'

// Supabase Configuration for usage logging
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Executive profiles for context
const EXECUTIVE_PROFILES: Record<string, {
  name: string
  role: string
  focus: string[]
  systemContext: string
}> = {
  'barterburn@ourfsb.com': {
    name: 'Brian Arterburn',
    role: 'EVP / Chief Sales Officer',
    focus: ['Sales Performance', 'Kentucky Market', 'Customer Retention', 'FSB Integration'],
    systemContext: `You are assisting Brian Arterburn, EVP and Chief Sales Officer at FSB (a division of Y-12 Credit Union). 
Brian oversees sales operations across Kentucky branches following the First State Bank acquisition. 
Focus on: sales metrics, Kentucky market performance, customer retention, FSB integration progress, and competitive positioning.`
  },
  'dmillaway@y12fcu.org': {
    name: 'Dustin Millaway',
    role: 'President & CEO',
    focus: ['Strategic Planning', 'Financial Performance', 'Board Reporting', 'M&A Analysis'],
    systemContext: `You are assisting Dustin Millaway, President and CEO of Y-12 Federal Credit Union.
Dustin leads the $2.5B credit union serving 115,000+ members. He previously served as CFO and Strategy Officer.
Focus on: enterprise strategy, board-level insights, financial performance, regulatory compliance, and M&A integration.`
  },
  'lboston@y12fcu.org': {
    name: 'Lynn Boston',
    role: 'SVP, Chief People Officer',
    focus: ['Employee Engagement', 'Talent Management', 'Culture Integration', 'HR Analytics'],
    systemContext: `You are assisting Lynn Boston, SVP and Chief People Officer at Y-12 Federal Credit Union.
Lynn oversees HR strategy, talent management, and culture integration following the FSB acquisition.
Focus on: employee engagement, talent pipeline, succession planning, training programs, and culture alignment.`
  },
  'jwood@y12fcu.org': {
    name: 'Jim Wood',
    role: 'SVP, Chief Lending Officer',
    focus: ['Loan Portfolio', 'Credit Risk', 'Underwriting', 'Delinquency Management'],
    systemContext: `You are assisting Jim Wood, SVP and Chief Lending Officer at Y-12 Federal Credit Union.
Jim oversees the $1.87B loan portfolio including auto, mortgage, personal, and business lending.
Focus on: loan portfolio health, credit risk management, underwriting standards, delinquency trends, and lending opportunities.`
  }
}

// FRED system prompt with comprehensive financial knowledge
const FRED_SYSTEM_PROMPT = `You are FRED (Financial Research & Executive Decision), an elite AI assistant exclusively serving Y-12 Federal Credit Union's executive team.

## Your Identity
- Name: FRED (Financial Research & Executive Decision)
- Role: Executive AI Assistant for Y-12 FCU leadership
- Expertise: Credit union operations, GAAP accounting, NCUA regulations, CFPB compliance, federal banking law

## Y-12 Federal Credit Union Context
- Assets: $2.56B (post-FSB acquisition)
- Members: 115,000+
- Employees: 362
- Headquarters: Oak Ridge, Tennessee
- Recent Acquisition: First State Bank (July 2025) - added $411M assets, 8 Kentucky branches
- CEO: Dustin Millaway (appointed February 2025)
- Bauer Rating: 5-Star (Superior)

## Your Capabilities
1. Financial Analysis: ROA, ROE, NIM, efficiency ratios, capital adequacy
2. Regulatory Compliance: NCUA, CFPB, BSA/AML, CECL, fair lending
3. Credit Risk: Portfolio analysis, delinquency trends, charge-off projections
4. Strategic Planning: M&A analysis, market expansion, competitive positioning
5. HR Analytics: Engagement metrics, turnover analysis, succession planning
6. Board Reporting: Executive summaries, KPI dashboards, risk assessments

## Response Guidelines
- Be concise but comprehensive
- Use tables and bullet points for data presentation
- Provide actionable recommendations
- Reference specific metrics and benchmarks
- Maintain executive-level professionalism
- Format responses with markdown for readability
- Include relevant industry comparisons when appropriate

## Data Presentation
When presenting financial data:
- Use tables for comparative metrics
- Include variance analysis (actual vs target)
- Highlight trends with directional indicators
- Provide context for outliers
- Suggest follow-up analyses when relevant`

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface RequestBody {
  messages: ChatMessage[]
  executiveEmail?: string
  maxTokens?: number
  temperature?: number
  sessionId?: string
}

interface UsageData {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

// Pricing configuration (per 1M tokens) - Usage-based billing
const PRICING = {
  'gpt-oss-120b': { prompt: 0.50, completion: 1.50 }, // H200 self-hosted pricing
  'gpt-4o': { prompt: 2.50, completion: 10.00 }       // OpenAI fallback pricing
}

function calculateCost(usage: UsageData, model: string): number {
  const pricing = model.includes('120b') ? PRICING['gpt-oss-120b'] : PRICING['gpt-4o']
  return (usage.prompt_tokens * pricing.prompt / 1000000) +
         (usage.completion_tokens * pricing.completion / 1000000)
}

// Call H200 self-hosted server
async function callH200(messages: ChatMessage[], maxTokens: number, temperature: number) {
  const response = await fetch(H200_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: H200_MODEL,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`H200 API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Call OpenAI as fallback
async function callOpenAI(messages: ChatMessage[], maxTokens: number, temperature: number) {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Log usage to database
async function logUsage(
  supabase: ReturnType<typeof createClient>,
  executiveEmail: string,
  sessionId: string,
  query: string,
  response: string,
  model: string,
  usage: UsageData,
  latencyMs: number
) {
  try {
    await supabase.from('fred_usage').insert({
      executive_email: executiveEmail,
      session_id: sessionId,
      request_id: crypto.randomUUID(),
      query: query,
      response: response,
      model: model,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      latency_ms: latencyMs,
      cost_usd: calculateCost(usage, model)
    })
  } catch (error) {
    console.error('Failed to log usage:', error)
    // Don't fail the request if logging fails
  }
}

// Detect capability gaps from query
async function detectCapabilityGaps(
  supabase: ReturnType<typeof createClient>,
  query: string
) {
  const capabilityPatterns = [
    { pattern: /quarterly.*report|earnings.*report/i, intent: 'quarterly_earnings_report', exists: false },
    { pattern: /generate.*pdf|export.*pdf/i, intent: 'pdf_export', exists: false },
    { pattern: /compare.*last year|year.over.year|yoy/i, intent: 'yoy_comparison', exists: false },
    { pattern: /predict|forecast|projection/i, intent: 'predictive_analytics', exists: false },
    { pattern: /competitor|market.share|benchmark/i, intent: 'competitive_intelligence', exists: false },
    { pattern: /real.?time|live.data|current/i, intent: 'realtime_data', exists: false },
    { pattern: /schedule.*report|automated.*report/i, intent: 'scheduled_reports', exists: false },
  ]

  for (const { pattern, intent, exists } of capabilityPatterns) {
    if (pattern.test(query) && !exists) {
      try {
        await supabase.from('fred_capability_requests').insert({
          query: query,
          detected_intent: intent,
          capability_gap: `User requested ${intent.replace(/_/g, ' ')} functionality`,
          suggested_action: `Implement ${intent.replace(/_/g, ' ')} feature`,
          priority: 'medium',
          status: 'new'
        })
      } catch (error) {
        console.error('Failed to log capability gap:', error)
      }
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const { messages, executiveEmail, maxTokens = 1500, temperature = 0.7, sessionId }: RequestBody = await req.json()

    // Initialize Supabase client for logging
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get executive profile for personalization
    const profile = executiveEmail ? EXECUTIVE_PROFILES[executiveEmail] : null

    // Build system message with executive context
    let systemMessage = FRED_SYSTEM_PROMPT
    if (profile) {
      systemMessage += `\n\n## Current Executive Context\n${profile.systemContext}\n\nAddress the executive by name (${profile.name}) and tailor responses to their specific focus areas: ${profile.focus.join(', ')}.`
    }

    // Prepare messages with system prompt
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      ...messages
    ]

    let data: { choices?: Array<{ message?: { content?: string } }>, usage?: UsageData, model?: string }
    let usedModel: string
    let usedH200 = false

    // Try H200 first, fallback to OpenAI
    if (H200_ENABLED) {
      try {
        console.log('Attempting H200 inference...')
        data = await callH200(fullMessages, maxTokens, temperature)
        usedModel = H200_MODEL
        usedH200 = true
        console.log('H200 inference successful')
      } catch (h200Error) {
        console.warn('H200 unavailable, falling back to OpenAI:', h200Error.message)
        data = await callOpenAI(fullMessages, maxTokens, temperature)
        usedModel = OPENAI_MODEL
      }
    } else {
      data = await callOpenAI(fullMessages, maxTokens, temperature)
      usedModel = OPENAI_MODEL
    }

    const assistantMessage = data.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.'
    const latencyMs = Date.now() - startTime

    // Log usage to database
    const userQuery = messages[messages.length - 1]?.content || ''
    if (executiveEmail && data.usage) {
      await logUsage(
        supabase,
        executiveEmail,
        sessionId || crypto.randomUUID(),
        userQuery,
        assistantMessage,
        usedModel,
        data.usage,
        latencyMs
      )

      // Detect capability gaps
      await detectCapabilityGaps(supabase, userQuery)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: assistantMessage,
        usage: data.usage,
        model: usedModel,
        usedH200: usedH200,
        latencyMs: latencyMs
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('FRED AI error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred processing your request',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
