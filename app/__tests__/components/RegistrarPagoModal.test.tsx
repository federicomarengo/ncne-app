/**
 * Tests para RegistrarPagoModal
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistrarPagoModal from '@/app/components/modals/RegistrarPagoModal';
import { createClient } from '@/utils/supabase/client';

// Mock de Supabase
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Mock de aplicarPagoACupones
jest.mock('@/app/utils/aplicarPagoACupones', () => ({
  aplicarPagoACupones: jest.fn(),
}));

// Mock de calcularSaldoPendienteCupon
jest.mock('@/app/utils/calcularSaldoPendienteCupon', () => ({
  calcularSaldoPendienteCupon: jest.fn(),
}));

describe('RegistrarPagoModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('no debe renderizar cuando isOpen es false', () => {
    render(
      <RegistrarPagoModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText(/registrar pago/i)).not.toBeInTheDocument();
  });

  it('debe renderizar cuando isOpen es true', () => {
    render(
      <RegistrarPagoModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/registrar pago/i)).toBeInTheDocument();
  });

  it('debe mostrar campos del formulario', () => {
    render(
      <RegistrarPagoModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByLabelText(/socio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/monto/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de pago/i)).toBeInTheDocument();
  });

  it('debe llamar onClose cuando se hace clic en cerrar', async () => {
    const user = userEvent.setup();
    
    render(
      <RegistrarPagoModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const closeButton = screen.getByRole('button', { name: /cerrar|×/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});

