-- Definitive PetSistem catalog prices. Legacy `professional` remains readable
-- for old foreign keys, but is hidden when the canonical `profissional` exists.
update public.plans
set price_cents = case lower(code)
  when 'starter' then 4999
  when 'profissional' then 9999
  when 'professional' then 9999
  when 'premium' then 13999
  else price_cents
end,
updated_at = now()
where lower(code) in ('starter', 'profissional', 'professional', 'premium');

update public.plans legacy
set active = false,
    updated_at = now()
where lower(legacy.code) = 'professional'
  and exists (
    select 1
    from public.plans canonical
    where lower(canonical.code) = 'profissional'
      and canonical.id <> legacy.id
  );

-- Existing subscriptions follow the new definitive catalog amount. The
-- annual offer is presentation-only until a gateway billing cycle is chosen.
update public.subscriptions
set amount_cents = case
  when lower(plan_name) like '%premium%' then 13999
  when lower(plan_name) like '%profissional%' or lower(plan_name) like '%professional%' then 9999
  when lower(plan_name) like '%starter%' then 4999
  else amount_cents
end,
updated_at = now()
where lower(plan_name) like '%starter%'
   or lower(plan_name) like '%profissional%'
   or lower(plan_name) like '%professional%'
   or lower(plan_name) like '%premium%';
