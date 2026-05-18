import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { validateGoals } from '@/lib/validation';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employeeId } = await request.json();
    const targetEmpId = employeeId || sessionUser.id;

    // Retrieve all active goals for the employee
    const goals = await prisma.goal.findMany({
      where: { employeeId: targetEmpId },
    });

    if (goals.length === 0) {
      return NextResponse.json(
        { error: 'Cannot submit an empty goal sheet. Please add goals first.' },
        { status: 400 }
      );
    }

    // Perform strict structural weightage validation
    const validation = validateGoals(goals);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    // Transactionally update all goals to SUBMITTED
    await prisma.$transaction(
      goals.map((goal) =>
        prisma.goal.update({
          where: { id: goal.id },
          data: { status: 'SUBMITTED' },
        })
      )
    );

    await logAudit({
      userId: sessionUser.id,
      action: 'SUBMIT',
      newValue: 'SUBMITTED',
      reason: `Goal sheet submitted for employee ${targetEmpId}`,
    });

    return NextResponse.json({ success: true, count: goals.length });
  } catch (error: any) {
    console.error('Error submitting goals:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
