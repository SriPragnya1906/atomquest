import { prisma } from './db';

interface AuditParams {
  goalId?: string;
  userId: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export async function logAudit({
  goalId,
  userId,
  action,
  oldValue,
  newValue,
  reason,
}: AuditParams) {
  return await prisma.auditLog.create({
    data: {
      goalId,
      userId,
      action,
      oldValue: oldValue ? String(oldValue) : null,
      newValue: newValue ? String(newValue) : null,
      reason,
    },
  });
}
