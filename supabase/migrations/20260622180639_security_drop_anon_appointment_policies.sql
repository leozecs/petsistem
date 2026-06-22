-- Security hardening: remove policies anon overly-permissive em public.appointments
-- (a) "public tracking can read appointment summary" — vazava todos appointments
--     porque predicate era public_tracking_code is not null (sempre true).
-- (b) "public can create appointment requests" — anon podia inserir em qualquer
--     petshop_id sem validação. createPublicBooking já usa service-role.

drop policy if exists "public tracking can read appointment summary" on public.appointments;
drop policy if exists "public can create appointment requests" on public.appointments;;
