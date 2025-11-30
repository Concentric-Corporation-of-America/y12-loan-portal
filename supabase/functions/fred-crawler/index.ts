// FRED Crawler - Weekly regulatory and industry updates
// Supabase Edge Function for Y-12 Federal Credit Union

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// H200 for embeddings (fallback to OpenAI)
const H200_EMBEDDING_URL = Deno.env.get('H200_EMBEDDING_URL') || 'https://llm-api-o5l2m2dve.brevlab.com/v1/embeddings'
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CrawlerJob {
  id: string
  name: string
  url_pattern: string
  category: string
  subcategory?: string
  config: {
    selectors?: {
      title?: string
      content?: string
      date?: string
      links?: string
    }
    maxPages?: number
    userAgent?: string
  }
}

interface CrawlResult {
  url: string
  title: string
  content: string
  success: boolean
  error?: string
}

// Generate SHA-256 hash for content deduplication
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Fetch and parse a webpage
async function fetchPage(url: string, userAgent?: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': userAgent || 'FRED-Crawler/1.0 (Y-12 FCU Research Bot)',
      'Accept': 'text/html,application/xhtml+xml',
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  return response.text()
}

// Extract content from HTML
function extractContent(html: string, selectors?: CrawlerJob['config']['selectors']): CrawlResult {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  if (!doc) {
    throw new Error('Failed to parse HTML')
  }

  let title = ''
  let content = ''

  // Extract title
  if (selectors?.title) {
    const titleEl = doc.querySelector(selectors.title)
    title = titleEl?.textContent?.trim() || ''
  }
  if (!title) {
    const titleEl = doc.querySelector('title')
    title = titleEl?.textContent?.trim() || ''
  }

  // Extract content
  if (selectors?.content) {
    const contentEl = doc.querySelector(selectors.content)
    content = contentEl?.textContent?.trim() || ''
  }
  if (!content) {
    // Fallback: extract main content area
    const mainEl = doc.querySelector('main, article, .content, #content, .main-content')
    content = mainEl?.textContent?.trim() || ''
  }
  if (!content) {
    // Last resort: body text
    const bodyEl = doc.querySelector('body')
    content = bodyEl?.textContent?.trim()?.substring(0, 50000) || ''
  }

  // Clean up content
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()

  return {
    url: '',
    title,
    content,
    success: true
  }
}

// Generate embedding for content
async function generateEmbedding(text: string): Promise<number[] | null> {
  // Truncate text to fit embedding model limits
  const truncatedText = text.substring(0, 8000)

  try {
    // Try H200 first
    const response = await fetch(H200_EMBEDDING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: truncatedText
      })
    })

    if (response.ok) {
      const data = await response.json()
      return data.data?.[0]?.embedding || null
    }
  } catch (e) {
    console.warn('H200 embedding failed, trying OpenAI:', e)
  }

  // Fallback to OpenAI
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: truncatedText
        })
      })

      if (response.ok) {
        const data = await response.json()
        return data.data?.[0]?.embedding || null
      }
    } catch (e) {
      console.error('OpenAI embedding failed:', e)
    }
  }

  return null
}

// Process a single crawler job
async function processCrawlerJob(
  supabase: ReturnType<typeof createClient>,
  job: CrawlerJob
): Promise<{ success: number; failed: number; skipped: number }> {
  const stats = { success: 0, failed: 0, skipped: 0 }

  try {
    console.log(`Processing crawler job: ${job.name}`)

    // Fetch the page
    const html = await fetchPage(job.url_pattern, job.config?.userAgent)
    const result = extractContent(html, job.config?.selectors)
    result.url = job.url_pattern

    if (!result.content || result.content.length < 100) {
      console.warn(`No substantial content found for ${job.url_pattern}`)
      stats.failed++
      return stats
    }

    // Generate content hash for deduplication
    const contentHash = await hashContent(result.content)

    // Check for duplicate
    const { data: existing } = await supabase
      .from('fred_crawler_results')
      .select('id')
      .eq('content_hash', contentHash)
      .limit(1)

    if (existing && existing.length > 0) {
      console.log(`Skipping duplicate content for ${job.url_pattern}`)
      stats.skipped++

      // Log as skipped
      await supabase.from('fred_crawler_results').insert({
        job_id: job.id,
        url: result.url,
        title: result.title,
        status: 'skipped',
        content_hash: contentHash,
        processed_at: new Date().toISOString()
      })

      return stats
    }

    // Generate embedding
    const embedding = await generateEmbedding(result.content)

    // Store in knowledge base
    const { data: knowledge, error: knowledgeError } = await supabase
      .from('fred_knowledge')
      .insert({
        source_type: 'crawler',
        source_url: result.url,
        title: result.title || job.name,
        content: result.content,
        content_embedding: embedding,
        category: job.category,
        subcategory: job.subcategory,
        is_active: true,
        metadata: {
          crawled_at: new Date().toISOString(),
          job_id: job.id,
          job_name: job.name
        }
      })
      .select('id')
      .single()

    if (knowledgeError) {
      throw new Error(`Failed to store knowledge: ${knowledgeError.message}`)
    }

    // Log crawler result
    await supabase.from('fred_crawler_results').insert({
      job_id: job.id,
      url: result.url,
      title: result.title,
      content: result.content.substring(0, 5000), // Truncate for logging
      content_hash: contentHash,
      status: 'success',
      processed_at: new Date().toISOString(),
      knowledge_id: knowledge?.id
    })

    // Update job last run time
    await supabase
      .from('fred_crawler_jobs')
      .update({
        last_run_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        last_error: null
      })
      .eq('id', job.id)

    stats.success++
    console.log(`Successfully processed: ${job.name}`)

  } catch (error) {
    console.error(`Crawler job failed: ${job.name}`, error)
    stats.failed++

    // Log failure
    await supabase.from('fred_crawler_results').insert({
      job_id: job.id,
      url: job.url_pattern,
      status: 'failed',
      error_message: error.message,
      processed_at: new Date().toISOString()
    })

    // Update job with error
    await supabase
      .from('fred_crawler_jobs')
      .update({
        last_run_at: new Date().toISOString(),
        last_error: error.message
      })
      .eq('id', job.id)
  }

  return stats
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Parse request body for optional job filter
    let jobId: string | null = null
    let runAll = false

    try {
      const body = await req.json()
      jobId = body.jobId
      runAll = body.runAll === true
    } catch {
      // No body or invalid JSON - run due jobs only
    }

    // Get crawler jobs to run
    let query = supabase
      .from('fred_crawler_jobs')
      .select('*')
      .eq('status', 'active')

    if (jobId) {
      query = query.eq('id', jobId)
    } else if (!runAll) {
      // Only run jobs that are due (next_run_at <= now)
      query = query.or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`)
    }

    const { data: jobs, error: jobsError } = await query

    if (jobsError) {
      throw new Error(`Failed to fetch crawler jobs: ${jobsError.message}`)
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No crawler jobs to run',
          stats: { total: 0, success: 0, failed: 0, skipped: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Running ${jobs.length} crawler job(s)...`)

    // Process each job
    const totalStats = { success: 0, failed: 0, skipped: 0 }

    for (const job of jobs) {
      const jobStats = await processCrawlerJob(supabase, job as CrawlerJob)
      totalStats.success += jobStats.success
      totalStats.failed += jobStats.failed
      totalStats.skipped += jobStats.skipped

      // Update next run time (add 7 days for weekly schedule)
      const nextRun = new Date()
      nextRun.setDate(nextRun.getDate() + 7)

      await supabase
        .from('fred_crawler_jobs')
        .update({ next_run_at: nextRun.toISOString() })
        .eq('id', job.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${jobs.length} crawler job(s)`,
        stats: {
          total: jobs.length,
          ...totalStats
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Crawler error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Crawler execution failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
