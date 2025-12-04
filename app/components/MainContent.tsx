'use client';

import React from 'react';
import { useSidebar } from '../contexts/SidebarContext';
import Header from './Header';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { sidebarWidth } = useSidebar();

  return (
    <div 
      className="transition-all duration-300 lg:ml-0"
      style={{ marginLeft: `0px` }}
    >
      <div 
        className="hidden lg:block transition-all duration-300"
        style={{ marginLeft: `${sidebarWidth}px` }}
      >
        <Header />
        <main className="pt-16">
          {children}
        </main>
      </div>
      <div className="lg:hidden">
        <Header />
        <main className="pt-16">
          {children}
        </main>
      </div>
    </div>
  );
}










