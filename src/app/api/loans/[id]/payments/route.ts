import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getLateFeeEnabled, recalcLoanStatus } from '@/lib/loan-server';

const paymentInput = z.object({
  amount: z.number().positive(),
  date: z.string().min(1),
  note: z.string().optional().default(''),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = paymentInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await db.payment.create({ data: { ...parsed.data, loanId: id } });
  const lateFeeEnabled = await getLateFeeEnabled();
  const loan = await recalcLoanStatus(id, lateFeeEnabled);
  return NextResponse.json(loan, { status: 201 });
}
