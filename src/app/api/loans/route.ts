import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getLateFeeEnabled, recalcLoanStatus } from '@/lib/loan-server';

const loanInput = z.object({
  borrowerName: z.string().min(1),
  contact: z.string().min(1),
  amountBorrowed: z.number().positive(),
  dateBorrowed: z.string().min(1),
  dueDate: z.string().min(1),
  notes: z.string().optional().default(''),
});

export async function GET() {
  const loans = await db.loan.findMany({
    include: { payments: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(loans);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loanInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await db.loan.create({ data: { ...parsed.data, status: 'pending' } });
  const lateFeeEnabled = await getLateFeeEnabled();
  const loan = await recalcLoanStatus(created.id, lateFeeEnabled);
  return NextResponse.json(loan, { status: 201 });
}
