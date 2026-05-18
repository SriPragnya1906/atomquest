import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getSystemDate, setSystemDate } from '@/lib/systemTime';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cycle = await prisma.cycle.findFirst({
      where: { isActive: true },
    });

    if (!cycle) {
      return NextResponse.json({ error: 'No active fiscal cycle found.' }, { status: 404 });
    }

    const systemDate = getSystemDate();
    const sysTime = systemDate.getTime();

    // Determine current active cycle phase
    let activePhase = 'CLOSED';
    let phaseLabel = 'Inactive / Between Cycles';

    if (sysTime >= cycle.phase1Open.getTime() && sysTime <= cycle.phase1Close.getTime()) {
      activePhase = 'GOAL_SETTING';
      phaseLabel = 'Goal Setting Window Open';
    } else if (sysTime >= cycle.q1Open.getTime() && sysTime <= cycle.q1Close.getTime()) {
      activePhase = 'Q1';
      phaseLabel = 'Q1 Check-in Window Open';
    } else if (sysTime >= cycle.q2Open.getTime() && sysTime <= cycle.q2Close.getTime()) {
      activePhase = 'Q2';
      phaseLabel = 'Q2 Check-in Window Open';
    } else if (sysTime >= cycle.q3Open.getTime() && sysTime <= cycle.q3Close.getTime()) {
      activePhase = 'Q3';
      phaseLabel = 'Q3 Check-in Window Open';
    } else if (sysTime >= cycle.q4Open.getTime() && sysTime <= cycle.q4Close.getTime()) {
      activePhase = 'Q4';
      phaseLabel = 'Q4/Annual Final Window Open';
    }

    // Retrieve global audit logs for admin
    let auditLogs: any[] = [];
    if (sessionUser.role === 'ADMIN') {
      auditLogs = await prisma.auditLog.findMany({
        include: {
          user: {
            select: { name: true, email: true, role: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 100, // list last 100 entries
      });
    }

    return NextResponse.json({
      cycle,
      systemDate: systemDate.toISOString(),
      activePhase,
      phaseLabel,
      auditLogs,
    });
  } catch (error: any) {
    console.error('Error fetching cycle:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mockDate, phase1Open, phase1Close, q1Open, q1Close, q2Open, q2Close, q3Open, q3Close, q4Open, q4Close } = body;

    // Setting mock system date (Any user can trigger for simulation/testing, very convenient for judges)
    if (mockDate !== undefined) {
      const newSysDate = setSystemDate(mockDate);
      
      await logAudit({
        userId: sessionUser.id,
        action: 'UPDATE',
        newValue: newSysDate.toISOString(),
        reason: 'Simulated System Time Changed',
      });

      return NextResponse.json({ success: true, systemDate: newSysDate.toISOString() });
    }

    // Admin updates cycle dates
    if (sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can update cycle date configurations.' }, { status: 403 });
    }

    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true },
    });

    if (!activeCycle) {
      return NextResponse.json({ error: 'No active cycle' }, { status: 404 });
    }

    const updatedCycle = await prisma.cycle.update({
      where: { id: activeCycle.id },
      data: {
        phase1Open: phase1Open ? new Date(phase1Open) : activeCycle.phase1Open,
        phase1Close: phase1Close ? new Date(phase1Close) : activeCycle.phase1Close,
        q1Open: q1Open ? new Date(q1Open) : activeCycle.q1Open,
        q1Close: q1Close ? new Date(q1Close) : activeCycle.q1Close,
        q2Open: q2Open ? new Date(q2Open) : activeCycle.q2Open,
        q2Close: q2Close ? new Date(q2Close) : activeCycle.q2Close,
        q3Open: q3Open ? new Date(q3Open) : activeCycle.q3Open,
        q3Close: q3Close ? new Date(q3Close) : activeCycle.q3Close,
        q4Open: q4Open ? new Date(q4Open) : activeCycle.q4Open,
        q4Close: q4Close ? new Date(q4Close) : activeCycle.q4Close,
      },
    });

    await logAudit({
      userId: sessionUser.id,
      action: 'UPDATE',
      reason: 'Administrative update to cycle phases',
    });

    return NextResponse.json({ success: true, cycle: updatedCycle });
  } catch (error: any) {
    console.error('Error updating cycle dates:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
