CREATE OR REPLACE VIEW public.leads_follow_up_pendente AS
 SELECT id, company_id, name, phone, status, equipment_info, problem_description,
    valor_estimado, origem, updated_at,
    EXTRACT(day FROM now() - updated_at)::integer AS dias_parado
   FROM leads
  WHERE status = 'Em Negociação'::text AND updated_at < (now() - '2 days'::interval);