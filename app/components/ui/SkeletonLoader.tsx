'use client';

import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'table' | 'card' | 'circle';
  rows?: number;
  className?: string;
}

export default function SkeletonLoader({ 
  variant = 'text', 
  rows = 3,
  className = '' 
}: SkeletonLoaderProps) {
  if (variant === 'table') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-3">
          {/* Header */}
          <div className="h-10 bg-gray-200 rounded"></div>
          {/* Rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`animate-pulse bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (variant === 'circle') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
      </div>
    );
  }

  // Default: text
  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded"
          style={{ width: i === rows - 1 ? '60%' : '100%' }}
        ></div>
      ))}
    </div>
  );
}

// Skeleton específico para tablas
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
        {/* Body */}
        <div className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="grid grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Skeleton para cards de estadísticas
export function StatCardSkeleton() {
  return (
    <div className="animate-pulse bg-gray-50 border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-gray-300 rounded w-24"></div>
          <div className="h-8 bg-gray-300 rounded w-32"></div>
          <div className="h-3 bg-gray-200 rounded w-40"></div>
        </div>
        <div className="h-12 w-12 bg-gray-300 rounded"></div>
      </div>
    </div>
  );
}

