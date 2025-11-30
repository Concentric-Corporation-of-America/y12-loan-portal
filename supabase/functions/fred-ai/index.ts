// FRED AI - Financial Research & Executive Decision Assistant
// Supabase Edge Function for Y-12 Federal Credit Union
// Uses H200 gpt-oss-120b as primary with OpenAI GPT-4o fallback

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// H200 Server Configuration (Primary - Self-hosted, cost-effective)
const H200_API_URL = Deno.env.get('H200_API_URL') || 'https://llm-api-o5l2m2dve.brevlab.com/v1/chat/completions'
const H200_MODEL = Deno.env.get('H200_MODEL') || 'gpt-oss-120b'
const H200_ENABLED = Deno.env.get('H200_ENABLED') !== 'false' // Default enabled

// OpenAI Configuration (Fallback)
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const OPENAI_MODEL = 'gpt-4o'

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

## Response Style
Write in a natural, conversational tone like a trusted advisor speaking directly to an executive colleague. Avoid markdown formatting like hashtags, asterisks, or bullet points. Instead, use flowing prose and complete sentences. When discussing multiple topics, use natural transitions rather than lists. Keep responses focused and direct without being robotic. Speak as a knowledgeable colleague would in a one-on-one meeting, not as a report generator.

When presenting numbers or comparisons, weave them naturally into sentences rather than creating tables or formatted lists. For example, say "Your loan portfolio is performing well at 4.2% ROA, which puts you ahead of the 3.8% industry average" rather than creating a comparison table.

Be warm but professional. Use the executive's name occasionally. Offer to dive deeper on specific topics rather than overwhelming with information upfront.`

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

    // Prepare messages for AI
    const aiMessages: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      ...messages
    ]

    let assistantMessage: string
    let modelUsed: string
    let usage: unknown

    // Try H200 first (primary - self-hosted, cost-effective)
    if (H200_ENABLED) {
      try {
        console.log('Attempting H200 server:', H200_API_URL)
        const h200Response = await fetch(H200_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: H200_MODEL,
            messages: aiMessages,
            max_tokens: maxTokens,
            temperature: temperature,
          }),
        })

        if (h200Response.ok) {
          const h200Data = await h200Response.json()
          assistantMessage = h200Data.choices?.[0]?.message?.content
          if (assistantMessage) {
            modelUsed = H200_MODEL
            usage = h200Data.usage
            console.log('H200 response successful, model:', H200_MODEL)
            
            return new Response(
              JSON.stringify({
                success: true,
                message: assistantMessage,
                usage: usage,
                model: modelUsed,
                provider: 'h200',
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            )
          }
        }
        console.log('H200 response not ok, falling back to OpenAI')
      } catch (h200Error) {
        console.error('H200 error, falling back to OpenAI:', h200Error)
      }
    }

    // Fallback to OpenAI GPT-4o
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured and H200 unavailable')
    }

    console.log('Using OpenAI fallback:', OPENAI_MODEL)
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: aiMessages,
        max_tokens: maxTokens,
        temperature: temperature,
      }),
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiData = await openaiResponse.json()
    assistantMessage = openaiData.choices?.[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.'
    modelUsed = openaiData.model
    usage = openaiData.usage

    return new Response(
      JSON.stringify({
        success: true,
        message: assistantMessage,
        usage: usage,
        model: modelUsed,
        provider: 'openai',
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
