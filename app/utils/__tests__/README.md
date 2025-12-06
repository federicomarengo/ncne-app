# Tests Unitarios - Sistema de Gestión Club Náutico

## Instalación

```bash
npm install
```

## Ejecutar Tests

```bash
# Todos los tests
npm test

# Modo watch (recorre automáticamente al guardar)
npm test -- --watch

# Con reporte de cobertura
npm test -- --coverage

# Tests específicos
npm test aplicarPago
npm test calcularSaldo
npm test saldoAFavor
```

## Estructura de Tests

### Facturación
- `calcularCostoAmarra.test.ts` - Cálculo de costos de amarras por tipo de embarcación
- `calcularInteresesMora.test.ts` - Cálculo de intereses por mora
- `calcularVistaPreviaCupones.test.ts` - Generación de vista previa de cupones

### Pagos
- `aplicarPagoACupones.test.ts` - Aplicación básica de pagos a cupones
- `aplicarPagoEscenariosComplejos.test.ts` - Escenarios complejos con saldo a favor, planes, intereses
- `manejarSaldoAFavor.test.ts` - Gestión de saldo a favor
- `aplicarSaldoAFavorACupon.test.ts` - Aplicación de saldo a favor a cupones nuevos
- `confirmarPagoConciliacion.test.ts` - Confirmación de pagos desde conciliación bancaria

### Saldos
- `calcularSaldoPendienteCupon.test.ts` - Cálculo de saldo pendiente por cupón
- `calcularSaldoHistorico.test.ts` - Cálculo de saldo histórico del socio
- `generarHistorialCronologico.test.ts` - Generación de historial cronológico

## Notas

- Los tests NO requieren conexión real a Supabase (usan mocks)
- Cada test es independiente (no hay estado compartido)
- Los mocks permiten simular cualquier escenario de base de datos

