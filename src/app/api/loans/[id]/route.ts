import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getLateFeeEnabled, recalcLoanStatus } from '@/lib/loan-server';

const loanUpdateInput = z.object({
  borrowerName: z.string().min(1).optional(),
  contact: z.string().min(1).optional(),
  amountBorrowed: z.number().positive().optional(),
  dateBorrowed: z.string().min(1).optional(),
  dueDate: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = loanUpdateInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await db.loan.update({ where: { id }, data: parsed.data });
  const lateFeeEnabled = await getLateFeeEnabled();
  const loan = await recalcLoanStatus(id, lateFeeEnabled);
  return NextResponse.json(loan);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.loan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
