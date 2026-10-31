-- Mudanças que já existiam na produção fora das migrations (registradas em 31/10/2026)
CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
  "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
  "company_id" uuid,
  "user_id"    uuid,
  "action"     text NOT NULL,
  "entity"     text NOT NULL,
  "entity_id"  uuid,
  "old_data"   jsonb,
  "new_data"   jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id),
  CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."service_orders" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
ALTER TABLE "public"."service_orders" ADD COLUMN IF NOT EXISTS "budget_approved_at" timestamp with time zone;