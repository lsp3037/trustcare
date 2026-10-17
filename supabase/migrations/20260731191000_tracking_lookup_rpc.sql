-- ============================================================
-- MIGRATION: 20260731191000_tracking_lookup_rpc
--
-- MOTIVO: com a numeração por empresa (20260731190000), 'TC-2026-0001' passa
--   a existir em vários tenants. /api/rastreio/request-token pegava orders[0]
--   e disparava o código OTP para o e-mail daquele cliente — com códigos
--   repetidos, isso entregaria o código de acesso à pessoa errada.
--
--   A mesma rota montava o filtro do PostgREST concatenando o texto digitado
--   pelo usuário (`codigo_os.eq.${cleanId}`), o que permitia alterar o filtro
--   com vírgulas e pontos. E o ramo de busca por UUID parcial usava
--   `id.cast.ilike`, sintaxe que o PostgREST não entende.
--
-- IMPACTO: a busca passa a acontecer no banco, onde o cast de uuid é trivial
--   e não há string de filtro para injetar. A rota recebe TODAS as
--   correspondências e recusa com 409 quando forem ambíguas, orientando o
--   cliente a usar o link da assistência.
--
-- Devolve o e-mail do cliente: exclusiva do service_role, nunca do anon.
--
-- VERIFICADO: busca ambígua devolve N linhas (a rota recusa), busca com
--   subdomínio devolve exatamente o cliente daquele tenant, e as buscas por
--   UUID completo e por prefixo de 8 caracteres devolvem 1 linha.
-- ============================================================

CREATE OR REPLACE FUNCTION public.find_orders_for_tracking(
    p_query TEXT,
    p_subdomain TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    codigo_os VARCHAR,
    company_id UUID,
    company_name TEXT,
    client_name TEXT,
    client_email TEXT
) AS $$
DECLARE
    clean_query TEXT;
BEGIN
    clean_query := lower(ltrim(trim(p_query), '#'));

    IF clean_query IS NULL OR length(clean_query) < 8 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        so.id,
        so.codigo_os,
        so.company_id,
        co.name AS company_name,
        cl.name AS client_name,
        cl.email AS client_email
    FROM public.service_orders so
    LEFT JOIN public.companies co ON co.id = so.company_id
    LEFT JOIN public.clients cl ON cl.id = so.client_id
    WHERE
        (p_subdomain IS NULL OR p_subdomain = '' OR co.subdomain = p_subdomain)
        AND (
            lower(so.codigo_os) = clean_query
            OR (length(clean_query) = 36 AND so.id::text = clean_query)
            OR (length(clean_query) < 36 AND so.id::text LIKE clean_query || '%')
        );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.find_orders_for_tracking(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_orders_for_tracking(TEXT, TEXT) TO service_role;
