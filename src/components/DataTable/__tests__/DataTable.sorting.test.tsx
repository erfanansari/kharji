import { NextIntlClientProvider } from 'next-intl';

import DataTable from '..';
import type { ColumnDef } from '@tanstack/react-table';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import en from '../../../../messages/en.json';

interface Row {
  id: number;
  name: string;
  qty: number;
}

const rows: Row[] = [
  { id: 1, name: 'Bravo', qty: 2 },
  { id: 2, name: 'Alpha', qty: 3 },
  { id: 3, name: 'Charlie', qty: 1 },
];

const columns: ColumnDef<Row, unknown>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { sortable: true }, cell: ({ row }) => row.original.name },
  { id: 'qty', accessorKey: 'qty', header: 'Qty', cell: ({ row }) => row.original.qty },
];

const renderTable = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DataTable data={rows} columns={columns} getRowId={(r) => String(r.id)} />
    </NextIntlClientProvider>
  );

const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent);

describe('DataTable sorting', () => {
  it('only columns that opt in get a sort button', () => {
    renderTable();
    expect(screen.getByRole('button', { name: /name/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /qty/i })).not.toBeInTheDocument();
  });

  it('cycles ascending, descending, then back to the original order', async () => {
    const user = userEvent.setup();
    renderTable();
    const header = screen.getByRole('columnheader', { name: /name/i });
    const button = within(header).getByRole('button');

    expect(names()).toEqual(['Bravo', 'Alpha', 'Charlie']);
    await user.click(button);
    expect(names()).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    await user.click(button);
    expect(names()).toEqual(['Charlie', 'Bravo', 'Alpha']);
    expect(header).toHaveAttribute('aria-sort', 'descending');
    await user.click(button);
    expect(names()).toEqual(['Bravo', 'Alpha', 'Charlie']);
    expect(header).toHaveAttribute('aria-sort', 'none');
  });
});
