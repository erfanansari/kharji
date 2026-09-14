import { NextIntlClientProvider } from 'next-intl';

import DataTable from '..';
import type { ColumnDef } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Edit2, Trash2 } from 'lucide-react';

import en from '../../../../messages/en.json';

/**
 * Card mode exists because below `sm` a table can't shrink past its `minWidth`
 * and scrolls the amount, the date and the action buttons off-screen — which is
 * how a user ended up reporting that expenses "can't be edited". These tests
 * pin the escape hatch: the ⋮ reaches the actions, and tables that never opted
 * in are untouched.
 */

// The sheet is a vaul drawer, and vaul's drag handling calls into two APIs
// jsdom doesn't implement: Pointer Capture, and a computed `transform` it can
// parse. Every pointerdown inside the sheet hits both. Plain functions rather
// than jest.fn() because the suite runs with `resetMocks: true`.
beforeAll(() => {
  const proto = window.HTMLElement.prototype;
  proto.setPointerCapture = () => {};
  proto.releasePointerCapture = () => {};
  proto.hasPointerCapture = () => false;

  const computedStyle = window.getComputedStyle.bind(window);
  window.getComputedStyle = (element, pseudo) => {
    const style = computedStyle(element, pseudo);
    if (!style.transform) Object.defineProperty(style, 'transform', { value: 'none' });
    return style;
  };
});

// vaul schedules its exit animation on a timer that outlives the test, which
// Jest reports as a leaked worker. Flush what's pending after each test.
afterEach(() => {
  jest.useFakeTimers();
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

interface Row {
  id: number;
  name: string;
}

const rows: Row[] = [
  { id: 1, name: 'ساندویچ لئو' },
  { id: 2, name: 'ارایشگاه' },
];

const columns: ColumnDef<Row, unknown>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', cell: ({ row }) => row.original.name },
];

const renderTable = (props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <DataTable<Row> data={rows} columns={columns} getRowId={(row) => String(row.id)} {...props} />
    </NextIntlClientProvider>
  );

const mobileCard = (row: Row) => <span>card:{row.name}</span>;

describe('DataTable card mode', () => {
  it('renders no card list when a table has not opted in', () => {
    // The Overview mini tables pass neither prop and must keep their old markup.
    renderTable();

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText('card:ساندویچ لئو')).not.toBeInTheDocument();
    expect(screen.queryByTestId('row-actions-trigger')).not.toBeInTheDocument();
  });

  it('renders a card per row alongside the table once mobileCard is supplied', () => {
    // Both trees are in the DOM at once; CSS picks one, so the table survives.
    renderTable({ mobileCard });

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('card:ساندویچ لئو')).toBeInTheDocument();
    expect(screen.getByText('card:ارایشگاه')).toBeInTheDocument();
  });

  it('hides the ⋮ when a row offers no actions', () => {
    renderTable({ mobileCard });

    expect(screen.queryByTestId('row-actions-trigger')).not.toBeInTheDocument();
  });

  it('opens the sheet from ⋮ and fires the action for that row', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();

    renderTable({
      mobileCard,
      rowActions: (row) => [{ id: 'edit', icon: Edit2, label: 'Edit', onSelect: () => onEdit(row.id) }],
    });

    await user.click(screen.getAllByTestId('row-actions-trigger')[1]);
    await user.click(await screen.findByTestId('row-action-edit'));

    expect(onEdit).toHaveBeenCalledWith(2);
  });

  it('closes the sheet before running the action, so a delete modal is not stacked on it', async () => {
    const user = userEvent.setup();
    const order: string[] = [];

    renderTable({
      mobileCard,
      rowActions: () => [
        {
          id: 'delete',
          icon: Trash2,
          label: 'Delete',
          danger: true,
          onSelect: () => order.push('deleted'),
        },
      ],
    });

    await user.click(screen.getAllByTestId('row-actions-trigger')[0]);
    await user.click(await screen.findByTestId('row-action-delete'));

    expect(order).toEqual(['deleted']);
    expect(screen.queryByTestId('row-action-delete')).not.toBeInTheDocument();
  });

  it('gives the card body to onRowClick when the table has one', async () => {
    const user = userEvent.setup();
    const onRowClick = jest.fn();

    renderTable({
      mobileCard,
      onRowClick,
      rowActions: () => [{ id: 'edit', icon: Edit2, label: 'Edit', onSelect: jest.fn() }],
    });

    await user.click(screen.getByText('card:ارایشگاه'));

    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
    // The body opened details, not the sheet.
    expect(screen.queryByTestId('row-action-edit')).not.toBeInTheDocument();
  });

  it('falls back to opening the sheet when the table has no onRowClick', async () => {
    const user = userEvent.setup();

    // Income and assets have no details drawer; a card that swallows taps reads
    // broken, so the body opens the actions instead.
    renderTable({
      mobileCard,
      rowActions: () => [{ id: 'edit', icon: Edit2, label: 'Edit', onSelect: jest.fn() }],
    });

    await user.click(screen.getByText('card:ساندویچ لئو'));

    expect(await screen.findByTestId('row-action-edit')).toBeInTheDocument();
  });

  it('does not let the ⋮ also trigger the row click behind it', async () => {
    const user = userEvent.setup();
    const onRowClick = jest.fn();

    renderTable({
      mobileCard,
      onRowClick,
      rowActions: () => [{ id: 'edit', icon: Edit2, label: 'Edit', onSelect: jest.fn() }],
    });

    await user.click(screen.getAllByTestId('row-actions-trigger')[0]);

    expect(onRowClick).not.toHaveBeenCalled();
    expect(await screen.findByTestId('row-action-edit')).toBeInTheDocument();
  });
});
