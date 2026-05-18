import { NextRequest } from 'next/server';
import { prisma } from './db';

export async function getSessionUser(request: NextRequest) {
  // Extract mock user id from header first, then cookie
  const userId = request.headers.get('x-mock-user-id') || request.cookies.get('mock_user_id')?.value;

  if (!userId) {
    // Default fallback to first seeded Employee (Alex Rivera)
    return await prisma.user.findFirst({
      where: { email: 'employee1@atomquest.com' },
      include: { manager: true }
    });
  }

  return await prisma.user.findUnique({
    where: { id: userId },
    include: { manager: true }
  });
}
