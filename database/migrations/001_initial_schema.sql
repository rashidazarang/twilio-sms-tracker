-- =====================================================
-- SMS Feedback Tracker - Initial Database Schema
-- =====================================================
-- Run this script to set up your PostgreSQL database
-- =====================================================

-- Create transactions table for storing SMS records
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(100),
    dealership_name VARCHAR(100),
    amount DECIMAL(10,2),
    sms_sent BOOLEAN DEFAULT false,
    sms_sent_at TIMESTAMP,
    sms_status VARCHAR(50) DEFAULT 'pending',
    error_code VARCHAR(20),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_customer_phone ON transactions(customer_phone);
CREATE INDEX idx_transactions_sms_status ON transactions(sms_status);
CREATE INDEX idx_transactions_dealership ON transactions(dealership_name);
CREATE INDEX idx_transactions_sms_sent ON transactions(sms_sent);

-- Create message configuration table
CREATE TABLE IF NOT EXISTS message_config (
    id SERIAL PRIMARY KEY,
    google_review_url VARCHAR(500),
    trustpilot_url VARCHAR(500),
    message_template TEXT DEFAULT 'Hi {customer_name}! Thank you for your recent visit to {dealership_name}. We would love to hear about your experience. Please share your feedback: {feedback_url}',
    delay_hours INTEGER DEFAULT 24,
    retry_attempts INTEGER DEFAULT 3,
    retry_delay_minutes INTEGER DEFAULT 30,
    batch_size INTEGER DEFAULT 50,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT INTO message_config (
    google_review_url, 
    trustpilot_url, 
    message_template, 
    delay_hours,
    retry_attempts,
    retry_delay_minutes,
    batch_size
)
SELECT 
    'https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review',
    'https://www.trustpilot.com/review/YOUR_BUSINESS',
    'Hi {customer_name}! Thank you for your recent visit to {dealership_name}. We would love to hear about your experience. Please share your feedback:',
    24,
    3,
    30,
    50
WHERE NOT EXISTS (SELECT 1 FROM message_config LIMIT 1);

-- Create audit log table for tracking changes
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for audit log
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Create analytics summary table for performance
CREATE TABLE IF NOT EXISTS analytics_daily (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_pending INTEGER DEFAULT 0,
    unique_customers INTEGER DEFAULT 0,
    unique_dealerships INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for analytics
CREATE INDEX idx_analytics_daily_date ON analytics_daily(date DESC);

-- Create API keys table for webhook authentication
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    ip_whitelist TEXT[], -- Array of whitelisted IPs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create index for API keys
CREATE INDEX idx_api_keys_api_key ON api_keys(api_key) WHERE is_active = true;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_config_updated_at 
    BEFORE UPDATE ON message_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_daily_updated_at 
    BEFORE UPDATE ON analytics_daily 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to log audit trail
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log(table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log(table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log(table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for important tables
CREATE TRIGGER audit_trigger_message_config
    AFTER INSERT OR UPDATE OR DELETE ON message_config
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_trigger_api_keys
    AFTER INSERT OR UPDATE OR DELETE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create view for dashboard statistics
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
    COUNT(*) as total_messages,
    COUNT(CASE WHEN sms_sent = true AND sms_status = 'delivered' THEN 1 END) as delivered,
    COUNT(CASE WHEN sms_sent = true AND sms_status = 'failed' THEN 1 END) as failed,
    COUNT(CASE WHEN sms_sent = false THEN 1 END) as pending,
    COUNT(DISTINCT customer_phone) as unique_customers,
    COUNT(DISTINCT dealership_name) as unique_dealerships,
    AVG(CASE WHEN amount IS NOT NULL THEN amount END) as avg_transaction_amount
FROM transactions
WHERE created_at >= CURRENT_DATE;

-- Create view for hourly distribution
CREATE OR REPLACE VIEW hourly_distribution AS
SELECT 
    EXTRACT(HOUR FROM created_at) as hour,
    COUNT(*) as message_count,
    COUNT(CASE WHEN sms_sent = true THEN 1 END) as sent_count
FROM transactions
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;

-- Grant permissions (adjust based on your user setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'Stores all SMS transaction records';
COMMENT ON TABLE message_config IS 'Global configuration for SMS messages';
COMMENT ON TABLE audit_log IS 'Audit trail for all database changes';
COMMENT ON TABLE analytics_daily IS 'Pre-aggregated daily analytics for performance';
COMMENT ON TABLE api_keys IS 'API keys for webhook authentication';

COMMENT ON COLUMN transactions.sms_sent IS 'true = attempted to send, false = not attempted';
COMMENT ON COLUMN transactions.sms_status IS 'pending, sending, delivered, failed, undelivered';
COMMENT ON COLUMN message_config.delay_hours IS 'Hours to wait before sending SMS after transaction';
COMMENT ON COLUMN api_keys.ip_whitelist IS 'Array of whitelisted IP addresses, NULL = allow all';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Tables created: transactions, message_config, audit_log, analytics_daily, api_keys';
    RAISE NOTICE 'Views created: dashboard_stats, hourly_distribution';
    RAISE NOTICE 'Triggers installed for audit logging and timestamp updates';
END $$;