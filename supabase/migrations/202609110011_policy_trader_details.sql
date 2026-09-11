-- Record a new draft policy version after the owner supplied the trader,
-- address, VAT registration, return-address and telephone details. Orders
-- always retain the exact policy-version IDs accepted at checkout.
insert into public.policy_versions(
  id, policy_type, version, content_hash, source_reference
) values
  ('30000000-0000-4000-8000-000000000011', 'TERMS', '2026-09-11-trader-details-draft', '0a07b0512a47e4b4c6f0c7ba0e36c7476c0bbda332ce59d8b5a461f5a4b877d6', 'macmaer_legal_checkout_policies.md#1'),
  ('30000000-0000-4000-8000-000000000012', 'PRIVACY', '2026-09-11-trader-details-draft', '0a07b0512a47e4b4c6f0c7ba0e36c7476c0bbda332ce59d8b5a461f5a4b877d6', 'macmaer_legal_checkout_policies.md#2'),
  ('30000000-0000-4000-8000-000000000013', 'SHIPPING', '2026-09-11-trader-details-draft', '0a07b0512a47e4b4c6f0c7ba0e36c7476c0bbda332ce59d8b5a461f5a4b877d6', 'macmaer_legal_checkout_policies.md#3'),
  ('30000000-0000-4000-8000-000000000014', 'RETURNS', '2026-09-11-trader-details-draft', '0a07b0512a47e4b4c6f0c7ba0e36c7476c0bbda332ce59d8b5a461f5a4b877d6', 'macmaer_legal_checkout_policies.md#4'),
  ('30000000-0000-4000-8000-000000000015', 'CUSTOMS', '2026-09-11-trader-details-draft', '0a07b0512a47e4b4c6f0c7ba0e36c7476c0bbda332ce59d8b5a461f5a4b877d6', 'macmaer_legal_checkout_policies.md#5');
