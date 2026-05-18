const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.auditLog.deleteMany({});
  await prisma.checkIn.deleteMany({});
  await prisma.achievement.deleteMany({});
  await prisma.sharedGoal.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.cycle.deleteMany({});

  console.log('Seeding standard cycle (FY 2024-25)...');
  const cycle = await prisma.cycle.create({
    data: {
      name: 'FY 2024-25',
      fiscalYear: 2024,
      phase1Open: new Date('2024-05-01T00:00:00Z'),
      phase1Close: new Date('2024-06-30T23:59:59Z'),
      q1Open: new Date('2024-07-01T00:00:00Z'),
      q1Close: new Date('2024-09-30T23:59:59Z'),
      q2Open: new Date('2024-10-01T00:00:00Z'),
      q2Close: new Date('2024-12-31T23:59:59Z'),
      q3Open: new Date('2025-01-01T00:00:00Z'),
      q3Close: new Date('2025-02-28T23:59:59Z'),
      q4Open: new Date('2025-03-01T00:00:00Z'),
      q4Close: new Date('2025-04-30T23:59:59Z'),
      isActive: true,
    },
  });

  console.log('Seeding users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // CEO (Admin role)
  const ceo = await prisma.user.create({
    data: {
      email: 'ceo@atomquest.com',
      passwordHash,
      name: 'Elena Rostova',
      role: 'ADMIN',
      department: 'Executive Office',
    },
  });

  // HR Admin (Admin role)
  const hrAdmin = await prisma.user.create({
    data: {
      email: 'admin@atomquest.com',
      passwordHash,
      name: 'Sarah Jenkins',
      role: 'ADMIN',
      department: 'Human Resources',
    },
  });

  // L1 Manager 1
  const manager1 = await prisma.user.create({
    data: {
      email: 'manager@atomquest.com',
      passwordHash,
      name: 'David Vance',
      role: 'MANAGER',
      department: 'Engineering',
      managerId: ceo.id,
    },
  });

  // L1 Manager 2
  const manager2 = await prisma.user.create({
    data: {
      email: 'manager2@atomquest.com',
      passwordHash,
      name: 'Clarissa Cruz',
      role: 'MANAGER',
      department: 'Sales & Marketing',
      managerId: ceo.id,
    },
  });

  // Employee 1 (Direct Report to Manager 1)
  const emp1 = await prisma.user.create({
    data: {
      email: 'employee1@atomquest.com',
      passwordHash,
      name: 'Alex Rivera',
      role: 'EMPLOYEE',
      department: 'Engineering',
      managerId: manager1.id,
    },
  });

  // Employee 2 (Direct Report to Manager 1)
  const emp2 = await prisma.user.create({
    data: {
      email: 'employee2@atomquest.com',
      passwordHash,
      name: 'Bianca Cole',
      role: 'EMPLOYEE',
      department: 'Engineering',
      managerId: manager1.id,
    },
  });

  // Employee 3 (Direct Report to Manager 1)
  const emp3 = await prisma.user.create({
    data: {
      email: 'employee3@atomquest.com',
      passwordHash,
      name: 'Jordan Finch',
      role: 'EMPLOYEE',
      department: 'Engineering',
      managerId: manager1.id,
    },
  });

  // Employee 4 (Direct Report to Manager 2)
  const emp4 = await prisma.user.create({
    data: {
      email: 'employee4@atomquest.com',
      passwordHash,
      name: 'Marcus Sterling',
      role: 'EMPLOYEE',
      department: 'Sales & Marketing',
      managerId: manager2.id,
    },
  });

  console.log('Seeding sample goals...');

  // --- Seed Employee 1 (Alex Rivera) goals: Approved & Locked with Q1 Progress ---
  const alexGoal1 = await prisma.goal.create({
    data: {
      employeeId: emp1.id,
      ownerId: emp1.id,
      title: 'Accelerate Platform API Load Speeds',
      description: 'Optimize indexing and API responses to reduce loading times for high-volume database endpoints.',
      thrustArea: 'Operations',
      uomType: 'NUMERIC_MAX', // Lower is better (reduce latency ms)
      targetValue: 200, // target is 200ms
      weightage: 40,
      status: 'LOCKED',
      lockedAt: new Date('2024-05-18T10:00:00Z'),
    },
  });

  const alexGoal2 = await prisma.goal.create({
    data: {
      employeeId: emp1.id,
      ownerId: emp1.id,
      title: 'Achieve Flawless Core Releases',
      description: 'Ship version 2.4 and 2.5 platform migrations with zero critical production incidents.',
      thrustArea: 'IT',
      uomType: 'ZERO', // 0 is success
      targetValue: 0,
      weightage: 30,
      status: 'LOCKED',
      lockedAt: new Date('2024-05-18T10:00:00Z'),
    },
  });

  const alexGoal3 = await prisma.goal.create({
    data: {
      employeeId: emp1.id,
      ownerId: emp1.id,
      title: 'Roll Out Microservices Architecture Migration',
      description: 'Complete the backend core database migration and decouple legacy monolith elements before Q2 deadline.',
      thrustArea: 'IT',
      uomType: 'TIMELINE',
      targetDate: new Date('2024-09-15T00:00:00Z'),
      weightage: 30,
      status: 'LOCKED',
      lockedAt: new Date('2024-05-18T10:00:00Z'),
    },
  });

  // Seed achievements for Alex Riviera (Q1 achievements)
  await prisma.achievement.create({
    data: {
      goalId: alexGoal1.id,
      actualValue: 180, // Target: 200ms, Actual: 180ms -> (200 / 180) * 100 = 111.11% progress
      achievementStatus: 'ON_TRACK',
      progressScore: 111.11,
      quarter: 'Q1',
      notes: 'Successfully refactored query caching strategies. API latency dropped from 350ms to 180ms average.',
    },
  });

  await prisma.achievement.create({
    data: {
      goalId: alexGoal2.id,
      actualValue: 0, // Target: 0 incidents, Actual: 0 incidents -> 100% progress
      achievementStatus: 'COMPLETED',
      progressScore: 100,
      quarter: 'Q1',
      notes: 'Shipped v2.4 core successfully with zero hotfixes required.',
    },
  });

  await prisma.achievement.create({
    data: {
      goalId: alexGoal3.id,
      actualValue: null,
      actualDate: new Date('2024-09-10T00:00:00Z'), // Done on-time
      achievementStatus: 'COMPLETED',
      progressScore: 100,
      quarter: 'Q1',
      notes: 'Decoupling phase completed early. Service is active and audited.',
    },
  });

  // Seed Manager check-in comments for Alex (Q1)
  await prisma.checkIn.create({
    data: {
      managerId: manager1.id,
      employeeId: emp1.id,
      goalId: alexGoal1.id,
      quarter: 'Q1',
      comment: 'Excellent performance on API optimization. Breaking through the 200ms barrier early is a major win for the mobile app team.',
      completedAt: new Date('2024-07-15T15:00:00Z'),
    },
  });

  await prisma.checkIn.create({
    data: {
      managerId: manager1.id,
      employeeId: emp1.id,
      goalId: alexGoal2.id,
      quarter: 'Q1',
      comment: 'Shipments have been secure and bug-free. Keep up the high testing coverage to maintain this level of deployment quality.',
      completedAt: new Date('2024-07-15T15:00:00Z'),
    },
  });

  await prisma.checkIn.create({
    data: {
      managerId: manager1.id,
      employeeId: emp1.id,
      goalId: alexGoal3.id,
      quarter: 'Q1',
      comment: 'Impressive project management skills shown to decouple the legacy code structure ahead of schedule.',
      completedAt: new Date('2024-07-15T15:00:00Z'),
    },
  });


  // --- Seed Employee 2 (Bianca Cole) goals: Submitted (Awaiting Approval) ---
  const biancaGoal1 = await prisma.goal.create({
    data: {
      employeeId: emp2.id,
      ownerId: emp2.id,
      title: 'Design Premium Frontend Shell',
      description: 'Implement modern, cohesive component system following top-tier aesthetic design principles.',
      thrustArea: 'Operations',
      uomType: 'PERCENTAGE', // Higher is better
      targetValue: 100,
      weightage: 50,
      status: 'SUBMITTED',
    },
  });

  const biancaGoal2 = await prisma.goal.create({
    data: {
      employeeId: emp2.id,
      ownerId: emp2.id,
      title: 'Enhance Screen Reader Accessibility',
      description: 'Attain WCAG 2.2 AA certification across all public client dashboard screens.',
      thrustArea: 'HR',
      uomType: 'PERCENTAGE',
      targetValue: 100,
      weightage: 30,
      status: 'SUBMITTED',
    },
  });

  const biancaGoal3 = await prisma.goal.create({
    data: {
      employeeId: emp2.id,
      ownerId: emp2.id,
      title: 'Reduce Webpack Bundle Sizes',
      description: 'Asset bundle size optimization reducing loading times by 30%.',
      thrustArea: 'IT',
      uomType: 'NUMERIC_MIN',
      targetValue: 30, // 30% reduction
      weightage: 20,
      status: 'SUBMITTED',
    },
  });


  // --- Seed Employee 3 (Jordan Finch) goals: In Draft (Still Editing) ---
  await prisma.goal.create({
    data: {
      employeeId: emp3.id,
      ownerId: emp3.id,
      title: 'Research Machine Learning Integration',
      description: 'Conduct evaluation of modern generative recommendations systems for local search rankings.',
      thrustArea: 'Finance',
      uomType: 'PERCENTAGE',
      targetValue: 100,
      weightage: 40,
      status: 'DRAFT',
    },
  });

  await prisma.goal.create({
    data: {
      employeeId: emp3.id,
      ownerId: emp3.id,
      title: 'Refactor Core Legacy Models',
      description: 'Clean up outmoded ORM mappings and update type interfaces.',
      thrustArea: 'IT',
      uomType: 'PERCENTAGE',
      targetValue: 100,
      weightage: 40,
      status: 'DRAFT',
    },
  });


  // --- Seed Employee 4 (Marcus Sterling) goals: Locked with Sales Targets ---
  const marcusGoal1 = await prisma.goal.create({
    data: {
      employeeId: emp4.id,
      ownerId: emp4.id,
      title: 'Secure New Core Client Accounts',
      description: 'Identify and convert new business targets in high-growth technology markets.',
      thrustArea: 'Sales',
      uomType: 'NUMERIC_MIN',
      targetValue: 15, // 15 new accounts
      weightage: 60,
      status: 'LOCKED',
      lockedAt: new Date('2024-05-20T11:00:00Z'),
    },
  });

  const marcusGoal2 = await prisma.goal.create({
    data: {
      employeeId: emp4.id,
      ownerId: emp4.id,
      title: 'Design Sales Outreach Campaign',
      description: 'Establish structured pipeline templates for outbound email initiatives.',
      thrustArea: 'Sales',
      uomType: 'TIMELINE',
      targetDate: new Date('2024-08-31T00:00:00Z'),
      weightage: 40,
      status: 'LOCKED',
      lockedAt: new Date('2024-05-20T11:00:00Z'),
    },
  });

  // Seed Marcus achievements (Q1)
  await prisma.achievement.create({
    data: {
      goalId: marcusGoal1.id,
      actualValue: 12, // 12 accounts signed -> 12/15 = 80% progress
      achievementStatus: 'ON_TRACK',
      progressScore: 80,
      quarter: 'Q1',
      notes: 'Signed 12 accounts successfully. 4 more in final contracting stage.',
    },
  });

  await prisma.achievement.create({
    data: {
      goalId: marcusGoal2.id,
      actualValue: null,
      actualDate: new Date('2024-08-25T00:00:00Z'), // early
      achievementStatus: 'COMPLETED',
      progressScore: 100,
      quarter: 'Q1',
      notes: 'Outreach campaign templates created and running in HubSpot.',
    },
  });


  // --- Seed a Shared Goal (CEO KPI pushed to David Vance and Clarissa Cruz) ---
  const sharedGoalPrimary = await prisma.goal.create({
    data: {
      employeeId: ceo.id, // Primary CEO sheet
      ownerId: ceo.id,
      title: 'Corporate Customer Satisfaction (CSAT)',
      description: 'Enhance overall corporate customer satisfaction score to a record high.',
      thrustArea: 'Sales',
      uomType: 'PERCENTAGE', // Higher better
      targetValue: 95, // 95%
      weightage: 10,
      status: 'LOCKED',
    },
  });

  // Pushed recipient sheets
  const recipientGoal1 = await prisma.goal.create({
    data: {
      employeeId: manager1.id, // Vance
      ownerId: ceo.id, // CEO is the ultimate owner
      title: 'Corporate Customer Satisfaction (CSAT)',
      description: 'Enhance overall corporate customer satisfaction score to a record high.',
      thrustArea: 'Sales',
      uomType: 'PERCENTAGE',
      targetValue: 95,
      weightage: 20, // 20% in Vance's sheet
      status: 'LOCKED',
      sharedFromGoalId: sharedGoalPrimary.id,
    },
  });

  const recipientGoal2 = await prisma.goal.create({
    data: {
      employeeId: manager2.id, // Cruz
      ownerId: ceo.id,
      title: 'Corporate Customer Satisfaction (CSAT)',
      description: 'Enhance overall corporate customer satisfaction score to a record high.',
      thrustArea: 'Sales',
      uomType: 'PERCENTAGE',
      targetValue: 95,
      weightage: 15, // 15% in Cruz's sheet
      status: 'LOCKED',
      sharedFromGoalId: sharedGoalPrimary.id,
    },
  });

  // Link them in SharedGoal table
  await prisma.sharedGoal.create({
    data: {
      primaryGoalId: sharedGoalPrimary.id,
      recipientEmployeeId: manager1.id,
      weightageInRecipientSheet: 20,
    },
  });

  await prisma.sharedGoal.create({
    data: {
      primaryGoalId: sharedGoalPrimary.id,
      recipientEmployeeId: manager2.id,
      weightageInRecipientSheet: 15,
    },
  });

  // Seed Primary Achievement for Shared CSAT goal
  await prisma.achievement.create({
    data: {
      goalId: sharedGoalPrimary.id,
      actualValue: 93, // 93% out of 95% -> (93/95)*100 = 97.89% progress
      achievementStatus: 'ON_TRACK',
      progressScore: 97.89,
      quarter: 'Q1',
      notes: 'Annual customer survey returned 93% satisfaction score, trending upwards.',
    },
  });

  // Recipient sheets achievements will sync dynamically in our services! 
  // Let's seed initial copies so it shows directly in local SQLite
  await prisma.achievement.create({
    data: {
      goalId: recipientGoal1.id,
      actualValue: 93,
      achievementStatus: 'ON_TRACK',
      progressScore: 97.89,
      quarter: 'Q1',
      notes: 'Synced from Primary CEO shared goal.',
    },
  });

  await prisma.achievement.create({
    data: {
      goalId: recipientGoal2.id,
      actualValue: 93,
      achievementStatus: 'ON_TRACK',
      progressScore: 97.89,
      quarter: 'Q1',
      notes: 'Synced from Primary CEO shared goal.',
    },
  });

  console.log('Seeding complete! Admin and Manager portals are fully active.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
