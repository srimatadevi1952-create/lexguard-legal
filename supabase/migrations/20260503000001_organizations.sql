-- Migration 0001: organizations table
-- Enable pgcrypto (needed for sha256 in audit log)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE org_type AS ENUM (
  'solo',
  'boutique',
  'large_firm',
  'corporate_legal',
  'other'
);

CREATE TYPE plan_tier AS ENUM (
  'solo',
  'boutique',
  'firm',
  'enterprise'
);

CREATE TYPE plan_status AS ENUM (
  'trial',
  'active',
  'past_due',
  'cancelled'
);

CREATE TYPE billing_cycle AS ENUM (
  'monthly',
  'annual'
);

-- Shared updated_at trigger function (created once, reused across tables)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- organizations table
-- NOTE: primary_contact FK to public.users is added in migration 0002
--       after the users table exists.
CREATE TABLE public.organizations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  legal_name      text,
  type            org_type    NOT NULL DEFAULT 'solo',
  gstin           text,
  pan             text,
  address         jsonb,
  primary_contact uuid,                            -- FK constraint added in 0002
  plan_tier       plan_tier   NOT NULL DEFAULT 'solo',
  plan_status     plan_status NOT NULL DEFAULT 'trial',
  trial_ends_at   timestamptz,
  billing_cycle   billing_cycle NOT NULL DEFAULT 'monthly',
  data_residency  text        NOT NULL DEFAULT 'asia-south1',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
