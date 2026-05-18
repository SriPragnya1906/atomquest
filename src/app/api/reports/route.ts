import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import Papa from 'papaparse';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (sessionUser.role !== 'MANAGER' && sessionUser.role !== 'ADMIN') {
      return new Response('Forbidden', { status: 403 });
    }

    // Retrieve all active goals along with parent employee profiles and achievements
    const goals = await prisma.goal.findMany({
      include: {
        employee: {
          select: { name: true, email: true, department: true, role: true },
        },
        achievements: true,
      },
    });

    const reportData = [];

    for (const goal of goals) {
      const achievementsMap = {
        Q1: goal.achievements.find((a) => a.quarter === 'Q1'),
        Q2: goal.achievements.find((a) => a.quarter === 'Q2'),
        Q3: goal.achievements.find((a) => a.quarter === 'Q3'),
        Q4: goal.achievements.find((a) => a.quarter === 'Q4'),
      };

      reportData.push({
        'Employee Name': goal.employee.name,
        'Employee Email': goal.employee.email,
        'Department': goal.employee.department,
        'Goal Title': goal.title,
        'Goal Description': goal.description,
        'Thrust Area': goal.thrustArea,
        'UoM Type': goal.uomType,
        'Target Value': goal.targetValue !== null ? goal.targetValue : 'N/A',
        'Target Date': goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'N/A',
        'Weightage (%)': goal.weightage,
        'Goal Status': goal.status,
        'Q1 Actual': achievementsMap.Q1?.actualValue !== undefined && achievementsMap.Q1?.actualValue !== null ? achievementsMap.Q1.actualValue : 'N/A',
        'Q1 Progress (%)': achievementsMap.Q1 ? achievementsMap.Q1.progressScore : 0,
        'Q2 Actual': achievementsMap.Q2?.actualValue !== undefined && achievementsMap.Q2?.actualValue !== null ? achievementsMap.Q2.actualValue : 'N/A',
        'Q2 Progress (%)': achievementsMap.Q2 ? achievementsMap.Q2.progressScore : 0,
        'Q3 Actual': achievementsMap.Q3?.actualValue !== undefined && achievementsMap.Q3?.actualValue !== null ? achievementsMap.Q3.actualValue : 'N/A',
        'Q3 Progress (%)': achievementsMap.Q3 ? achievementsMap.Q3.progressScore : 0,
        'Q4 Actual': achievementsMap.Q4?.actualValue !== undefined && achievementsMap.Q4?.actualValue !== null ? achievementsMap.Q4.actualValue : 'N/A',
        'Q4 Progress (%)': achievementsMap.Q4 ? achievementsMap.Q4.progressScore : 0,
      });
    }

    const csv = Papa.unparse(reportData);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="atomquest_performance_report.csv"',
      },
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
