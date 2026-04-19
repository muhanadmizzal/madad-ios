
-- ========== EXTEND EXISTING TABLES ==========

-- Extend tathbeet_bookings
ALTER TABLE public.tathbeet_bookings 
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS reschedule_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_date date,
  ADD COLUMN IF NOT EXISTS original_time_slot time,
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(15,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS buffer_before_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buffer_after_minutes integer NOT NULL DEFAULT 0;

-- Extend tathbeet_services
ALTER TABLE public.tathbeet_services
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS buffer_before_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buffer_after_minutes integer NOT NULL DEFAULT 0;

-- Extend tathbeet_staff_profiles
ALTER TABLE public.tathbeet_staff_profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Extend tathbeet_branches
ALTER TABLE public.tathbeet_branches
  ADD COLUMN IF NOT EXISTS address_en text,
  ADD COLUMN IF NOT EXISTS is_headquarters boolean DEFAULT false;

-- ========== TATHBEET SETTINGS ==========
CREATE TABLE IF NOT EXISTS public.tathbeet_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'IQD',
  default_language text NOT NULL DEFAULT 'ar',
  slot_interval_minutes integer NOT NULL DEFAULT 30,
  booking_window_days integer NOT NULL DEFAULT 30,
  advance_booking_notice_hours integer NOT NULL DEFAULT 0,
  cancellation_window_hours integer NOT NULL DEFAULT 24,
  reschedule_window_hours integer NOT NULL DEFAULT 12,
  max_reschedules integer NOT NULL DEFAULT 2,
  buffer_before_minutes integer NOT NULL DEFAULT 0,
  buffer_after_minutes integer NOT NULL DEFAULT 0,
  guest_booking_enabled boolean NOT NULL DEFAULT true,
  deposit_required boolean NOT NULL DEFAULT false,
  deposit_amount numeric(15,3) NOT NULL DEFAULT 0,
  deposit_refundable boolean NOT NULL DEFAULT false,
  smart_assignment_enabled boolean NOT NULL DEFAULT false,
  waitlist_enabled boolean NOT NULL DEFAULT false,
  waitlist_max_size integer NOT NULL DEFAULT 0,
  waitlist_auto_fill boolean NOT NULL DEFAULT false,
  walk_in_enabled boolean NOT NULL DEFAULT false,
  walk_in_queue_mode boolean NOT NULL DEFAULT false,
  overbooking_enabled boolean NOT NULL DEFAULT false,
  overbooking_max_percent integer NOT NULL DEFAULT 0,
  premium_time_enabled boolean NOT NULL DEFAULT false,
  premium_time_multiplier numeric NOT NULL DEFAULT 1,
  booking_confirmation_style text NOT NULL DEFAULT 'auto',
  reminder_hours_before integer NOT NULL DEFAULT 24,
  whatsapp_notifications_enabled boolean NOT NULL DEFAULT false,
  whatsapp_business_phone text,
  social_links jsonb NOT NULL DEFAULT '{}',
  support_email text,
  support_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- ========== PAYMENTS ==========
CREATE TABLE IF NOT EXISTS public.tathbeet_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.tathbeet_bookings(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  amount numeric(15,3) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'IQD',
  method text NOT NULL DEFAULT 'cash',
  status text NOT NULL DEFAULT 'pending',
  deposit_portion numeric(15,3) DEFAULT 0,
  gateway_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ========== BLOCKED DATES ==========
CREATE TABLE IF NOT EXISTS public.tathbeet_blocked_dates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  staff_profile_id uuid REFERENCES public.tathbeet_staff_profiles(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.tathbeet_branches(id) ON DELETE CASCADE,
  date date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========== HOLIDAYS ==========
CREATE TABLE IF NOT EXISTS public.tathbeet_holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.tathbeet_branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_en text,
  date date NOT NULL,
  is_recurring boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========== CUSTOMER PREFERENCES ==========
CREATE TABLE IF NOT EXISTS public.tathbeet_customer_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  preferred_staff_id uuid REFERENCES public.tathbeet_staff_profiles(id),
  preferred_branch_id uuid REFERENCES public.tathbeet_branches(id),
  preferred_time_start text,
  preferred_time_end text,
  preferred_days integer[] DEFAULT '{}',
  total_bookings integer NOT NULL DEFAULT 0,
  cancellation_count integer NOT NULL DEFAULT 0,
  no_show_count integer NOT NULL DEFAULT 0,
  risk_score numeric NOT NULL DEFAULT 0,
  last_booking_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, customer_id)
);

-- ========== WAITLIST ==========
CREATE TABLE IF NOT EXISTS public.tathbeet_waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  service_id uuid REFERENCES public.tathbeet_services(id),
  staff_profile_id uuid REFERENCES public.tathbeet_staff_profiles(id),
  branch_id uuid REFERENCES public.tathbeet_branches(id),
  preferred_date date NOT NULL,
  preferred_time_start text,
  preferred_time_end text,
  status text NOT NULL DEFAULT 'waiting',
  converted_booking_id uuid REFERENCES public.tathbeet_bookings(id),
  notified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========== WALK-INS ==========
CREATE TABLE IF NOT EXISTS public.tathbeet_walk_ins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.tathbeet_branches(id),
  customer_name text NOT NULL,
  customer_phone text,
  customer_id uuid,
  service_id uuid REFERENCES public.tathbeet_services(id),
  staff_profile_id uuid REFERENCES public.tathbeet_staff_profiles(id),
  queue_position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ========== LOYALTY SYSTEM ==========

CREATE TABLE IF NOT EXISTS public.tathbeet_loyalty_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_en text,
  min_points integer NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  benefits jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tathbeet_loyalty_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  points_balance integer NOT NULL DEFAULT 0,
  lifetime_points integer NOT NULL DEFAULT 0,
  tier_id uuid REFERENCES public.tathbeet_loyalty_tiers(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, customer_id)
);

CREATE TABLE IF NOT EXISTS public.tathbeet_loyalty_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_type text NOT NULL DEFAULT 'booking_completion',
  points_amount integer NOT NULL DEFAULT 10,
  per_currency_amount numeric,
  description_ar text,
  description_en text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tathbeet_loyalty_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  wallet_id uuid NOT NULL REFERENCES public.tathbeet_loyalty_wallets(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'earn',
  points integer NOT NULL,
  balance_after integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'booking',
  source_id uuid,
  description_ar text,
  description_en text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tathbeet_loyalty_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_en text,
  description_ar text,
  description_en text,
  reward_type text NOT NULL DEFAULT 'discount',
  points_cost integer NOT NULL DEFAULT 100,
  discount_value numeric DEFAULT 0,
  service_id uuid REFERENCES public.tathbeet_services(id),
  min_points_required integer NOT NULL DEFAULT 0,
  max_redemptions_per_customer integer,
  total_available integer,
  total_redeemed integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tathbeet_loyalty_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  wallet_id uuid NOT NULL REFERENCES public.tathbeet_loyalty_wallets(id),
  reward_id uuid NOT NULL REFERENCES public.tathbeet_loyalty_rewards(id),
  points_spent integer NOT NULL,
  booking_id uuid REFERENCES public.tathbeet_bookings(id),
  status text NOT NULL DEFAULT 'pending',
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.tathbeet_loyalty_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_en text,
  campaign_type text NOT NULL DEFAULT 'multiplier',
  multiplier numeric NOT NULL DEFAULT 2,
  bonus_points integer NOT NULL DEFAULT 0,
  conditions jsonb NOT NULL DEFAULT '{}',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========== NOTIFICATION SYSTEM ==========

CREATE TABLE IF NOT EXISTS public.tathbeet_notification_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id uuid,
  event_type text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  phone_number text NOT NULL,
  template_params jsonb DEFAULT '{}',
  free_form_message text,
  language text DEFAULT 'ar',
  status text NOT NULL DEFAULT 'queued',
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  next_retry_at timestamptz DEFAULT now(),
  last_error text,
  response_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tathbeet_notification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.tathbeet_notification_jobs(id),
  customer_id uuid,
  event_type text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  phone_number text,
  template_used text,
  message_id text,
  delivery_status text NOT NULL DEFAULT 'pending',
  error_message text,
  attempt_number integer DEFAULT 1,
  response_summary jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========== RLS POLICIES ==========

ALTER TABLE public.tathbeet_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_customer_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_walk_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_loyalty_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_loyalty_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_loyalty_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_loyalty_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tathbeet_notification_logs ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped policies for all new tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'tathbeet_settings','tathbeet_payments','tathbeet_blocked_dates','tathbeet_holidays',
    'tathbeet_customer_preferences','tathbeet_waitlist','tathbeet_walk_ins',
    'tathbeet_loyalty_tiers','tathbeet_loyalty_wallets','tathbeet_loyalty_rules',
    'tathbeet_loyalty_transactions','tathbeet_loyalty_rewards','tathbeet_loyalty_redemptions',
    'tathbeet_loyalty_campaigns','tathbeet_notification_jobs','tathbeet_notification_logs'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "tenant_isolation_%s" ON public.%I FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()))', tbl, tbl);
  END LOOP;
END $$;

-- Public read access for booking flow
CREATE POLICY "public_read_tathbeet_holidays" ON public.tathbeet_holidays FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_tathbeet_blocked_dates" ON public.tathbeet_blocked_dates FOR SELECT TO anon USING (true);
CREATE POLICY "public_read_tathbeet_settings" ON public.tathbeet_settings FOR SELECT TO anon USING (true);
