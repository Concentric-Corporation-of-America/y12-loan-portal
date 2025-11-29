-- FRED Enterprise Schema
-- Usage tracking, knowledge base, crawlers, invoicing, and capability detection
-- Created: November 29, 2025

-- Enable pgvector extension for semantic search (RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- FRED Usage Tracking
-- ============================================
CREATE TABLE IF NOT EXISTS public.fred_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  executive_email VARCHAR(255) NOT NULL,
  session_id UUID NOT NULL,
  request_id UUID NOT NULL,
  query TEXT NOT NULL,
  response TEXT,
  model VARCHAR(50) NOT NULL, -- 'gpt-oss-120b' or 'gpt-4o'
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  cost_usd DECIMAL(10,6) DEFAULT 0, -- calculated cost
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FRED Knowledge Base (for RAG)
-- ============================================
CREATE TABLE IF NOT EXISTS public.fred_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('upload', 'crawler', 'api', 'manual')),
  source_url TEXT,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  content_embedding VECTOR(1536), -- for semantic search
  category VARCHAR(100) NOT NULL, -- 'regulatory', 'financial', 'hr', 'lending', 'industry'
  subcategory VARCHAR(100),
  effective_date DATE,
  expiration_date DATE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FRED Crawler Jobs
-- ============================================
CREATE TABLE IF NOT EXISTS public.fred_crawler_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  url_pattern TEXT NOT NULL,
  schedule VARCHAR(50) NOT NULL, -- cron expression
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'failed')),
  config JSONB DEFAULT '{}', -- selector, depth, headers, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default crawler jobs
INSERT INTO public.fred_crawler_jobs (name, description, url_pattern, schedule, category, config) VALUES
  ('NCUA Letters to Credit Unions', 'Weekly NCUA regulatory updates', 'https://www.ncua.gov/regulation-supervision/letters-credit-unions-other-guidance', '0 6 * * 1', 'regulatory', '{"selectors": {"title": "h1.page-title", "content": ".field--name-body"}}'),
  ('CFPB Rules and Policy', 'CFPB consumer protection updates', 'https://www.consumerfinance.gov/rules-policy/', '0 6 * * 2', 'regulatory', '{"selectors": {"title": "h1", "content": "article"}}'),
  ('Credit Union Times', 'Industry news and trends', 'https://www.cutimes.com/credit-unions/', '0 6 * * 3', 'industry', '{}'),
  ('CUNA News', 'Credit Union National Association updates', 'https://news.cuna.org/', '0 6 * * 4', 'industry', '{}'),
  ('Federal Reserve Updates', 'Federal Reserve news and policy', 'https://www.federalreserve.gov/newsevents.htm', '0 6 * * 5', 'regulatory', '{}')
ON CONFLICT DO NOTHING;

-- ============================================
-- FRED Crawler Results
-- ============================================
CREATE TABLE IF NOT EXISTS public.fred_crawler_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.fred_crawler_jobs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title VARCHAR(500),
  content TEXT,
  content_hash VARCHAR(64), -- SHA-256 for deduplication
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'skipped', 'pending')),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  knowledge_id UUID REFERENCES public.fred_knowledge(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FRED Invoices
-- ============================================
CREATE TABLE IF NOT EXISTS public.fred_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL DEFAULT 'Y-12 Federal Credit Union',
  customer_email VARCHAR(255),
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_requests INTEGER NOT NULL DEFAULT 0,
  h200_tokens INTEGER DEFAULT 0,
  openai_tokens INTEGER DEFAULT 0,
  subtotal_usd DECIMAL(10,2) NOT NULL DEFAULT 0,
  infrastructure_fee_usd DECIMAL(10,2) DEFAULT 0,
  tax_usd DECIMAL(10,2) DEFAULT 0,
  total_usd DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  details JSONB DEFAULT '{}', -- breakdown by executive
  notes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FRED Capability Requests (auto-learning)
-- ============================================
CREATE TABLE IF NOT EXISTS public.fred_capability_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  query TEXT NOT NULL,
  detected_intent VARCHAR(255),
  capability_gap TEXT,
  suggested_action TEXT,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'approved', 'implemented', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  implemented_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_fred_usage_email ON public.fred_usage(executive_email);
CREATE INDEX IF NOT EXISTS idx_fred_usage_session ON public.fred_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_fred_usage_created ON public.fred_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_fred_usage_model ON public.fred_usage(model);

CREATE INDEX IF NOT EXISTS idx_fred_knowledge_category ON public.fred_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_fred_knowledge_active ON public.fred_knowledge(is_active);
CREATE INDEX IF NOT EXISTS idx_fred_knowledge_source ON public.fred_knowledge(source_type);

CREATE INDEX IF NOT EXISTS idx_fred_crawler_jobs_status ON public.fred_crawler_jobs(status);
CREATE INDEX IF NOT EXISTS idx_fred_crawler_jobs_next_run ON public.fred_crawler_jobs(next_run_at);

CREATE INDEX IF NOT EXISTS idx_fred_crawler_results_job ON public.fred_crawler_results(job_id);
CREATE INDEX IF NOT EXISTS idx_fred_crawler_results_status ON public.fred_crawler_results(status);
CREATE INDEX IF NOT EXISTS idx_fred_crawler_results_hash ON public.fred_crawler_results(content_hash);

CREATE INDEX IF NOT EXISTS idx_fred_invoices_status ON public.fred_invoices(status);
CREATE INDEX IF NOT EXISTS idx_fred_invoices_period ON public.fred_invoices(billing_period_start, billing_period_end);

CREATE INDEX IF NOT EXISTS idx_fred_capability_status ON public.fred_capability_requests(status);
CREATE INDEX IF NOT EXISTS idx_fred_capability_intent ON public.fred_capability_requests(detected_intent);
CREATE INDEX IF NOT EXISTS idx_fred_capability_priority ON public.fred_capability_requests(priority);

-- Vector index for semantic search (IVFFlat for large datasets)
CREATE INDEX IF NOT EXISTS idx_fred_knowledge_embedding
  ON public.fred_knowledge
  USING ivfflat (content_embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE public.fred_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fred_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fred_crawler_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fred_crawler_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fred_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fred_capability_requests ENABLE ROW LEVEL SECURITY;

-- Admin-only access for FRED tables
CREATE POLICY "Admins can manage FRED usage"
  ON public.fred_usage FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can manage FRED knowledge"
  ON public.fred_knowledge FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can manage crawler jobs"
  ON public.fred_crawler_jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can manage crawler results"
  ON public.fred_crawler_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can manage invoices"
  ON public.fred_invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can manage capability requests"
  ON public.fred_capability_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Service role can insert (for Edge Functions)
CREATE POLICY "Service role can insert usage"
  ON public.fred_usage FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can insert knowledge"
  ON public.fred_knowledge FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can insert crawler results"
  ON public.fred_crawler_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can insert capability requests"
  ON public.fred_capability_requests FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to match documents by embedding similarity (for RAG)
CREATE OR REPLACE FUNCTION match_fred_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title VARCHAR(500),
  content TEXT,
  category VARCHAR(100),
  source_url TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fk.id,
    fk.title,
    fk.content,
    fk.category,
    fk.source_url,
    1 - (fk.content_embedding <=> query_embedding) AS similarity
  FROM public.fred_knowledge fk
  WHERE fk.is_active = true
    AND fk.content_embedding IS NOT NULL
    AND 1 - (fk.content_embedding <=> query_embedding) > match_threshold
  ORDER BY fk.content_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  year_month VARCHAR(7);
  seq_num INTEGER;
  new_number VARCHAR(50);
BEGIN
  year_month := TO_CHAR(NOW(), 'YYYY-MM');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'FRED-\d{4}-\d{2}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.fred_invoices
  WHERE invoice_number LIKE 'FRED-' || year_month || '-%';

  new_number := 'FRED-' || year_month || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to aggregate monthly usage for invoicing
CREATE OR REPLACE FUNCTION get_monthly_usage_summary(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  executive_email VARCHAR(255),
  total_requests BIGINT,
  total_tokens BIGINT,
  h200_tokens BIGINT,
  openai_tokens BIGINT,
  total_cost DECIMAL(10,6)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fu.executive_email,
    COUNT(*)::BIGINT AS total_requests,
    SUM(fu.total_tokens)::BIGINT AS total_tokens,
    SUM(CASE WHEN fu.model LIKE '%120b%' THEN fu.total_tokens ELSE 0 END)::BIGINT AS h200_tokens,
    SUM(CASE WHEN fu.model = 'gpt-4o' THEN fu.total_tokens ELSE 0 END)::BIGINT AS openai_tokens,
    SUM(fu.cost_usd) AS total_cost
  FROM public.fred_usage fu
  WHERE fu.created_at >= p_start_date
    AND fu.created_at < p_end_date
  GROUP BY fu.executive_email
  ORDER BY total_tokens DESC;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fred_knowledge_updated_at
  BEFORE UPDATE ON public.fred_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fred_crawler_jobs_updated_at
  BEFORE UPDATE ON public.fred_crawler_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fred_invoices_updated_at
  BEFORE UPDATE ON public.fred_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE public.fred_usage IS 'Tracks all FRED AI requests for billing and analytics';
COMMENT ON TABLE public.fred_knowledge IS 'Knowledge base for RAG - stores documents with embeddings';
COMMENT ON TABLE public.fred_crawler_jobs IS 'Configuration for weekly web crawlers';
COMMENT ON TABLE public.fred_crawler_results IS 'Results from crawler executions';
COMMENT ON TABLE public.fred_invoices IS 'Monthly invoices for FRED usage';
COMMENT ON TABLE public.fred_capability_requests IS 'Auto-detected feature requests from user queries';
