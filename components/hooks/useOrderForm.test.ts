import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
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
});
