// Security Event Logger - Captures security events with IP and user agent
// For NCUA Part 748 compliance and audit trail requirements

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SecurityEventRequest {
  event_type: string
  description?: string
  metadata?: Record<string, unknown>
  risk_score?: number
}

const VALID_EVENT_TYPES = [
  'login_success',
  'login_failure',
  'logout',
  'password_change',
  'password_reset_request',
  'mfa_enrolled',
  'mfa_verified',
  'mfa_failed',
  'role_change',
  'permission_denied',
  'sensitive_data_access',
  'export_request',
  'admin_action',
  'api_access'
]

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (!error && user) {
        userId = user.id
      }
    }

    // Extract IP address and user agent
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || req.headers.get('cf-connecting-ip')
      || null
    const userAgent = req.headers.get('user-agent') || null

    const body: SecurityEventRequest = await req.json()

    // Validate event type
    if (!body.event_type || !VALID_EVENT_TYPES.includes(body.event_type)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid event_type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Calculate risk score if not provided
    let riskScore = body.risk_score
    if (riskScore === undefined) {
      // Auto-calculate risk score based on event type
      const riskScores: Record<string, number> = {
        'login_success': 10,
        'login_failure': 40,
        'logout': 5,
        'password_change': 30,
        'password_reset_request': 50,
        'mfa_enrolled': 20,
        'mfa_verified': 10,
        'mfa_failed': 60,
        'role_change': 70,
        'permission_denied': 50,
        'sensitive_data_access': 40,
        'export_request': 60,
        'admin_action': 50,
        'api_access': 20
      }
      riskScore = riskScores[body.event_type] || 25
    }

    // Insert security event
    const { data, error } = await supabase
      .from('security_events')
      .insert({
        user_id: userId,
        event_type: body.event_type,
        description: body.description || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: body.metadata || null,
        risk_score: riskScore
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting security event:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_id: data.id,
        message: 'Security event logged successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Security event error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
