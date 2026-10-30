import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MigrationError, QuotaExceededError } from '../domain/errors';
import { StorageRecoveryPage } from './StorageRecoveryPage';

describe('storage recovery page', () => {
  it('shows recovery guidance without offering a destructive reset', () => {
    const error = new QuotaExceededError();
    render(<StorageRecoveryPage error={error} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'We could not open your local planner.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your data has not been deleted. Free up browser storage or export a backup, then try again.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload app' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('gives migration failures a specific, safe title', () => {
    render(<StorageRecoveryPage error={new MigrationError('Upgrade failed safely.')} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Your planner needs a safe update.' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/MIGRATION_FAILED/i)).toBeInTheDocument();
  });
});
