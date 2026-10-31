CREATE OR REPLACE VIEW public.leads_prioridade AS
 SELECT id, name, phone, status, equipment_info, problem_description,
    valor_estimado, origem, updated_at,
    EXTRACT(day FROM now() - updated_at)::integer AS dias_parado,
        CASE
            WHEN (status = ANY (ARRAY['Em Negociação'::text, 'Aguardando Equipamento'::text])) AND updated_at < (now() - '2 days'::interval) AND COALESCE(valor_estimado, 0::numeric) >= 250::numeric THEN 1
            WHEN (status = ANY (ARRAY['Em Negociação'::text, 'Aguardando Equipamento'::text])) AND updated_at < (now() - '2 days'::interval) THEN 2
            ELSE 3
        END AS nivel_prioridade
   FROM leads
  WHERE status = ANY (ARRAY['Em Negociação'::text, 'Aguardando Equipamento'::text])
  ORDER BY (
        CASE
            WHEN (status = ANY (ARRAY['Em Negociação'::text, 'Aguardando Equipamento'::text])) AND updated_at < (now() - '2 days'::interval) AND COALESCE(valor_estimado, 0::numeric) >= 250::numeric THEN 1
            WHEN (status = ANY (ARRAY['Em Negociação'::text, 'Aguardando Equipamento'::text])) AND updated_at < (now() - '2 days'::interval) THEN 2
            ELSE 3
        END), valor_estimado DESC NULLS LAST, updated_at;