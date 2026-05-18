import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['EMAIL_REMINDER', 'EMAIL_ESCALATION']
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        user: true
      },
      take: 20
    });

    const parsedLogs = logs.map(log => {
      let emailDetails = {};
      try {
        emailDetails = log.newValue ? JSON.parse(log.newValue) : {};
      } catch (e) {
        emailDetails = { body: log.newValue || '' };
      }
      return {
        id: log.id,
        action: log.action,
        type: log.oldValue, // 'MICROSOFT_GRAPH_API' or 'SIMULATOR_FALLBACK'
        subject: log.reason,
        timestamp: log.timestamp,
        user: log.user,
        ...emailDetails
      };
    });

    return NextResponse.json({ success: true, logs: parsedLogs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
