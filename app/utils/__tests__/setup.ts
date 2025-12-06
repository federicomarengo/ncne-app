/**
 * Setup global para tests
 */

import '@testing-library/jest-dom';
import { createMockSupabaseClient } from './__mocks__/supabaseClient';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

global.localStorage = localStorageMock as any;

// Mock createClient de Supabase
jest.mock('@/utils/supabase/client', () => {
  const mockClient = createMockSupabaseClient();
  return {
    createClient: jest.fn(() => mockClient),
  };
});

