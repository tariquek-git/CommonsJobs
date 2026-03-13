import '@testing-library/jest-dom';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((key) => delete store[key]); },
  get length() { return Object.keys(store).length; },
  key: (index: number) => Object.keys(store)[index] || null,
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
const sessionStore: Record<string, string> = {};
const sessionStorageMock = {
  getItem: (key: string) => sessionStore[key] || null,
  setItem: (key: string, value: string) => { sessionStore[key] = value; },
  removeItem: (key: string) => { delete sessionStore[key]; },
  clear: () => { Object.keys(sessionStore).forEach((key) => delete sessionStore[key]); },
  get length() { return Object.keys(sessionStore).length; },
  key: (index: number) => Object.keys(sessionStore)[index] || null,
};

Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
