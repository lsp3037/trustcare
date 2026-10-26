/**
 * Tipos compartilhados para o formulário de Ordens de Serviço.
 * Centralizar aqui permite que subcomponentes futuros importem
 * sem precisar de props drilling ou any[].
 */

export interface Client {
  id: string;
  name: string;
  type: string;
  document?: string;
  phone?: string;
  email?: string;
}

export interface Equipment {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  client_id: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  category?: string;
  brand?: string;
  capacity?: string;
  quantity: number;
  sale_price?: number;
}

export interface Technician {
  id: string;
  full_name: string;
  role: string;
}

export interface CatalogService {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface SelectedProduct {
  id?: string;
  product_id?: string | null;
  name: string;
  custom_name?: string | null;
  quantity: number;
  unit_price: number;
  unit_cost?: number;
  part_status?: string;
  supplier_link?: string | null;
  is_custom?: boolean;
}

export interface SelectedService {
  service_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export interface NewOrderFormProps {
  clients: Client[];
  onSuccess: () => void;
}
