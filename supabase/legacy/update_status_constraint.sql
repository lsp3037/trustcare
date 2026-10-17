-- Remove a restrição antiga baseada na lista anterior
ALTER TABLE public.service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check;

-- Atualiza eventuais registros antigos incompatíveis
UPDATE public.service_orders SET status = 'Em Execução' WHERE status = 'Na Bancada';
UPDATE public.service_orders SET status = 'Aguardando Peças' WHERE status = 'Aguardando Peça';
UPDATE public.service_orders SET status = 'Pronto para Retirada' WHERE status = 'Pronta para Retirada';
UPDATE public.service_orders SET status = 'Finalizado' WHERE status = 'Entregue';
UPDATE public.service_orders SET status = 'Cancelado' WHERE status = 'Cancelada';

-- Adiciona a nova restrição atualizada contendo os 9 status oficiais
ALTER TABLE public.service_orders ADD CONSTRAINT service_orders_status_check 
    CHECK (status IN (
        'Aguardando Equipamento', 
        'Em Análise', 
        'Aguardando Aprovação', 
        'Aguardando Peças', 
        'Em Execução', 
        'Em Testes', 
        'Pronto para Retirada', 
        'Finalizado', 
        'Cancelado'
    ));