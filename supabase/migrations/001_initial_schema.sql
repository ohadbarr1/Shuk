-- ============================================================
-- Cheshbeshbon Phase 1 — Initial Schema
-- Run in Supabase SQL Editor or via supabase db push
-- ============================================================

-- ===================== PROFILES =====================
-- Extends Supabase auth.users with display name
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ===================== SCENARIOS =====================
-- Cloud-synced calculator scenarios
CREATE TABLE scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  calc_type TEXT NOT NULL CHECK (calc_type IN ('mortgage','salary','rent-vs-buy','pension')),
  name TEXT NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scenarios_user ON scenarios(user_id, calc_type);

ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scenarios"
  ON scenarios FOR ALL USING (auth.uid() = user_id);


-- ===================== SUBSCRIPTIONS =====================
-- Stripe subscription tracking
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','premium')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','canceled','past_due')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sub"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);


-- ===================== FINANCIAL PROFILES =====================
-- User financial profile for calculator pre-fill
CREATE TABLE financial_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users UNIQUE NOT NULL,
  age INT,
  family_status TEXT,
  num_children INT DEFAULT 0,
  employment_type TEXT CHECK (employment_type IN ('employee','self-employed')),
  gross_salary NUMERIC,
  housing_status TEXT CHECK (housing_status IN ('owner','renter','other')),
  current_rent NUMERIC,
  mortgage_balance NUMERIC,
  pension_savings NUMERIC,
  keren_hishtalmut NUMERIC,
  other_savings NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE financial_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own financial profile"
  ON financial_profiles FOR ALL USING (auth.uid() = user_id);
