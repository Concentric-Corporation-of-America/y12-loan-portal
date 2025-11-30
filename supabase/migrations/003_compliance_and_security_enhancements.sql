-- Migration: Compliance and Security Enhancements for Federal Credit Union Requirements
-- Implements BSA/AML monitoring, security event logging, and compliance tracking

-- ============================================================================
-- COMPLIANCE ALERTS TABLE (BSA/AML Support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.compliance_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES public.members(id),
  loan_id UUID REFERENCES public.loans(id),
  payment_id UUID REFERENCES public.loan_payments(id),
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'large_transaction',
    'unusual_pattern',
    'rapid_payments',
    'threshold_structuring',
    'account_anomaly',
    'identity_verification',
    'suspicious_activity'
  )),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  details JSONB,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'escalated', 'closed', 'false_positive')),
  assigned_to UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECURITY EVENTS TABLE (Enhanced Audit Logging)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
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
  )),
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COMPLIANCE CONFIGURATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.compliance_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default compliance thresholds
INSERT INTO public.compliance_config (config_key, config_value, description) VALUES
  ('large_transaction_threshold', '{"amount": 10000}', 'Threshold for flagging large transactions (CTR requirement)'),
  ('rapid_payment_threshold', '{"count": 5, "hours": 24}', 'Number of payments within time period to flag'),
  ('structuring_threshold', '{"amount": 9000, "variance": 500}', 'Threshold for detecting potential structuring'),
  ('unusual_pattern_deviation', '{"std_dev_multiplier": 3}', 'Standard deviations from normal for unusual activity')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- INCIDENT RESPONSE LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.incident_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN (
    'security_breach',
    'data_exposure',
    'unauthorized_access',
    'system_outage',
    'compliance_violation',
    'fraud_detected',
    'other'
  )),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  affected_members INTEGER DEFAULT 0,
  affected_records INTEGER DEFAULT 0,
  detection_method VARCHAR(100),
  containment_actions TEXT,
  remediation_actions TEXT,
  root_cause TEXT,
  lessons_learned TEXT,
  reported_to_ncua BOOLEAN DEFAULT FALSE,
  ncua_report_date TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'remediated', 'closed')),
  reported_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- ============================================================================
-- DATA RETENTION POLICY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.data_retention_policy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(100) NOT NULL,
  retention_period_days INTEGER NOT NULL,
  retention_reason TEXT,
  regulatory_requirement VARCHAR(255),
  last_purge_date TIMESTAMPTZ,
  next_purge_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default retention policies per NCUA requirements
INSERT INTO public.data_retention_policy (table_name, retention_period_days, retention_reason, regulatory_requirement) VALUES
  ('audit_logs', 2555, 'Audit trail retention', 'NCUA Part 749 - 7 years'),
  ('security_events', 2555, 'Security event retention', 'NCUA Part 748 - 7 years'),
  ('compliance_alerts', 2555, 'BSA/AML records', 'BSA - 5 years minimum, 7 years recommended'),
  ('loan_applications', 2555, 'Loan records retention', 'NCUA Part 749 - 7 years'),
  ('loan_payments', 2555, 'Payment records retention', 'NCUA Part 749 - 7 years'),
  ('incident_log', 2555, 'Incident documentation', 'NCUA Part 748 - 7 years')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status ON public.compliance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_severity ON public.compliance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_member_id ON public.compliance_alerts(member_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_created_at ON public.compliance_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON public.security_events(ip_address);

CREATE INDEX IF NOT EXISTS idx_incident_log_status ON public.incident_log(status);
CREATE INDEX IF NOT EXISTS idx_incident_log_severity ON public.incident_log(severity);
CREATE INDEX IF NOT EXISTS idx_incident_log_created_at ON public.incident_log(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policy ENABLE ROW LEVEL SECURITY;

-- Compliance alerts - only compliance officers and admins
CREATE POLICY "Compliance staff can view alerts"
  ON public.compliance_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'compliance_officer')
    )
  );

CREATE POLICY "Compliance staff can manage alerts"
  ON public.compliance_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'compliance_officer')
    )
  );

-- Security events - admin only
CREATE POLICY "Admins can view security events"
  ON public.security_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "System can insert security events"
  ON public.security_events FOR INSERT
  WITH CHECK (true);

-- Compliance config - admin only
CREATE POLICY "Admins can manage compliance config"
  ON public.compliance_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Incident log - admin and compliance officers
CREATE POLICY "Authorized staff can manage incidents"
  ON public.incident_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'compliance_officer')
    )
  );

-- Data retention policy - admin only
CREATE POLICY "Admins can manage retention policies"
  ON public.data_retention_policy FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================================================
-- BSA/AML MONITORING FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_payment_compliance()
RETURNS TRIGGER AS $$
DECLARE
  large_threshold DECIMAL;
  rapid_count INTEGER;
  rapid_hours INTEGER;
  recent_payment_count INTEGER;
BEGIN
  -- Get thresholds from config
  SELECT (config_value->>'amount')::DECIMAL INTO large_threshold
  FROM public.compliance_config WHERE config_key = 'large_transaction_threshold';
  
  SELECT (config_value->>'count')::INTEGER INTO rapid_count
  FROM public.compliance_config WHERE config_key = 'rapid_payment_threshold';
  
  SELECT (config_value->>'hours')::INTEGER INTO rapid_hours
  FROM public.compliance_config WHERE config_key = 'rapid_payment_threshold';

  -- Default values if config not found
  large_threshold := COALESCE(large_threshold, 10000);
  rapid_count := COALESCE(rapid_count, 5);
  rapid_hours := COALESCE(rapid_hours, 24);

  -- Check for large transaction
  IF NEW.amount >= large_threshold THEN
    INSERT INTO public.compliance_alerts (
      member_id, loan_id, payment_id, alert_type, severity, description, details
    )
    SELECT 
      l.member_id, 
      NEW.loan_id, 
      NEW.id, 
      'large_transaction', 
      'high',
      'Payment of $' || NEW.amount || ' exceeds CTR threshold of $' || large_threshold,
      jsonb_build_object('amount', NEW.amount, 'threshold', large_threshold, 'loan_number', l.loan_number)
    FROM public.loans l WHERE l.id = NEW.loan_id;
  END IF;

  -- Check for rapid payments (potential structuring)
  SELECT COUNT(*) INTO recent_payment_count
  FROM public.loan_payments
  WHERE loan_id = NEW.loan_id
    AND created_at > NOW() - (rapid_hours || ' hours')::INTERVAL;

  IF recent_payment_count >= rapid_count THEN
    INSERT INTO public.compliance_alerts (
      member_id, loan_id, payment_id, alert_type, severity, description, details
    )
    SELECT 
      l.member_id, 
      NEW.loan_id, 
      NEW.id, 
      'rapid_payments', 
      'medium',
      recent_payment_count || ' payments within ' || rapid_hours || ' hours detected',
      jsonb_build_object('payment_count', recent_payment_count, 'hours', rapid_hours, 'loan_number', l.loan_number)
    FROM public.loans l WHERE l.id = NEW.loan_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment compliance checking
DROP TRIGGER IF EXISTS check_payment_compliance_trigger ON public.loan_payments;
CREATE TRIGGER check_payment_compliance_trigger
  AFTER INSERT ON public.loan_payments
  FOR EACH ROW EXECUTE FUNCTION public.check_payment_compliance();

-- ============================================================================
-- AUDIT TRIGGER FOR NEW TABLES
-- ============================================================================
CREATE TRIGGER audit_compliance_alerts
  AFTER INSERT OR UPDATE OR DELETE ON public.compliance_alerts
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_incident_log
  AFTER INSERT OR UPDATE OR DELETE ON public.incident_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- DATA EXPORT FUNCTION (Exit Strategy Support)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.export_member_data(p_member_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Only allow admins or the member themselves to export
  IF NOT (
    auth.uid() IN (SELECT user_id FROM public.members WHERE id = p_member_id)
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot export data for this member';
  END IF;

  SELECT jsonb_build_object(
    'export_date', NOW(),
    'member', (SELECT to_jsonb(m.*) FROM public.members m WHERE m.id = p_member_id),
    'loan_applications', (
      SELECT COALESCE(jsonb_agg(to_jsonb(la.*)), '[]'::jsonb)
      FROM public.loan_applications la WHERE la.member_id = p_member_id
    ),
    'loans', (
      SELECT COALESCE(jsonb_agg(to_jsonb(l.*)), '[]'::jsonb)
      FROM public.loans l WHERE l.member_id = p_member_id
    ),
    'loan_payments', (
      SELECT COALESCE(jsonb_agg(to_jsonb(lp.*)), '[]'::jsonb)
      FROM public.loan_payments lp
      JOIN public.loans l ON lp.loan_id = l.id
      WHERE l.member_id = p_member_id
    )
  ) INTO result;

  -- Log the export request
  INSERT INTO public.security_events (user_id, event_type, description, metadata)
  VALUES (
    auth.uid(),
    'export_request',
    'Member data export requested',
    jsonb_build_object('member_id', p_member_id, 'export_type', 'full_member_data')
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.export_member_data(UUID) TO authenticated;
