'use client';

import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  message?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export default function ProgressBar({
  current,
  total,
  message,
  showPercentage = true,
  color = 'blue',
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600',
  };

  return (
    <div className="w-full">
      {message && (
        <p className="text-sm text-gray-700 mb-2 font-medium">{message}</p>
      )}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full ${colorClasses[color]} transition-all duration-300 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showPercentage && (
          <span className="text-sm font-semibold text-gray-700 min-w-[50px] text-right">
            {percentage}%
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1.5">
        {current.toLocaleString('es-AR')} de {total.toLocaleString('es-AR')} procesados
      </p>
    </div>
  );
}





