import { prisma } from './db';
import { calculateProgressScore } from './formulas';

export async function syncSharedGoalAchievements(primaryGoalId: string) {
  // Find all achievements for the primary goal
  const primaryAchievements = await prisma.achievement.findMany({
    where: { goalId: primaryGoalId },
  });

  // Find all recipient child goals
  const recipientGoals = await prisma.goal.findMany({
    where: { sharedFromGoalId: primaryGoalId },
  });

  for (const recipient of recipientGoals) {
    // Delete existing achievements for this recipient goal to prevent key conflicts
    await prisma.achievement.deleteMany({
      where: { goalId: recipient.id },
    });

    // Create synced copies of the achievements for the recipient's goal
    for (const ach of primaryAchievements) {
      const progressScore = calculateProgressScore(
        recipient.uomType,
        recipient.targetValue,
        recipient.targetDate,
        ach.actualValue,
        ach.actualDate
      );

      await prisma.achievement.create({
        data: {
          goalId: recipient.id,
          actualValue: ach.actualValue,
          actualDate: ach.actualDate,
          achievementStatus: ach.achievementStatus,
          progressScore,
          quarter: ach.quarter,
          notes: ach.notes ? `${ach.notes} (Shared Auto-Sync)` : 'Synced from primary shared goal.',
        },
      });
    }
  }
}
