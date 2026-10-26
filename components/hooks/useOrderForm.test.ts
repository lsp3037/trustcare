import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOrderForm } from './useOrderForm';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: vi.fn((key) => {
      if (key === 'clientId') return 'client-1';
      return null;
    }),
  }),
}));

// Mock Supabase with inline factory return to prevent hoisting reference errors
vi.mock('@/lib/supabase/client', () => {
  const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockSingle = vi.fn().mockResolvedValue({ data: { company_id: 'company-123' }, error: null });
  const mockEq = vi.fn().mockImplementation((key) => {
    if (key === 'ativo') {
      return { order: mockOrder };
    }
    if (key === 'role') {
      // Apenas um técnico na equipe: o hook deve atribuí-lo automaticamente.
      return Promise.resolve({
        data: [{ id: 'tech-1', full_name: 'Luan Sabino Paixão', email: 'luan@trustcare.com', role: 'technician' }],
        error: null,
      });
    }
    return { single: mockSingle };
  });
  const mockSelect = vi.fn().mockReturnValue({
    eq: mockEq,
    order: mockOrder,
  });
  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
  });

  return {
    supabase: {
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } } })),
      },
      from: mockFrom,
    },
  };
});

describe('useOrderForm Hook', () => {
  const mockClients = [
    { id: 'client-1', name: 'João Silva', type: 'PF' },
    { id: 'client-2', name: 'Maria Souza', type: 'PJ' }
  ];
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com valores padrão corretos', () => {
    const { result } = renderHook(() => useOrderForm({ clients: mockClients, onSuccess: mockOnSuccess }));

    expect(result.current.clientId).toBe('client-1');
    expect(result.current.status).toBe('Em Análise');
    expect(result.current.priority).toBe('Média');
    expect(result.current.serviceValue).toBe('0');
    expect(result.current.discount).toBe('0');
    expect(result.current.totalValue).toBe('0.00');
  });

  it('deve recalcular subtotal e total ao alterar valor de serviço e desconto', () => {
    const { result } = renderHook(() => useOrderForm({ clients: mockClients, onSuccess: mockOnSuccess }));

    act(() => {
      result.current.setServiceValue('150.00');
    });
    expect(result.current.subtotalValue).toBe('150.00');
    expect(result.current.totalValue).toBe('150.00');

    act(() => {
      result.current.setDiscount('20.00');
    });
    expect(result.current.subtotalValue).toBe('150.00');
    expect(result.current.totalValue).toBe('130.00');
  });

  it('deve alternar status do modal de novo cliente', () => {
    const { result } = renderHook(() => useOrderForm({ clients: mockClients, onSuccess: mockOnSuccess }));

    expect(result.current.isNewClientModalOpen).toBe(false);

    act(() => {
      result.current.setIsNewClientModalOpen(true);
    });

    expect(result.current.isNewClientModalOpen).toBe(true);
  });

  it('deve pré-selecionar o técnico quando só existe um na equipe', async () => {
    const { result } = renderHook(() => useOrderForm({ clients: mockClients, onSuccess: mockOnSuccess }));

    await waitFor(() => expect(result.current.technicians).toHaveLength(1));

    expect(result.current.technicianId).toBe('tech-1');
  });

  it('deve adicionar peça sob encomenda e recalcular os totais corretamente', () => {
    const { result } = renderHook(() => useOrderForm({ clients: mockClients, onSuccess: mockOnSuccess }));

    act(() => {
      result.current.setCustomPartName('Tela OLED Dell XPS 13');
      result.current.setCustomPartQty('2');
      result.current.setCustomPartCost('350.00');
      result.current.setCustomPartPrice('600.00');
      result.current.setCustomPartLink('https://fornecedor.com/tela-dell');
    });

    act(() => {
      result.current.handleAddCustomProduct();
    });

    expect(result.current.selectedProducts).toHaveLength(1);
    const added = result.current.selectedProducts[0];
    expect(added.name).toBe('Tela OLED Dell XPS 13');
    expect(added.quantity).toBe(2);
    expect(added.unit_price).toBe(600);
    expect(added.unit_cost).toBe(350);
    expect(added.is_custom).toBe(true);
    expect(added.supplier_link).toBe('https://fornecedor.com/tela-dell');
    expect(added.product_id).toBeNull();
    expect(result.current.subtotalValue).toBe('1200.00');
    expect(result.current.totalValue).toBe('1200.00');

    // Remover a peça sob encomenda
    act(() => {
      result.current.handleRemoveProduct(added);
    });
    expect(result.current.selectedProducts).toHaveLength(0);
    expect(result.current.totalValue).toBe('0.00');
  });

  it('deve validar nome e preço ao tentar adicionar peça sob encomenda vazia ou sem valor', () => {
    const { result } = renderHook(() => useOrderForm({ clients: mockClients, onSuccess: mockOnSuccess }));

    act(() => {
      result.current.setCustomPartName('');
      result.current.handleAddCustomProduct();
    });

    expect(result.current.productAddError).toBe('Informe a descrição/nome da peça sob demanda.');
    expect(result.current.selectedProducts).toHaveLength(0);

    act(() => {
      result.current.setCustomPartName('Bateria Externa');
      result.current.setCustomPartPrice('0');
    });

    act(() => {
      result.current.handleAddCustomProduct();
    });

    expect(result.current.productAddError).toBe('O valor de venda da peça sob demanda deve ser maior que zero.');
    expect(result.current.selectedProducts).toHaveLength(0);
  });
});
