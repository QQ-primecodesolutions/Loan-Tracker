import { db } from '@/lib/db';
import { calculateDaysOverdue, calculateBalance, determineStatus, type Loan } from '@/lib/types';

export async function getLateFeeEnabled(): Promise<boolean> {
  const settings = await db.settings.findUnique({ where: { id: 'global' } });
  return settings?.lateFeeEnabled ?? true;
}

export async function recalcLoanStatus(loanId: string, lateFeeEnabled: boolean) {
  const loan = await db.loan.findUniqueOrThrow({
    where: { id: loanId },
    include: { payments: true },
  });
  const daysOverdue = calculateDaysOverdue(loan.dueDate);
  const balance = calculateBalance(loan.amountBorrowed, daysOverdue, lateFeeEnabled, loan.payments);
  const status = determineStatus(loan as unknown as Loan, daysOverdue, balance);

  if (status === loan.status) return loan;
  return db.loan.update({
    where: { id: loanId },
    data: { status },
    include: { payments: true },
  });
}
