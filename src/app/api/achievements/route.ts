import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { calculateProgressScore } from '@/lib/formulas';
import { syncSharedGoalAchievements } from '@/lib/sharedGoals';
import { logAudit } from '@/lib/audit';

// GET: Fetch achievements for an employee's goals
export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || sessionUser.id;

    const achievements = await prisma.achievement.findMany({
      where: {
        goal: {
          employeeId: employeeId,
        },
      },
      include: {
        goal: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ achievements });
  } catch (error: any) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Log/Update a quarterly achievement
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { goalId, actualValue, actualDate, quarter, notes } = body;

    if (!goalId || !quarter) {
      return NextResponse.json({ error: 'Missing goalId or quarter' }, { status: 400 });
    }

    // Lookup the parent goal to fetch target values and UoMs
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Verify access
    const isOwner = sessionUser.id === goal.employeeId;
    const isSharedRecipient = goal.sharedFromGoalId !== null;

    // Recipients of shared goals have READ-ONLY achievements! 
    // They are automatically synced from primary, and recipients cannot log achievements directly.
    if (isSharedRecipient && isOwner) {
      return NextResponse.json(
        { error: 'This is a shared goal pushed by administration. Achievement figures are read-only and sync automatically.' },
        { status: 400 }
      );
    }

    // Compute progress score
    const targetVal = goal.targetValue;
    const targetDt = goal.targetDate;
    const actVal = actualValue !== undefined && actualValue !== null ? parseFloat(actualValue) : null;
    const actDt = actualDate ? new Date(actualDate) : null;

    const progressScore = calculateProgressScore(
      goal.uomType,
      targetVal,
      targetDt,
      actVal,
      actDt
    );

    // Determine status label
    let statusLabel = 'NOT_STARTED';
    if (progressScore >= 100) {
      statusLabel = 'COMPLETED';
    } else if (progressScore > 0) {
      statusLabel = 'ON_TRACK';
    }

    // Check if achievement already exists for this goal in this specific quarter
    const existingAch = await prisma.achievement.findFirst({
      where: {
        goalId: goal.id,
        quarter: quarter,
      },
    });

    let achievement;
    if (existingAch) {
      // Update existing record
      achievement = await prisma.achievement.update({
        where: { id: existingAch.id },
        data: {
          actualValue: actVal,
          actualDate: actDt,
          achievementStatus: statusLabel,
          progressScore,
          notes,
        },
      });
    } else {
      // Create new record
      achievement = await prisma.achievement.create({
        data: {
          goalId: goal.id,
          actualValue: actVal,
          actualDate: actDt,
          achievementStatus: statusLabel,
          progressScore,
          quarter,
          notes,
        },
      });
    }

    // Log the achievement in the audit trail
    await logAudit({
      goalId: goal.id,
      userId: sessionUser.id,
      action: 'LOG_ACHIEVEMENT',
      oldValue: existingAch && existingAch.actualValue !== null ? String(existingAch.actualValue) : undefined,
      newValue: actVal !== null ? String(actVal) : undefined,
      reason: `Logged ${quarter} achievement. Progress: ${progressScore}%`,
    });

    // CASCADE / AUTO-SYNC: If this is a primary shared goal, sync achievements to children!
    const recipients = await prisma.goal.findMany({
      where: { sharedFromGoalId: goal.id },
    });

    if (recipients.length > 0) {
      await syncSharedGoalAchievements(goal.id);
    }

    return NextResponse.json({ achievement, progressScore, statusLabel });
  } catch (error: any) {
    console.error('Error logging achievement:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
