// FRED AI - Financial Research & Executive Decision Assistant
// Supabase Edge Function for Y-12 Federal Credit Union

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// OpenAI API Key from environment variable
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''

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
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, executiveEmail, maxTokens = 1500, temperature = 0.7 }: RequestBody = await req.json()

    // Get executive profile for personalization
    const profile = executiveEmail ? EXECUTIVE_PROFILES[executiveEmail] : null
    
    // Build system message with executive context
    let systemMessage = FRED_SYSTEM_PROMPT
    if (profile) {
      systemMessage += `\n\n## Current Executive Context\n${profile.systemContext}\n\nAddress the executive by name (${profile.name}) and tailor responses to their specific focus areas: ${profile.focus.join(', ')}.`
    }

    // Prepare messages for OpenAI
    const openaiMessages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      ...messages
    ]

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: openaiMessages,
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const assistantMessage = data.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.'

    return new Response(
      JSON.stringify({
        success: true,
        message: assistantMessage,
        usage: data.usage,
        model: data.model,
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
