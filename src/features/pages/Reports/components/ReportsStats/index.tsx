import type { Expense } from '@types';

import ExpenseStats from '@features/expenses/components/ExpenseStats';

interface ReportsStatsProps {
  expenses: Expense[];
  expensesHref: string;
}

const ReportsStats = ({ expenses, expensesHref }: ReportsStatsProps) => {
  return (
    <div className="mb-8">
      <ExpenseStats expenses={expenses} totalHref={expensesHref} />
    </div>
  );
};

export default ReportsStats;
