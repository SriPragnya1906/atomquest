import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionUser.role !== 'MANAGER' && sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only managers or admins can reject goal sheets.' }, { status: 403 });
    }

    const { employeeId, feedback } = await request.json();
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });
    }

    const goals = await prisma.goal.findMany({
      where: { employeeId },
    });

    if (goals.length === 0) {
      return NextResponse.json({ error: 'Employee has no goals to reject.' }, { status: 400 });
    }

    // Transactionally update all goals to REJECTED status so employees can edit again
    await prisma.$transaction(
      goals.map((goal) =>
        prisma.goal.update({
          where: { id: goal.id },
          data: { status: 'REJECTED' },
        })
      )
    );

    // Save manager feedback as a standard audit log and optionally as checkins
    await logAudit({
      userId: sessionUser.id,
      action: 'REJECT',
      newValue: 'REJECTED',
      reason: feedback || 'Goal sheet rejected for adjustments',
    });

    return NextResponse.json({ success: true, count: goals.length });
  } catch (error: any) {
    console.error('Error rejecting goals:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
