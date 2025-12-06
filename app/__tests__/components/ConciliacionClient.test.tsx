/**
 * Tests básicos para ConciliacionClient
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import ConciliacionClient from '@/app/conciliacion/ConciliacionClient';
import { MovimientoBancario } from '@/app/types/movimientos_bancarios';

// Mock de dependencias
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/app/utils/parseExtractoBancario', () => ({
  parsearExtracto: jest.fn(),
  procesarMovimiento: jest.fn(),
  filtrarTransferenciasRecibidas: jest.fn(),
}));

jest.mock('@/app/utils/matchingAlgoritmo', () => ({
  ejecutarMatching: jest.fn(),
}));

jest.mock('@/app/utils/confirmarPagoConciliacion', () => ({
  confirmarPagoDesdeMovimiento: jest.fn(),
  confirmarPagosEnLote: jest.fn(),
}));

jest.mock('@/app/utils/generarHashMovimiento', () => ({
  generarHashMovimiento: jest.fn(),
}));

describe('ConciliacionClient', () => {
  const mockMovimientos: MovimientoBancario[] = [];

  it('debe renderizar el componente', () => {
    render(<ConciliacionClient movimientosIniciales={mockMovimientos} />);
    
    expect(screen.getByText(/conciliación bancaria/i)).toBeInTheDocument();
  });

  it('debe mostrar tabs de navegación', () => {
    render(<ConciliacionClient movimientosIniciales={mockMovimientos} />);
    
    expect(screen.getByText(/cargar extracto/i)).toBeInTheDocument();
  });
});

