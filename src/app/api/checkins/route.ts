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
      return NextResponse.json({ error: 'Only managers or admins can sign off review check-ins.' }, { status: 403 });
    }

    const body = await request.json();
    const { goalId, quarter, comment, employeeId } = body;

    if (!goalId || !quarter || !comment || !employeeId) {
      return NextResponse.json({ error: 'Missing goalId, quarter, employeeId, or comment' }, { status: 400 });
    }

    // Check if check-in already exists
    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        goalId,
        quarter,
        employeeId,
      },
    });

    let checkIn;
    if (existingCheckIn) {
      checkIn = await prisma.checkIn.update({
        where: { id: existingCheckIn.id },
        data: {
          comment,
          managerId: sessionUser.id,
          completedAt: new Date(),
        },
      });
    } else {
      checkIn = await prisma.checkIn.create({
        data: {
          goalId,
          quarter,
          employeeId,
          comment,
          managerId: sessionUser.id,
          completedAt: new Date(),
        },
      });
    }

    await logAudit({
      goalId,
      userId: sessionUser.id,
      action: 'ADD_COMMENT',
      newValue: comment,
      reason: `Manager logged check-in comment for ${quarter}`,
    });

    return NextResponse.json({ success: true, checkIn });
  } catch (error: any) {
    console.error('Error signing off check-in:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
