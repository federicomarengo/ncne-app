/**
 * Tests para GenerarCuponesModal
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import GenerarCuponesModal from '@/app/components/modals/GenerarCuponesModal';
import { createClient } from '@/utils/supabase/client';

// Mock de Supabase
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Mock de calcularVistaPreviaCupones
jest.mock('@/app/utils/calcularVistaPreviaCupones', () => ({
  calcularVistaPreviaCupones: jest.fn().mockResolvedValue([]),
}));

describe('GenerarCuponesModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          cuota_social_base: 28000,
          amarra_valor_por_pie: 1000,
          costo_visita: 5000,
          tasa_interes_mora: 0.045,
          dia_vencimiento: 15,
          dias_gracia: 5,
        },
        error: null,
      }),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('no debe renderizar cuando isOpen es false', () => {
    render(
      <GenerarCuponesModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText(/generar cupones/i)).not.toBeInTheDocument();
  });

  it('debe renderizar cuando isOpen es true', () => {
    render(
      <GenerarCuponesModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/generar cupones/i)).toBeInTheDocument();
  });

  it('debe mostrar campos del formulario', () => {
    render(
      <GenerarCuponesModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByLabelText(/mes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/año/i)).toBeInTheDocument();
  });
});

