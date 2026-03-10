-- Run this in your Supabase SQL Editor to set up the database and storage.

-- 1. Create the submissions table
create table if not exists merchant_bank_submissions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  mch_id text,
  merchant_name text not null,
  entity_name text not null,
  contact_name text,
  contact_email text not null,
  payment_method text not null,
  beneficiary_name text not null,
  bank_name text not null,
  bank_country text not null,
  bank_address text,
  currency text not null,
  routing_number text,
  account_number text,
  account_type text,
  swift_code text,
  iban text,
  intermediary_bank text,
  intermediary_swift text,
  beneficiary_address text,
  payment_reference text,
  notes text,
  proof_document_url text,
  proof_document_filename text,
  raw_payload jsonb
);

-- 2. Enable Row Level Security (allow inserts from anon key)
alter table merchant_bank_submissions enable row level security;

create policy "Allow anonymous inserts"
  on merchant_bank_submissions
  for insert
  to anon
  with check (true);

-- 3. Create the storage bucket for proof documents
insert into storage.buckets (id, name, public)
values ('proof-documents', 'proof-documents', false)
on conflict (id) do nothing;

-- 4. Allow anonymous uploads to the bucket
create policy "Allow anonymous uploads"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'proof-documents');
