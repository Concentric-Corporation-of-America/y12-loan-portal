import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      members: {
        Row: {
          id: string;
          user_id: string;
          member_number: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          date_of_birth: string | null;
          ssn_last_four: string | null;
          employment_status: string | null;
          annual_income: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['members']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['members']['Insert']>;
      };
      loan_applications: {
        Row: {
          id: string;
          member_id: string;
          loan_type: 'personal' | 'auto' | 'home' | 'business';
          amount_requested: number;
          term_months: number;
          purpose: string;
          status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'denied' | 'funded';
          interest_rate: number | null;
          monthly_payment: number | null;
          decision_date: string | null;
          decision_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['loan_applications']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['loan_applications']['Insert']>;
      };
      loans: {
        Row: {
          id: string;
          application_id: string;
          member_id: string;
          loan_number: string;
          loan_type: 'personal' | 'auto' | 'home' | 'business';
          principal_amount: number;
          interest_rate: number;
          term_months: number;
          monthly_payment: number;
          remaining_balance: number;
          next_payment_date: string;
          status: 'active' | 'paid_off' | 'delinquent' | 'default';
          funded_date: string;
          maturity_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['loans']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['loans']['Insert']>;
      };
      loan_payments: {
        Row: {
          id: string;
          loan_id: string;
          payment_date: string;
          amount: number;
          principal_amount: number;
          interest_amount: number;
          remaining_balance: number;
          payment_method: string;
          status: 'pending' | 'completed' | 'failed';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['loan_payments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['loan_payments']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          table_name: string;
          record_id: string;
          old_values: Record<string, unknown> | null;
          new_values: Record<string, unknown> | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
    };
  };
};
