import ExpenseForm from '..';
import { getAssetListKeyGenerator } from '@api/getAssetListQuery';
import userEvent from '@testing-library/user-event';

import type { Asset } from '@types';

import { makeTestQueryClient, render, screen, waitFor } from '@/__tests__/test-utils';

const account = (id: number, name: string): Asset => ({
  id,
  userId: 1,
  category: 'bank',
  name,
  quantity: 1,
  unit: null,
  unitValue: null,
  amount: 7000,
  currency: 'EUR',
  entryRate: 1,
  linkedItem: null,
  notes: null,
  lastValuedAt: '2026-01-01',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

function renderForm(assets: Asset[]) {
  const queryClient = makeTestQueryClient();
  queryClient.setQueryData(getAssetListKeyGenerator(), assets);
  render(<ExpenseForm onExpenseAdded={jest.fn()} />, { queryClient });
}

const picker = () => screen.getByLabelText('Paid from').closest('.space-y-1') as HTMLElement;

describe('ExpenseForm — paid-from pre-select', () => {
  beforeEach(() => localStorage.clear());

  it('pre-fills the only spendable account', async () => {
    renderForm([account(1, 'Euro')]);
    await waitFor(() => expect(screen.getByText('Euro')).toBeInTheDocument());
  });

  // The regression: the pre-select effect has paidFromAssetId among its own
  // dependencies, so clearing the field re-ran it. Without the touched flag it
  // put the account straight back and "Don't track" could never be chosen.
  it('keeps "Don\'t track" once it is chosen, with a single account', async () => {
    const user = userEvent.setup();
    renderForm([account(1, 'Euro')]);
    await waitFor(() => expect(screen.getByText('Euro')).toBeInTheDocument());

    await user.click(screen.getByLabelText('Paid from'));
    await user.click(await screen.findByText("Don't track"));

    await waitFor(() => expect(screen.queryByText('Euro')).not.toBeInTheDocument());
    expect(picker()).toHaveTextContent("Don't track");
  });

  it('keeps "Don\'t track" over a remembered account', async () => {
    localStorage.setItem('kharji-last-account', '2');
    const user = userEvent.setup();
    renderForm([account(1, 'Euro'), account(2, 'Rial')]);
    await waitFor(() => expect(screen.getByText('Rial')).toBeInTheDocument());

    await user.click(screen.getByLabelText('Paid from'));
    await user.click(await screen.findByText("Don't track"));

    await waitFor(() => expect(picker()).toHaveTextContent("Don't track"));
  });
});
