// FRED Invoice Generator
// Supabase Edge Function for Y-12 Federal Credit Union billing

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Pricing configuration - Usage-based only, no fixed fees
const PRICING = {
  // Self-hosted H200 - usage-based pricing per 1M tokens
  h200_prompt_per_1m: 0.50,      // $0.50 per 1M prompt tokens
  h200_completion_per_1m: 1.50,  // $1.50 per 1M completion tokens

  // OpenAI fallback - pay per use
  openai_prompt_per_1m: 2.50,
  openai_completion_per_1m: 10.00
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UsageSummary {
  executive_email: string
  total_requests: number
  total_tokens: number
  h200_tokens: number
  openai_tokens: number
  total_cost: number
}

interface InvoiceRequest {
  year: number
  month: number
  dryRun?: boolean
}

// Calculate OpenAI cost from tokens
function calculateOpenAICost(promptTokens: number, completionTokens: number): number {
  const promptCost = (promptTokens / 1000000) * PRICING.openai_prompt_per_1m
  const completionCost = (completionTokens / 1000000) * PRICING.openai_completion_per_1m
  return promptCost + completionCost
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Generate invoice number
function generateInvoiceNumber(year: number, month: number, sequence: number): string {
  const monthStr = month.toString().padStart(2, '0')
  const seqStr = sequence.toString().padStart(4, '0')
  return `FRED-${year}-${monthStr}-${seqStr}`
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Parse request
    const { year, month, dryRun = false }: InvoiceRequest = await req.json()

    // Validate inputs
    if (!year || !month || month < 1 || month > 12) {
      throw new Error('Invalid year or month')
    }

    // Calculate billing period
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1)

    console.log(`Generating invoice for ${year}-${month.toString().padStart(2, '0')}`)
    console.log(`Billing period: ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // Get usage summary by executive
    const { data: usageData, error: usageError } = await supabase.rpc(
      'get_monthly_usage_summary',
      {
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      }
    )

    if (usageError) {
      console.error('Usage query error:', usageError)
      throw new Error(`Failed to get usage data: ${usageError.message}`)
    }

    const usage = (usageData || []) as UsageSummary[]

    // Calculate totals
    const totalRequests = usage.reduce((sum, u) => sum + Number(u.total_requests), 0)
    const totalTokens = usage.reduce((sum, u) => sum + Number(u.total_tokens), 0)
    const h200Tokens = usage.reduce((sum, u) => sum + Number(u.h200_tokens), 0)
    const openaiTokens = usage.reduce((sum, u) => sum + Number(u.openai_tokens), 0)

    // Calculate costs - usage-based only
    const subtotal = usage.reduce((sum, u) => sum + Number(u.total_cost), 0)
    const total = subtotal // No infrastructure fee, purely usage-based

    // Build invoice details
    const details = {
      billing_period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      summary: {
        total_requests: totalRequests,
        total_tokens: totalTokens,
        h200_tokens: h200Tokens,
        openai_tokens: openaiTokens
      },
      by_executive: usage.map(u => ({
        email: u.executive_email,
        requests: Number(u.total_requests),
        tokens: Number(u.total_tokens),
        h200_tokens: Number(u.h200_tokens),
        openai_tokens: Number(u.openai_tokens),
        cost: Number(u.total_cost)
      })),
      pricing: {
        h200_prompt_per_1m: PRICING.h200_prompt_per_1m,
        h200_completion_per_1m: PRICING.h200_completion_per_1m,
        openai_prompt_per_1m: PRICING.openai_prompt_per_1m,
        openai_completion_per_1m: PRICING.openai_completion_per_1m
      },
      line_items: [
        {
          description: `H200 Self-Hosted Inference (${h200Tokens.toLocaleString()} tokens)`,
          quantity: h200Tokens,
          unit_price: `$${PRICING.h200_prompt_per_1m}/$${PRICING.h200_completion_per_1m} per 1M`,
          amount: (h200Tokens / 1000000) * ((PRICING.h200_prompt_per_1m + PRICING.h200_completion_per_1m) / 2)
        },
        {
          description: `OpenAI GPT-4o Fallback (${openaiTokens.toLocaleString()} tokens)`,
          quantity: openaiTokens,
          unit_price: `$${PRICING.openai_prompt_per_1m}/$${PRICING.openai_completion_per_1m} per 1M`,
          amount: (openaiTokens / 1000000) * ((PRICING.openai_prompt_per_1m + PRICING.openai_completion_per_1m) / 2)
        }
      ]
    }

    // If dry run, return preview without creating invoice
    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          preview: {
            billing_period: details.billing_period,
            summary: details.summary,
            subtotal: formatCurrency(subtotal),
            total: formatCurrency(total),
            by_executive: details.by_executive
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get next invoice sequence number
    const { count } = await supabase
      .from('fred_invoices')
      .select('*', { count: 'exact', head: true })
      .gte('billing_period_start', startDate.toISOString())
      .lt('billing_period_start', endDate.toISOString())

    const sequence = (count || 0) + 1
    const invoiceNumber = generateInvoiceNumber(year, month, sequence)

    // Calculate due date (Net 30)
    const dueDate = new Date(endDate)
    dueDate.setDate(dueDate.getDate() + 30)

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('fred_invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_name: 'Y-12 Federal Credit Union',
        billing_period_start: startDate.toISOString().split('T')[0],
        billing_period_end: endDate.toISOString().split('T')[0],
        total_tokens: totalTokens,
        total_requests: totalRequests,
        h200_tokens: h200Tokens,
        openai_tokens: openaiTokens,
        subtotal_usd: subtotal,
        infrastructure_fee_usd: 0, // No infrastructure fee - usage-based only
        total_usd: total,
        status: 'draft',
        due_date: dueDate.toISOString().split('T')[0],
        details: details
      })
      .select()
      .single()

    if (invoiceError) {
      throw new Error(`Failed to create invoice: ${invoiceError.message}`)
    }

    console.log(`Created invoice: ${invoiceNumber}`)

    return new Response(
      JSON.stringify({
        success: true,
        invoice: {
          id: invoice.id,
          invoice_number: invoiceNumber,
          billing_period: details.billing_period,
          summary: {
            total_requests: totalRequests,
            total_tokens: totalTokens.toLocaleString(),
            h200_tokens: h200Tokens.toLocaleString(),
            openai_tokens: openaiTokens.toLocaleString()
          },
          amounts: {
            subtotal: formatCurrency(subtotal),
            total: formatCurrency(total)
          },
          status: 'draft',
          due_date: dueDate.toISOString().split('T')[0],
          by_executive: details.by_executive.map(e => ({
            ...e,
            cost: formatCurrency(e.cost)
          }))
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Invoice generation error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Invoice generation failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
