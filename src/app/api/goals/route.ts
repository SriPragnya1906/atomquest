import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

// GET: Fetch goals
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || sessionUser.id;

    // Optional quarter filter
    const goals = await prisma.goal.findMany({
      where: { employeeId },
      include: {
        achievements: true,
        checkins: true,
        owner: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ goals });
  } catch (error: any) {
    console.error('Error fetching goals:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new goal
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      thrustArea,
      uomType,
      targetValue,
      targetDate,
      weightage,
      employeeId,
      sharedFromGoalId,
    } = body;

    const targetEmpId = employeeId || sessionUser.id;

    // Check if the user's sheet is already locked/approved
    const existingGoals = await prisma.goal.findMany({
      where: { employeeId: targetEmpId },
    });

    const isLocked = existingGoals.some(
      (g) => g.status === 'APPROVED' || g.status === 'LOCKED'
    );

    // Block creation if sheet is locked, unless session user is ADMIN
    if (isLocked && sessionUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot add goals because the goal sheet is locked/approved.' },
        { status: 400 }
      );
    }

    // Double check goal limit (max 8)
    if (existingGoals.length >= 8) {
      return NextResponse.json(
        { error: 'Goal limit reached. You can have a maximum of 8 goals.' },
        { status: 400 }
      );
    }

    const goal = await prisma.goal.create({
      data: {
        employeeId: targetEmpId,
        ownerId: sessionUser.id, // primary creator
        title,
        description,
        thrustArea,
        uomType,
        targetValue: targetValue ? parseFloat(targetValue) : null,
        targetDate: targetDate ? new Date(targetDate) : null,
        weightage: parseFloat(weightage || 0),
        status: 'DRAFT',
        sharedFromGoalId: sharedFromGoalId || null,
      },
    });

    await logAudit({
      goalId: goal.id,
      userId: sessionUser.id,
      action: 'CREATE',
      newValue: JSON.stringify({ title, weightage }),
      reason: 'Goal created in draft',
    });

    return NextResponse.json({ goal });
  } catch (error: any) {
    console.error('Error creating goal:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update an existing goal
export async function PUT(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, description, thrustArea, weightage, targetValue, targetDate, status } = body;

    const goal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Role override parameters
    const isManagerOfEmployee = sessionUser.role === 'MANAGER' && sessionUser.id !== goal.employeeId;
    const isAdmin = sessionUser.role === 'ADMIN';
    const isOwner = sessionUser.id === goal.employeeId;

    // Check sheet lock state
    const isLocked = goal.status === 'APPROVED' || goal.status === 'LOCKED';

    if (isLocked && !isManagerOfEmployee && !isAdmin) {
      return NextResponse.json(
        { error: 'Goal sheet is locked. Only managers or admins can modify locked goals.' },
        { status: 400 }
      );
    }

    // Lock shared goal fields: titles and targets are read-only for recipient employee
    let finalTitle = title;
    let finalDescription = description;
    let finalThrustArea = thrustArea;
    let finalTargetValue = targetValue;
    let finalTargetDate = targetDate;

    if (goal.sharedFromGoalId && isOwner) {
      // Recipient employee cannot edit pushed content
      finalTitle = goal.title;
      finalDescription = goal.description;
      finalThrustArea = goal.thrustArea;
      finalTargetValue = goal.targetValue;
      finalTargetDate = goal.targetDate;
    }

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        title: finalTitle,
        description: finalDescription,
        thrustArea: finalThrustArea,
        weightage: weightage ? parseFloat(weightage) : goal.weightage,
        targetValue: finalTargetValue !== undefined ? (finalTargetValue ? parseFloat(finalTargetValue) : null) : goal.targetValue,
        targetDate: finalTargetDate !== undefined ? (finalTargetDate ? new Date(finalTargetDate) : null) : goal.targetDate,
        status: status || goal.status,
      },
    });

    // Record in Audit Trail if sheet was locked or if edited by manager/admin
    if (isLocked || isManagerOfEmployee || isAdmin) {
      await logAudit({
        goalId: goal.id,
        userId: sessionUser.id,
        action: 'UPDATE',
        oldValue: JSON.stringify({ title: goal.title, weightage: goal.weightage }),
        newValue: JSON.stringify({ title: updatedGoal.title, weightage: updatedGoal.weightage }),
        reason: isManagerOfEmployee ? 'Manager inline adjustments' : 'Admin override edit',
      });
    }

    return NextResponse.json({ goal: updatedGoal });
  } catch (error: any) {
    console.error('Error updating goal:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Delete a goal
export async function DELETE(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing goal id' }, { status: 400 });
    }

    const goal = await prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const isLocked = goal.status === 'APPROVED' || goal.status === 'LOCKED';
    if (isLocked && sessionUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete a locked/approved goal.' },
        { status: 400 }
      );
    }

    await prisma.goal.delete({
      where: { id },
    });

    await logAudit({
      userId: sessionUser.id,
      action: 'DELETE',
      oldValue: JSON.stringify({ title: goal.title, weightage: goal.weightage }),
      reason: 'Goal deleted by user',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting goal:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
