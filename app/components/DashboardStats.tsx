'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
  };
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal';
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      icon: 'text-blue-600',
      changePositive: 'text-blue-600',
      changeNegative: 'text-red-600',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      icon: 'text-green-600',
      changePositive: 'text-green-600',
      changeNegative: 'text-red-600',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-900',
      icon: 'text-purple-600',
      changePositive: 'text-purple-600',
      changeNegative: 'text-red-600',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-900',
      icon: 'text-orange-600',
      changePositive: 'text-orange-600',
      changeNegative: 'text-red-600',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      icon: 'text-red-600',
      changePositive: 'text-red-600',
      changeNegative: 'text-red-600',
    },
    teal: {
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      text: 'text-teal-900',
      icon: 'text-teal-600',
      changePositive: 'text-teal-600',
      changeNegative: 'text-red-600',
    },
  };

  const colors = colorClasses[color];
  const isPositive = change && change.value > 0;

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-6`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${colors.text} mb-1`}>{title}</p>
          <p className={`text-3xl font-bold ${colors.text} mb-2`}>{value}</p>
          {change && (
            <div className="flex items-center">
              <span
                className={`text-sm font-medium ${
                  isPositive ? colors.changePositive : colors.changeNegative
                }`}
              >
                {isPositive ? '↑' : '↓'} {Math.abs(change.value)}%
              </span>
              <span className="text-sm text-gray-600 ml-2">{change.label}</span>
            </div>
          )}
        </div>
        <div className={`${colors.icon} ml-4`}>{icon}</div>
      </div>
    </div>
  );
}

interface DashboardStatsProps {
  sociosActivos: number;
  sociosActivosCambio: number;
  ingresosMes: number;
  ingresosCambio: number;
  embarcaciones: number;
  embarcacionesNuevas: number;
  cuponesPendientes: number;
  deudaTotal: number;
  visitasMes: number;
}

export default function DashboardStats({
  sociosActivos,
  sociosActivosCambio,
  ingresosMes,
  ingresosCambio,
  embarcaciones,
  embarcacionesNuevas,
  cuponesPendientes,
  deudaTotal,
  visitasMes,
}: DashboardStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <StatCard
        title="Socios Activos"
        value={sociosActivos}
        change={{
          value: sociosActivosCambio,
          label: 'vs mes anterior',
        }}
        icon={
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        }
        color="blue"
      />
      <StatCard
        title="Ingresos del Mes"
        value={formatCurrency(ingresosMes)}
        change={{
          value: ingresosCambio,
          label: 'vs mes anterior',
        }}
        icon={
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
        color="green"
      />
      <StatCard
        title="Embarcaciones"
        value={embarcaciones}
        change={
          embarcacionesNuevas > 0
            ? {
                value: 100,
                label: `${embarcacionesNuevas} nuevas este mes`,
              }
            : undefined
        }
        icon={
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        }
        color="purple"
      />
      <StatCard
        title="Cupones Pendientes"
        value={cuponesPendientes}
        icon={
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        color="orange"
      />
      <StatCard
        title="Deuda Total"
        value={formatCurrency(deudaTotal)}
        icon={
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        color="red"
      />
      <StatCard
        title="Visitas del Mes"
        value={visitasMes}
        icon={
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
        color="teal"
      />
    </div>
  );
}

