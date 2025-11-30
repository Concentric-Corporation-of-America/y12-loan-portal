-- Core Banking Integration Schema
-- Adds tables and columns to support Jack Henry Symitar SymXchange integration

-- Add core banking fields to loans table
ALTER TABLE loans ADD COLUMN IF NOT EXISTS core_confirmation VARCHAR(50);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS core_loan_id VARCHAR(20);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS core_account_number VARCHAR(20);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS last_core_sync TIMESTAMP WITH TIME ZONE;

-- Add core banking fields to loan_payments table
ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS confirmation_number VARCHAR(50);
ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS core_transaction_id VARCHAR(50);
ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS synced_to_core BOOLEAN DEFAULT FALSE;

-- Add core banking fields to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS core_account_number VARCHAR(20);
ALTER TABLE members ADD COLUMN IF NOT EXISTS core_share_id VARCHAR(10);
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_core_sync TIMESTAMP WITH TIME ZONE;

-- Core Banking Sync Log Table
-- Tracks all synchronization events between portal and Symitar
CREATE TABLE IF NOT EXISTS core_banking_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type VARCHAR(50) NOT NULL, -- 'loan_disbursement', 'payment', 'balance_sync', 'account_inquiry'
    direction VARCHAR(10) NOT NULL, -- 'outbound' (portal -> core) or 'inbound' (core -> portal)
    entity_type VARCHAR(50) NOT NULL, -- 'loan', 'payment', 'member', 'account'
    entity_id UUID, -- Reference to the portal entity
    core_reference VARCHAR(100), -- Reference ID from Symitar
    request_payload JSONB, -- Sanitized request (no passwords)
    response_payload JSONB, -- Response from SymXchange
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'retry'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_core_sync_status ON core_banking_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_core_sync_entity ON core_banking_sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_core_sync_created ON core_banking_sync_log(created_at DESC);

-- Core Banking Configuration Table
-- Stores SymXchange configuration (non-sensitive)
CREATE TABLE IF NOT EXISTS core_banking_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO core_banking_config (config_key, config_value, description) VALUES
    ('symxchange_device_type', 'CLIENTSYSTEM', 'Device type for SymXchange requests'),
    ('symxchange_device_number', '20000', 'Device number assigned by Y-12 FCU'),
    ('sync_interval_minutes', '60', 'How often to sync balances from core'),
    ('max_retry_attempts', '3', 'Maximum retry attempts for failed transactions'),
    ('retry_delay_seconds', '30', 'Delay between retry attempts'),
    ('loan_disbursement_enabled', 'false', 'Enable automatic loan disbursement to core'),
    ('payment_sync_enabled', 'false', 'Enable automatic payment sync to core'),
    ('balance_sync_enabled', 'false', 'Enable automatic balance sync from core')
ON CONFLICT (config_key) DO NOTHING;

-- Core Banking Transaction Queue
-- Queue for pending transactions to be sent to Symitar
CREATE TABLE IF NOT EXISTS core_banking_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation VARCHAR(50) NOT NULL, -- 'newLoan', 'makeLoanPayment', 'transferFunds'
    payload JSONB NOT NULL,
    priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Index for queue processing
CREATE INDEX IF NOT EXISTS idx_core_queue_status ON core_banking_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_core_queue_priority ON core_banking_queue(priority, created_at);

-- Enable RLS on new tables
ALTER TABLE core_banking_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_banking_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_banking_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access
CREATE POLICY "Admins can view sync logs"
ON core_banking_sync_log FOR SELECT
USING (EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'compliance_officer')
));

CREATE POLICY "Admins can view config"
ON core_banking_config FOR SELECT
USING (EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
));

CREATE POLICY "Admins can update config"
ON core_banking_config FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
));

CREATE POLICY "Admins can view queue"
ON core_banking_queue FOR SELECT
USING (EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'loan_officer')
));

-- Function to queue a core banking transaction
CREATE OR REPLACE FUNCTION queue_core_banking_transaction(
    p_operation VARCHAR(50),
    p_payload JSONB,
    p_priority INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
BEGIN
    INSERT INTO core_banking_queue (operation, payload, priority)
    VALUES (p_operation, p_payload, p_priority)
    RETURNING id INTO v_queue_id;
    
    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log core banking sync event
CREATE OR REPLACE FUNCTION log_core_banking_sync(
    p_sync_type VARCHAR(50),
    p_direction VARCHAR(10),
    p_entity_type VARCHAR(50),
    p_entity_id UUID,
    p_core_reference VARCHAR(100),
    p_request JSONB,
    p_response JSONB,
    p_status VARCHAR(20),
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO core_banking_sync_log (
        sync_type, direction, entity_type, entity_id, 
        core_reference, request_payload, response_payload, 
        status, error_message, completed_at
    )
    VALUES (
        p_sync_type, p_direction, p_entity_type, p_entity_id,
        p_core_reference, p_request, p_response,
        p_status, p_error_message,
        CASE WHEN p_status IN ('success', 'failed') THEN NOW() ELSE NULL END
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to queue loan disbursement when loan is approved
CREATE OR REPLACE FUNCTION trigger_loan_disbursement_queue()
RETURNS TRIGGER AS $$
DECLARE
    v_config_enabled TEXT;
BEGIN
    -- Check if auto-disbursement is enabled
    SELECT config_value INTO v_config_enabled
    FROM core_banking_config
    WHERE config_key = 'loan_disbursement_enabled' AND is_active = TRUE;
    
    IF v_config_enabled = 'true' AND NEW.status = 'active' AND OLD.status = 'approved' THEN
        -- Queue the disbursement
        PERFORM queue_core_banking_transaction(
            'newLoan',
            jsonb_build_object(
                'loanId', NEW.id,
                'memberId', NEW.member_id,
                'amount', NEW.amount,
                'loanType', NEW.loan_type
            ),
            1 -- High priority
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (only if loans table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loans') THEN
        DROP TRIGGER IF EXISTS loan_disbursement_queue_trigger ON loans;
        CREATE TRIGGER loan_disbursement_queue_trigger
            AFTER UPDATE ON loans
            FOR EACH ROW
            EXECUTE FUNCTION trigger_loan_disbursement_queue();
    END IF;
END $$;

-- Comment on tables
COMMENT ON TABLE core_banking_sync_log IS 'Audit log of all core banking synchronization events';
COMMENT ON TABLE core_banking_config IS 'Configuration settings for SymXchange integration';
COMMENT ON TABLE core_banking_queue IS 'Queue for pending core banking transactions';
