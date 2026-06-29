drop policy if exists "owners and vets update pet clinical entries" on public.pet_clinical_entries;

-- V1 history is append-only. Corrections become a new dated entry, preserving
-- clinical auditability and preventing pet/tenant reassignment after creation.
