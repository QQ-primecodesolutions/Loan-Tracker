import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateDaysOverdue, calculateBalance, determineStatus, type Loan } from '@/lib/types';

export async function GET() {
  const settings = await db.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global', lateFeeEnabled: true },
  });
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const lateFeeEnabled = body?.lateFeeEnabled;
  if (typeof lateFeeEnabled !== 'boolean') {
    return NextResponse.json({ error: 'lateFeeEnabled must be a boolean' }, { status: 400 });
  }

  await db.settings.upsert({
    where: { id: 'global' },
    update: { lateFeeEnabled },
    create: { id: 'global', lateFeeEnabled },
  });

  const loans = await db.loan.findMany({ include: { payments: true } });
  await Promise.all(
    loans.map((loan) => {
      const daysOverdue = calculateDaysOverdue(loan.dueDate);
      const balance = calculateBalance(loan.amountBorrowed, daysOverdue, lateFeeEnabled, loan.payments);
      const status = determineStatus(loan as unknown as Loan, daysOverdue, balance);
      if (status === loan.status) return Promise.resolve();
      return db.loan.update({ where: { id: loan.id }, data: { status } });
    })
  );

  const updatedLoans = await db.loan.findMany({
    include: { payments: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ lateFeeEnabled, loans: updatedLoans });
}
