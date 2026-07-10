import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getLateFeeEnabled, recalcLoanStatus } from '@/lib/loan-server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const { id, paymentId } = await params;
  await db.payment.delete({ where: { id: paymentId } });
  const lateFeeEnabled = await getLateFeeEnabled();
  const loan = await recalcLoanStatus(id, lateFeeEnabled);
  return NextResponse.json(loan);
}
