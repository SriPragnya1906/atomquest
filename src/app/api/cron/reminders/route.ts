import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const logs: any[] = [];
    const now = new Date();

    // 1. Fetch active cycles to understand current active quarters
    const activeCycle = await prisma.cycle.findFirst({
      where: { isActive: true }
    });

    // 2. Fetch all active users with their goals and managers
    const employees = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      include: {
        manager: true,
        goals: {
          include: {
            checkins: true
          }
        }
      }
    });

    const isGraphConfigured = 
      !!process.env.MICROSOFT_GRAPH_CLIENT_ID && 
      !!process.env.MICROSOFT_GRAPH_CLIENT_SECRET && 
      !!process.env.MICROSOFT_GRAPH_TENANT_ID;

    for (const employee of employees) {
      // Check each goal
      for (const goal of employee.goals) {
        // --- GOAL REMINDERS & ESCALATIONS ---
        const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
        
        if (targetDate) {
          const diffDays = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // Scenario A: Unsubmitted Goal Approaching Target Date (within 7 days)
          if (diffDays >= 0 && diffDays <= 7 && ['DRAFT', 'REJECTED'].includes(goal.status)) {
            const subject = `Approaching Goal Deadline: "${goal.title}"`;
            const body = `Hi ${employee.name},\n\nYour goal "${goal.title}" is in "${goal.status}" status and is approaching its target date of ${targetDate.toLocaleDateString()}. Please complete and submit it for approval.`;
            
            await sendEmailOrLog({
              employee,
              goal,
              subject,
              body,
              isEscalation: false,
              isGraphConfigured,
              logs
            });
          }

          // Scenario B: Unsubmitted Goal Overdue (target date in the past) -> Escalate to Manager
          if (diffDays < 0 && ['DRAFT', 'REJECTED'].includes(goal.status)) {
            const subject = `[URGENT ESCALATION] Overdue Goal Action Required: "${goal.title}"`;
            const body = `Hi ${employee.name},\n\nYour goal "${goal.title}" is in "${goal.status}" status and is OVERDUE (Deadline was ${targetDate.toLocaleDateString()}). This issue has been escalated to your manager, ${employee.manager?.name || 'N/A'}.\n\nPlease update and submit the goal immediately.`;
            
            await sendEmailOrLog({
              employee,
              goal,
              subject,
              body,
              isEscalation: true,
              isGraphConfigured,
              logs
            });
          }
        }

        // --- CHECK-IN REMINDERS ---
        // Scenario C: Approved/Locked Goals missing quarterly progress check-in
        if (['APPROVED', 'LOCKED'].includes(goal.status) && activeCycle) {
          // Identify missing check-ins for the active quarter (e.g. "Q1", "Q2")
          // Let's determine which quarter we are currently in based on Cycle open/close dates
          const currentQuarters = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
          let activeQuarter: typeof currentQuarters[number] | null = null;

          if (now >= new Date(activeCycle.q1Open) && now <= new Date(activeCycle.q1Close)) activeQuarter = 'Q1';
          else if (now >= new Date(activeCycle.q2Open) && now <= new Date(activeCycle.q2Close)) activeQuarter = 'Q2';
          else if (now >= new Date(activeCycle.q3Open) && now <= new Date(activeCycle.q3Close)) activeQuarter = 'Q3';
          else if (now >= new Date(activeCycle.q4Open) && now <= new Date(activeCycle.q4Close)) activeQuarter = 'Q4';

          if (activeQuarter) {
            const hasCheckin = goal.checkins.some(c => c.quarter === activeQuarter && c.completedAt);
            if (!hasCheckin) {
              const subject = `Missing Quarter Check-in: "${goal.title}" (${activeQuarter})`;
              const body = `Hi ${employee.name},\n\nYour goal "${goal.title}" is missing its quarterly progress check-in for ${activeQuarter}. Please schedule a check-in with your manager ${employee.manager?.name || ''} as soon as possible.`;
              
              await sendEmailOrLog({
                employee,
                goal,
                subject,
                body,
                isEscalation: false,
                isGraphConfigured,
                logs
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed reminders scan successfully. Generated ${logs.length} reminder events.`,
      isGraphConfigured,
      events: logs
    });
  } catch (error: any) {
    console.error("Cron reminders failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

interface EmailPayload {
  employee: any;
  goal: any;
  subject: string;
  body: string;
  isEscalation: boolean;
  isGraphConfigured: boolean;
  logs: any[];
}

async function sendEmailOrLog({
  employee,
  goal,
  subject,
  body,
  isEscalation,
  isGraphConfigured,
  logs
}: EmailPayload) {
  const recipient = employee.email;
  const managerRecipient = isEscalation ? employee.manager?.email : null;
  let status = 'SIMULATED';

  if (isGraphConfigured) {
    try {
      // Trigger genuine Graph API email sending
      await sendMicrosoftGraphEmail({
        to: recipient,
        cc: managerRecipient,
        subject,
        body
      });
      status = 'SENT';
    } catch (e: any) {
      console.error(`Graph API email delivery failed to ${recipient}:`, e.message);
      status = 'DELIVERY_FAILED';
    }
  }

  // Create an AuditLog entry so it appears in the sandbox dashboard logs
  const logDetails = {
    to: recipient,
    cc: managerRecipient,
    subject,
    body,
    status,
    timestamp: new Date().toISOString()
  };

  await prisma.auditLog.create({
    data: {
      userId: employee.id,
      goalId: goal.id,
      action: isEscalation ? 'EMAIL_ESCALATION' : 'EMAIL_REMINDER',
      oldValue: isGraphConfigured ? 'MICROSOFT_GRAPH_API' : 'SIMULATOR_FALLBACK',
      newValue: JSON.stringify(logDetails),
      reason: subject
    }
  });

  logs.push(logDetails);
}

// Genuine Microsoft Graph API Email integration using Client Credentials flow
async function sendMicrosoftGraphEmail({
  to,
  cc,
  subject,
  body
}: {
  to: string;
  cc: string | null;
  subject: string;
  body: string;
}) {
  const tenantId = process.env.MICROSOFT_GRAPH_TENANT_ID;
  const clientId = process.env.MICROSOFT_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_GRAPH_CLIENT_SECRET;

  // 1. Fetch token from Azure AD
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: clientId!,
    client_secret: clientSecret!,
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default'
  });

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!tokenRes.ok) {
    throw new Error(`Failed to fetch Azure AD token: ${tokenRes.statusText}`);
  }

  const { access_token } = await tokenRes.json();

  // 2. Send email via Microsoft Graph API sendMail endpoint
  const sendEmailUrl = `https://graph.microsoft.com/v1.0/users/noreply@atomquest.com/sendMail`;
  
  const emailBody: any = {
    message: {
      subject,
      body: {
        contentType: 'Text',
        content: body
      },
      toRecipients: [
        {
          emailAddress: {
            address: to
          }
        }
      ]
    },
    saveToSentItems: 'false'
  };

  if (cc) {
    emailBody.message.ccRecipients = [
      {
        emailAddress: {
          address: cc
        }
      }
    ];
  }

  const sendRes = await fetch(sendEmailUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailBody)
  });

  if (!sendRes.ok) {
    const errorDetail = await sendRes.text();
    throw new Error(`Microsoft Graph API failed: ${sendRes.status} - ${errorDetail}`);
  }
}
