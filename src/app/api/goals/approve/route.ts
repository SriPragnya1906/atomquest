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
      return NextResponse.json({ error: 'Only managers or admins can approve goal sheets.' }, { status: 403 });
    }

    const { employeeId } = await request.json();
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });
    }

    const goals = await prisma.goal.findMany({
      where: { employeeId },
    });

    if (goals.length === 0) {
      return NextResponse.json({ error: 'Employee has no goals to approve.' }, { status: 400 });
    }

    const now = new Date();

    // Transactionally transition all goals to APPROVED / LOCKED status
    await prisma.$transaction(
      goals.map((goal) =>
        prisma.goal.update({
          where: { id: goal.id },
          data: {
            status: 'LOCKED',
            lockedAt: now,
          },
        })
      )
    );

    await logAudit({
      userId: sessionUser.id,
      action: 'APPROVE',
      newValue: 'LOCKED',
      reason: `Manager approved and locked goal sheet for employee ${employeeId}`,
    });

    return NextResponse.json({ success: true, count: goals.length, lockedAt: now });
  } catch (error: any) {
    console.error('Error approving goals:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
