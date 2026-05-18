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

    if (sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can override goal sheet locks.' }, { status: 403 });
    }

    const { employeeId, reason } = await request.json();
    if (!employeeId) {
      return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: 'A valid reason is required for administrative unlock overrides.' }, { status: 400 });
    }

    const goals = await prisma.goal.findMany({
      where: { employeeId },
    });

    if (goals.length === 0) {
      return NextResponse.json({ error: 'Employee has no goals to unlock.' }, { status: 400 });
    }

    // Reset status to DRAFT so they can edit
    await prisma.$transaction(
      goals.map((goal) =>
        prisma.goal.update({
          where: { id: goal.id },
          data: {
            status: 'DRAFT',
            lockedAt: null,
          },
        })
      )
    );

    await logAudit({
      userId: sessionUser.id,
      action: 'UNLOCK',
      newValue: 'DRAFT',
      reason: reason,
    });

    return NextResponse.json({ success: true, count: goals.length });
  } catch (error: any) {
    console.error('Error unlocking goals:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
