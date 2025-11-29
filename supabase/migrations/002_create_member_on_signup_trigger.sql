-- Migration: Create member record automatically on user signup
-- This ensures every authenticated user has a corresponding member record

-- Function to generate a unique member number
CREATE OR REPLACE FUNCTION generate_member_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_number VARCHAR(20);
  counter INTEGER := 0;
BEGIN
  LOOP
    -- Generate member number: Y12-YYYYMMDD-XXXX (random 4 digits)
    new_number := 'Y12-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Check if it already exists
    IF NOT EXISTS (SELECT 1 FROM public.members WHERE member_number = new_number) THEN
      RETURN new_number;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Could not generate unique member number after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create member record on user signup
CREATE OR REPLACE FUNCTION public.create_member_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.members (
    user_id,
    member_number,
    email,
    first_name,
    last_name,
    phone
  )
  VALUES (
    NEW.id,
    generate_member_number(),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_member_on_signup();

-- Add policy for members to insert their own record (needed for the trigger)
CREATE POLICY "Service role can insert members"
  ON public.members FOR INSERT
  WITH CHECK (true);

-- Also add an "amount" column alias or rename for compatibility
-- The frontend uses "amount" but the schema has "amount_requested"
-- Adding an alias column for backwards compatibility
ALTER TABLE public.loan_applications 
  ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2) GENERATED ALWAYS AS (amount_requested) STORED;

-- Update RLS policy to allow the trigger to work
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.members TO authenticated;
GRANT ALL ON public.loan_applications TO authenticated;
