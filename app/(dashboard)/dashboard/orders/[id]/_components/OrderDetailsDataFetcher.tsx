'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { OrderDetailsClient } from './OrderDetailsClient';
import { DEFAULT_TEMPLATE_ITEMS } from './constants';

export function OrderDetailsDataFetcher({ id }: { id: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      if (id.startsWith('mock-os')) {
        setLoading(false);
        return; // Let it render empty, or handle mock differently
      }

      try {
        const { data: osData } = await supabase.from('service_orders').select('*, clients(*)').eq('id', id).single();
        if (!osData) {
          setLoading(false);
          return;
        }

        let initialOrder = osData;
        let initialClient = osData.clients;
        let checklistTemplateItems = DEFAULT_TEMPLATE_ITEMS;

        if (osData.equipment_id) {
          const { data: eqData } = await supabase.from('client_equipments').select('category_id').eq('id', osData.equipment_id).single();
          if (eqData && eqData.category_id) {
            const { data: templateData } = await supabase.from('checklist_templates').select('schema').eq('category_id', eqData.category_id).maybeSingle();
            if (templateData && templateData.schema && Array.isArray(templateData.schema.items)) {
              checklistTemplateItems = templateData.schema.items;
            }
          }
        }

        let initialSelectedProducts: any[] = [];
        const { data: itemsData } = await supabase.from('service_order_items').select('*, products_inventory(name)').eq('service_order_id', id);
        if (itemsData) {
          initialSelectedProducts = itemsData.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            name: item.products_inventory?.name || 'Produto do Estoque',
            quantity: item.quantity,
            unit_price: item.unit_price,
          }));
        }

        let initialSelectedServices: any[] = [];
        const { data: orderServsData } = await supabase.from('order_services').select('*, services(nome)').eq('os_id', id);
        if (orderServsData) {
          initialSelectedServices = orderServsData.map((item: any) => ({
            id: item.id,
            service_id: item.service_id,
            name: item.services?.nome || 'Serviço do Catálogo',
            quantity: item.quantidade,
            unit_price: item.preco_unitario,
          }));
        }

        let initialInventory: any[] = [];
        const { data: invData } = await supabase.from('products_inventory').select('*').order('name');
        if (invData) initialInventory = invData;

        let initialAvailableServices: any[] = [];
        const { data: servsData } = await supabase.from('services').select('*').eq('ativo', true).order('nome');
        if (servsData) initialAvailableServices = servsData;

        let initialTechnicians: any[] = [];
        const { data: techData } = await supabase.from('profiles').select('id, full_name, email, role').eq('role', 'technician');
        if (techData && techData.length > 0) {
          initialTechnicians = techData.map((t: any) => ({ id: t.id, name: t.full_name || t.email?.split('@')[0] || 'Técnico' }));
        }

        setData({
          initialOrder,
          initialClient,
          initialInventory,
          initialTechnicians,
          initialAvailableServices,
          initialSelectedProducts,
          initialSelectedServices,
          checklistTemplateItems
        });
      } catch (err) {
        console.error('Erro ao carregar O.S:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center space-y-4">
        <h1 className="text-xl font-bold font-mono text-rose-500">Ordem de Serviço não encontrada</h1>
        <p className="text-slate-400 font-mono text-sm">O ID fornecido não existe ou você não tem permissão para visualizar.</p>
      </div>
    );
  }

  return <OrderDetailsClient id={id} {...data} />;
}
