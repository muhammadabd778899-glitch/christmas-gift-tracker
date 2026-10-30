import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ConnectionStatus } from './ConnectionStatus';

const originalOnLine = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');

afterEach(() => {
  if (originalOnLine) {
    Object.defineProperty(Navigator.prototype, 'onLine', originalOnLine);
  }
});

describe('ConnectionStatus', () => {
  it('says data is saved on this device while online', () => {
    render(<ConnectionStatus />);

    expect(screen.getByRole('status')).toHaveTextContent('Saved on this device');
    expect(screen.getByRole('status')).not.toHaveTextContent('Offline');
  });

  it('switches to a truthful offline message and back', () => {
    render(<ConnectionStatus />);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByRole('status')).toHaveTextContent('Offline — all data saved on this device');

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.getByRole('status')).toHaveTextContent('Saved on this device');
  });

  it('starts offline when the browser reports no connection', () => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => false,
    });

    render(<ConnectionStatus />);

    expect(screen.getByRole('status')).toHaveTextContent('Offline — all data saved on this device');
  });
});
