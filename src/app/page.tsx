'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Users,
  Calendar,
  Layers,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Sliders,
  Bell,
  Download,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Check,
  X,
  FileText,
  Clock,
  ArrowRight,
  Database,
  BarChart2,
  PieChart as PieIcon,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import confetti from 'canvas-confetti';

interface Goal {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  thrustArea: string;
  uomType: string;
  targetValue: number | null;
  targetDate: string | null;
  weightage: number;
  status: string;
  lockedAt: string | null;
  sharedFromGoalId: string | null;
  achievements: Achievement[];
  checkins: CheckIn[];
}

interface Achievement {
  id: string;
  goalId: string;
  actualValue: number | null;
  actualDate: string | null;
  achievementStatus: string;
  progressScore: number;
  quarter: string;
  notes: string | null;
}

interface CheckIn {
  id: string;
  quarter: string;
  comment: string;
  completedAt: string | null;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  managerId: string | null;
  manager?: { name: string; email: string };
  employees?: any[];
}

interface Cycle {
  id: string;
  name: string;
  phase1Open: string;
  phase1Close: string;
  q1Open: string;
  q1Close: string;
  q2Open: string;
  q2Close: string;
  q3Open: string;
  q3Close: string;
  q4Open: string;
  q4Close: string;
}

interface AuditLog {
  id: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  timestamp: string;
  user: { name: string; email: string; role: string };
}

export default function Home() {
  // App States
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
  const [systemDate, setSystemDate] = useState<string>('');
  const [activePhase, setActivePhase] = useState<string>('CLOSED');
  const [phaseLabel, setPhaseLabel] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // UI states
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [isEditingGoal, setIsEditingGoal] = useState<string | null>(null);
  const [newGoalForm, setNewGoalForm] = useState({
    title: '',
    description: '',
    thrustArea: 'Operations',
    uomType: 'PERCENTAGE',
    targetValue: '',
    targetDate: '',
    weightage: '20',
  });
  
  // Achievement Logger state
  const [selectedGoalForAchievement, setSelectedGoalForAchievement] = useState<Goal | null>(null);
  const [achievementForm, setAchievementForm] = useState({
    actualValue: '',
    actualDate: '',
    quarter: 'Q1',
    notes: '',
  });

  // Admin states
  const [overrideUnlockReason, setOverrideUnlockReason] = useState<string>('');
  const [showUnlockModalFor, setShowUnlockModalFor] = useState<string | null>(null);
  
  // Notification State
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: string; time: string }>>([
    { id: '1', message: 'Corporate CSAT Shared KPI pushed to all L1 manager sheets.', type: 'info', time: '10 mins ago' },
    { id: '2', message: 'AtomQuest Portal initialized successfully with SQLite dev db.', type: 'success', time: 'Just now' }
  ]);

  // Alert Toasts Center
  const pushNotification = (message: string, type: 'success' | 'warning' | 'info' | 'danger') => {
    setNotifications(prev => [
      { id: Date.now().toString(), message, type, time: 'Just now' },
      ...prev.slice(0, 7)
    ]);
  };

  // Switch Active User / Persona
  const handlePersonaChange = async (userId: string) => {
    const matched = users.find(u => u.id === userId);
    if (matched) {
      setActiveUser(matched);
      document.cookie = `mock_user_id=${matched.id}; path=/`;
      pushNotification(`Persona switched to ${matched.name} (${matched.role})`, 'info');
      // If switching to employee, set report selector empty
      if (matched.role === 'EMPLOYEE') {
        setSelectedReportId('');
      } else if (matched.role === 'MANAGER' && matched.employees && matched.employees.length > 0) {
        // default to their first report
        setSelectedReportId(matched.employees[0].id);
      }
    }
  };

  // Fetch initial system configuration, cycle date states, and users list
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        if (!activeUser) {
          setActiveUser(data.sessionUser);
          if (data.sessionUser.role === 'MANAGER' && data.sessionUser.employees?.length > 0) {
            setSelectedReportId(data.sessionUser.employees[0].id);
          }
        }
      }

      // Fetch active cycle details
      const cycleRes = await fetch('/api/cycles');
      const cycleData = await cycleRes.json();
      if (cycleData.cycle) {
        setActiveCycle(cycleData.cycle);
        setSystemDate(cycleData.systemDate);
        setActivePhase(cycleData.activePhase);
        setPhaseLabel(cycleData.phaseLabel);
        if (cycleData.auditLogs) {
          setAuditLogs(cycleData.auditLogs);
        }
      }
    } catch (err) {
      console.error('Error loading config:', err);
    }
  }, [activeUser]);

  // Fetch Goals based on selected profile context
  const fetchGoals = useCallback(async () => {
    if (!activeUser) return;
    try {
      // Determine whose goals to fetch
      let targetId = activeUser.id;
      if (activeUser.role === 'MANAGER' && selectedReportId) {
        targetId = selectedReportId;
      } else if (activeUser.role === 'ADMIN' && selectedReportId) {
        targetId = selectedReportId;
      }
      
      const res = await fetch(`/api/goals?employeeId=${targetId}`, {
        headers: { 'x-mock-user-id': activeUser.id }
      });
      const data = await res.json();
      if (data.goals) {
        setGoals(data.goals);
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
    }
  }, [activeUser, selectedReportId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Time machine: Fast-forward simulated date
  const handleFastForwardDate = async (newDateStr: string) => {
    if (!activeUser) return;
    try {
      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-user-id': activeUser.id
        },
        body: JSON.stringify({ mockDate: newDateStr })
      });
      const data = await res.json();
      if (data.success) {
        setSystemDate(data.systemDate);
        pushNotification(`Simulated time successfully shifted to ${new Date(newDateStr).toLocaleDateString()}`, 'success');
        // reload configurations
        fetchConfig();
      }
    } catch (err) {
      console.error('Error updating mock time:', err);
    }
  };

  // Goals submission
  const handleSubmitGoals = async () => {
    if (!activeUser) return;
    try {
      const res = await fetch('/api/goals/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-user-id': activeUser.id
        },
        body: JSON.stringify({ employeeId: activeUser.id })
      });
      const data = await res.json();
      if (res.ok) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        pushNotification('Goals sheet successfully validated and submitted to your manager!', 'success');
        fetchGoals();
        fetchConfig();
      } else {
        pushNotification(data.error || 'Submission failed.', 'danger');
        if (data.errors) {
          data.errors.forEach((e: string) => pushNotification(e, 'warning'));
        }
      }
    } catch (err) {
      console.error('Error submitting goals:', err);
    }
  };

  // Manager Approve and Lock Sheet
  const handleApproveGoals = async (empId: string) => {
    if (!activeUser) return;
    try {
      const res = await fetch('/api/goals/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-user-id': activeUser.id
        },
        body: JSON.stringify({ employeeId: empId })
      });
      const data = await res.json();
      if (res.ok) {
        confetti({ particleCount: 150, spread: 80, colors: ['#2D1E18', '#8C7569', '#5F7161'] });
        pushNotification(`Successfully approved and LOCKED the goal sheet for report!`, 'success');
        fetchGoals();
        fetchConfig();
      } else {
        pushNotification(data.error || 'Approval failed.', 'danger');
      }
    } catch (err) {
      console.error('Error approving goals:', err);
    }
  };

  // Manager Reject Sheet with feedback
  const handleRejectGoals = async (empId: string, feedback: string) => {
    if (!activeUser) return;
    try {
      const res = await fetch('/api/goals/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-user-id': activeUser.id
        },
        body: JSON.stringify({ employeeId: empId, feedback })
      });
      if (res.ok) {
        pushNotification(`Goal sheet rejected. Comments logged and status reset to draft for adjustments.`, 'warning');
        fetchGoals();
        fetchConfig();
      }
    } catch (err) {
      console.error('Error rejecting goals:', err);
    }
  };

  // Admin Unlock Sheet override
  const handleAdminUnlock = async () => {
    if (!activeUser || !showUnlockModalFor || !overrideUnlockReason) return;
    try {
      const res = await fetch('/api/goals/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-user-id': activeUser.id
        },
        body: JSON.stringify({ employeeId: showUnlockModalFor, reason: overrideUnlockReason })
      });
      const data = await res.json();
      if (res.ok) {
        pushNotification(`Sheet unlocked successfully! Employee state reset to Draft.`, 'success');
        setShowUnlockModalFor(null);
        setOverrideUnlockReason('');
        fetchGoals();
        fetchConfig();
      } else {
        pushNotification(data.error || 'Unlock override failed.', 'danger');
      }
    } catch (err) {
      console.error('Error unlocking sheet:', err);
    }
  };

  // Create Goal
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-user-id': activeUser.id
        },
        body: JSON.stringify({
          title: newGoalForm.title,
          description: newGoalForm.description,
          thrustArea: newGoalForm.thrustArea,
          uomType: newGoalForm.uomType,
          targetValue: newGoalForm.targetValue,
          targetDate: newGoalForm.targetDate || null,
          weightage: newGoalForm.weightage,
          employeeId: activeUser.id
        })
      });
      const data = await res.json();
      if (res.ok) {
        pushNotification(`Draft goal "${newGoalForm.title}" added successfully!`, 'success');
        setNewGoalForm({
          title: '',
          description: '',
          thrustArea: 'Operations',
          uomType: 'PERCENTAGE',
          targetValue: '',
          targetDate: '',
          weightage: '20'
        });
        fetchGoals();
      } else {
        pushNotification(data.error || 'Could not add goal.', 'danger');
      }
    } catch (err) {
      console.error('Error creating goal:', err);
    }
  };

  // Inline Weightage Edit
  const handleUpdateGoalField = async (goalId: string, updatedFields: Partial<Goal>) => {
    if (!activeUser) return;
    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-user-id': activeUser.id
        },
        body: JSON.stringify({ id: goalId, ...updatedFields })
      });
      const data = await res.json();
      if (res.ok) {
        pushNotification(`Goal updated successfully.`, 'success');
        setIsEditingGoal(null);
        fetchGoals();
      } else {
        pushNotification(data.error || 'Update failed.', 'danger');
      }
    } catch (err) {
      console.error('Error updating goal:', err);
    }
  };

  // Delete Goal
  const handleDeleteGoal = async (goalId: string) => {
    if (!activeUser) return;
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      const res = await fetch(`/api/goals?id=${goalId}`, {
        method: 'DELETE',
        headers: { 'x-mock-user-id': activeUser.id }
      });
      if (res.ok) {
        pushNotification(`Goal deleted successfully.`, 'success');
        fetchGoals();
      } else {
        const data = await res.json();
        pushNotification(data.error || 'Delete failed.', 'danger');
      }
    } catch (err) {
      console.error('Error deleting goal:', err);
    }
  };

  // Log Achievements
  const handleLogAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || !selectedGoalForAchievement) return;

    try {
      const res = await fetch('/api/achievements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-user-id': activeUser.id
        },
        body: JSON.stringify({
          goalId: selectedGoalForAchievement.id,
          actualValue: achievementForm.actualValue || null,
          actualDate: achievementForm.actualDate || null,
          quarter: achievementForm.quarter,
          notes: achievementForm.notes
        })
      });
      const data = await res.json();
      if (res.ok) {
        confetti({ particleCount: 50, colors: ['#8C7569', '#5F7161'] });
        pushNotification(`Quarterly achievement for "${selectedGoalForAchievement.title}" logged successfully! Score: ${data.progressScore}%`, 'success');
        
        // If this CSAT goal had sync recipients, push notification
        if (selectedGoalForAchievement.title.includes('CSAT')) {
          pushNotification('SHARED GOAL TRIGGERED: Synced achievement score down to Vance and Cruz direct sheets automatically!', 'info');
        }

        setSelectedGoalForAchievement(null);
        setAchievementForm({
          actualValue: '',
          actualDate: '',
          quarter: 'Q1',
          notes: ''
        });
        fetchGoals();
        fetchConfig();
      } else {
        pushNotification(data.error || 'Failed to log achievement.', 'danger');
      }
    } catch (err) {
      console.error('Error logging achievement:', err);
    }
  };

  // Manager review comment submission
  const handleManagerComment = async (goalId: string, comment: string, quarter: string) => {
    if (!activeUser || !selectedReportId) return;
    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-user-id': activeUser.id
        },
        body: JSON.stringify({ goalId, quarter, comment, employeeId: selectedReportId })
      });
      if (res.ok) {
        pushNotification(`Check-in comments and sign-off recorded for ${quarter}!`, 'success');
        fetchGoals();
      }
    } catch (err) {
      console.error('Error signing off check-in:', err);
    }
  };

  // Math helper: sum goal weightages
  const totalWeightageSum = goals.reduce((sum, g) => sum + g.weightage, 0);

  // Chart Mappings
  const chartThrustAreas = React.useMemo(() => {
    const counts: Record<string, number> = { Operations: 0, IT: 0, Sales: 0, HR: 0, Finance: 0, Other: 0 };
    goals.forEach(g => {
      if (counts[g.thrustArea] !== undefined) {
        counts[g.thrustArea] += g.weightage;
      } else {
        counts.Other += g.weightage;
      }
    });
    return Object.entries(counts)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => ({ name: k, value: v }));
  }, [goals]);

  // Elegant warm editorial color palette
  const COLORS = ['#2D1E18', '#8C7569', '#E07A5F', '#5F7161', '#D0A97E', '#7E7C73'];

  const chartStatusRates = React.useMemo(() => {
    const map = { DRAFT: 0, SUBMITTED: 0, LOCKED: 0, REJECTED: 0 };
    goals.forEach(g => {
      const s = g.status as keyof typeof map;
      if (map[s] !== undefined) map[s]++;
    });
    return Object.entries(map).map(([k, v]) => ({ name: k, count: v }));
  }, [goals]);

  // QoQ average progress score
  const chartQoQProgress = React.useMemo(() => {
    const sums = { Q1: { sum: 0, count: 0 }, Q2: { sum: 0, count: 0 }, Q3: { sum: 0, count: 0 }, Q4: { sum: 0, count: 0 } };
    goals.forEach(g => {
      g.achievements.forEach(a => {
        const q = a.quarter as keyof typeof sums;
        if (sums[q]) {
          sums[q].sum += a.progressScore;
          sums[q].count++;
        }
      });
    });
    return Object.entries(sums).map(([q, val]) => ({
      quarter: q,
      Score: val.count > 0 ? Math.round((val.sum / val.count) * 100) / 100 : 0
    }));
  }, [goals]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F7F5F0]">
      
      {/* 1. TOP PREMIUM HEADER & ROLE SWITCHER */}
      <header className="sticky top-0 z-40 border-b border-[#E8E5DD] bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#2D1E18] rounded-xl shadow-sm">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-lg tracking-wide text-[#2C221E]">
              ATOMQUEST
            </h1>
            <p className="text-[9px] uppercase font-mono tracking-widest text-[#7A6F6A] font-semibold">
              Goal & Alignment Portal
            </p>
          </div>
        </div>

        {/* Live Switcher Select */}
        <div className="flex items-center gap-4">
          
          {/* Simulated Cycle state indicators */}
          <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E8E5DD]">
            <Calendar className="w-3.5 h-3.5 text-[#8C7569]" />
            <div className="text-left">
              <p className="text-[8px] uppercase font-mono text-[#7A6F6A]">Simulated Phase</p>
              <p className="text-xs font-semibold text-[#2C221E] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                {phaseLabel || 'Closed'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#7A6F6A]" />
            <select
              value={activeUser?.id || ''}
              onChange={(e) => handlePersonaChange(e.target.value)}
              className="bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3 py-2 rounded-xl focus:ring-1 focus:ring-[#2D1E18] focus:outline-none cursor-pointer font-medium hover:border-[#D5D1C6] transition"
            >
              <option disabled>Select Switchable Persona...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'ADMIN' && u.name.includes('CEO') ? 'CEO' : u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Refresh Icon */}
          <button 
            onClick={() => { fetchConfig(); fetchGoals(); pushNotification('Data refreshed successfully.', 'success'); }} 
            className="p-2 hover:bg-[#FCFAF7] rounded-xl border border-[#E8E5DD] hover:border-[#D5D1C6] transition"
            title="Reload Data"
          >
            <RefreshCw className="w-4 h-4 text-[#7A6F6A]" />
          </button>
        </div>
      </header>

      {/* 2. BODY CONTENT LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: PROFILE CARD, TIME MACHINE, NOTIFICATION CENTER */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Active Profile Info */}
          <div className="glass-panel rounded-2xl p-5 border border-[#E8E5DD] bg-white">
            <div className="relative pb-4 mb-4 border-b border-[#F2EFE8] flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#E8E5DD] flex items-center justify-center font-bold text-[#2C221E] font-display text-lg">
                {activeUser?.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h2 className="font-display font-bold text-[#2C221E]">{activeUser?.name}</h2>
                <p className="text-xs text-[#8C7569] font-medium">{activeUser?.role} // {activeUser?.department}</p>
              </div>
              <span className="absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold rounded-md bg-[#2D1E18]/5 border border-[#2D1E18]/15 text-[#2C221E]">
                ACTIVE
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-[#7A6F6A]">
              <div className="flex justify-between">
                <span>Account:</span>
                <span className="text-[#2C221E] font-mono">{activeUser?.email}</span>
              </div>
              {activeUser?.manager && (
                <div className="flex justify-between">
                  <span>Reporting Manager:</span>
                  <span className="text-[#2C221E]">{activeUser.manager.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* SIMULATED SYSTEM TIME OVERRIDE (ADMIN & TESTING MODULE) */}
          <div className="glass-panel rounded-2xl p-5 border border-[#E8E5DD] bg-white">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[#8C7569]" />
              <h3 className="font-display font-semibold text-sm text-[#2C221E] uppercase tracking-wider">
                System Time Machine
              </h3>
            </div>
            <p className="text-xs text-[#7A6F6A] mb-4 leading-relaxed">
              Fast-forward system dates to test dynamic cycle locks and log achievements within scheduled windows instantly:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleFastForwardDate('2024-05-15T00:00:00Z')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition ${
                  activePhase === 'GOAL_SETTING'
                    ? 'border-[#2D1E18] bg-[#2D1E18]/5 text-[#2D1E18]'
                    : 'border-[#E8E5DD] hover:border-[#D5D1C6] bg-white text-[#7A6F6A]'
                }`}
              >
                <span>May 15 (Goal Setting Phase)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleFastForwardDate('2024-07-15T00:00:00Z')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition ${
                  activePhase === 'Q1'
                    ? 'border-[#2D1E18] bg-[#2D1E18]/5 text-[#2D1E18]'
                    : 'border-[#E8E5DD] hover:border-[#D5D1C6] bg-white text-[#7A6F6A]'
                }`}
              >
                <span>July 15 (Q1 Check-in Open)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleFastForwardDate('2024-10-15T00:00:00Z')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition ${
                  activePhase === 'Q2'
                    ? 'border-[#2D1E18] bg-[#2D1E18]/5 text-[#2D1E18]'
                    : 'border-[#E8E5DD] hover:border-[#D5D1C6] bg-white text-[#7A6F6A]'
                }`}
              >
                <span>Oct 15 (Q2 Check-in Open)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleFastForwardDate('2025-01-15T00:00:00Z')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition ${
                  activePhase === 'Q3'
                    ? 'border-[#2D1E18] bg-[#2D1E18]/5 text-[#2D1E18]'
                    : 'border-[#E8E5DD] hover:border-[#D5D1C6] bg-white text-[#7A6F6A]'
                }`}
              >
                <span>Jan 15 (Q3 Check-in Open)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Custom Input override */}
            <div className="mt-4 pt-4 border-t border-[#F2EFE8]">
              <label className="block text-[9px] uppercase tracking-wider text-[#7A6F6A] mb-1.5 font-mono">
                Or Set Precise Date:
              </label>
              <input
                type="date"
                value={systemDate ? systemDate.split('T')[0] : ''}
                onChange={(e) => handleFastForwardDate(new Date(e.target.value).toISOString())}
                className="w-full bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2D1E18] hover:border-[#D5D1C6] transition"
              />
            </div>
          </div>

          {/* SIMULATED SYSTEM TRIGGER ALERT NOTIFICATION FEED */}
          <div className="glass-panel rounded-2xl p-5 border border-[#E8E5DD] bg-white">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#8C7569]" />
                <h3 className="font-display font-semibold text-sm text-[#2C221E] uppercase tracking-wider">
                  Audited Alerts
                </h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-600 pulse-dot"></span>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-xl border text-xs leading-normal ${
                    notif.type === 'success'
                      ? 'bg-emerald-50/70 border-emerald-200/50 text-emerald-800'
                      : notif.type === 'warning'
                      ? 'bg-amber-50/70 border-amber-200/50 text-amber-800'
                      : notif.type === 'danger'
                      ? 'bg-rose-50/70 border-rose-200/50 text-rose-800'
                      : 'bg-[#FAF8F5] border-[#E8E5DD] text-[#2C221E]'
                  }`}
                >
                  <p className="font-medium">{notif.message}</p>
                  <span className="block mt-1.5 text-[9px] font-mono text-[#7A6F6A]">{notif.time}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* CENTER & RIGHT AREAS: MAIN ACTION PANELS */}
        <div className="lg:col-span-3 flex flex-col gap-6">

          {/* MANAGER & ADMIN SUB-DASHBOARD CONTROL STRIP */}
          {(activeUser?.role === 'MANAGER' || activeUser?.role === 'ADMIN') && (
            <div className="glass-panel rounded-2xl p-5 border border-[#E8E5DD] bg-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#FAF8F5] border border-[#E8E5DD] rounded-xl">
                    <Sliders className="w-5 h-5 text-[#8C7569]" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#2C221E]">
                      {activeUser.role} Dashboard Controls
                    </h3>
                    <p className="text-xs text-[#7A6F6A]">
                      Manage team sheet locks, run override adjustments, or download quarterly reports.
                    </p>
                  </div>
                </div>

                {/* Subordinate Report selectors */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#7A6F6A]">Review Employee:</span>
                    <select
                      value={selectedReportId}
                      onChange={(e) => setSelectedReportId(e.target.value)}
                      className="bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2D1E18]"
                    >
                      <option value="">-- None Selected --</option>
                      {users
                        .filter((u) => u.role !== 'ADMIN')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.department})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* CSV Export Button */}
                  <a
                    href={`/api/reports?employeeId=${selectedReportId}`}
                    download
                    className="px-4 py-2 bg-[#2D1E18] text-white hover:bg-[#3D2B24] border border-[#2D1E18] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-[#2D1E18]/10 transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* GOALS LIST PANEL */}
          <div className="glass-panel rounded-2xl p-6 border border-[#E8E5DD] bg-white">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#8C7569]" />
                <h3 className="font-display font-bold text-base text-[#2C221E]">
                  {activeUser?.role === 'EMPLOYEE' ? 'My Performance Goal Sheet' : 'Reviewed Performance Sheet'}
                </h3>
              </div>

              {/* Status summary */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#7A6F6A]">
                  Goals: <strong className="text-[#2C221E]">{goals.length}/8</strong>
                </span>
                
                {/* Weightage Gauge indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#7A6F6A]">Total Weight:</span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono ${
                    Math.abs(totalWeightageSum - 100) < 0.01 
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                      : 'bg-amber-50 border border-amber-200 text-amber-800'
                  }`}>
                    {totalWeightageSum}%
                  </span>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {goals.length === 0 && (
              <div className="py-12 border-2 border-dashed border-[#E8E5DD] bg-[#FAF8F5] rounded-2xl text-center">
                <Target className="w-12 h-12 text-[#7A6F6A]/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-[#2C221E]">No goals found on this sheet.</p>
                <p className="text-xs text-[#7A6F6A] mt-1">Goal sheets are either uninitialized or blank.</p>
              </div>
            )}

            {/* Goals list */}
            {goals.length > 0 && (
              <div className="space-y-4">
                {goals.map((goal) => {
                  const isLocked = goal.status === 'APPROVED' || goal.status === 'LOCKED';
                  const isShared = goal.sharedFromGoalId !== null;
                  
                  return (
                    <div
                      key={goal.id}
                      className="glass-panel glass-panel-hover rounded-2xl p-5 border border-[#E8E5DD] bg-white relative"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        
                        {/* Goal text and descriptions */}
                        <div className="space-y-1.5 max-w-xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-display font-bold text-sm text-[#2C221E]">{goal.title}</h4>
                            
                            {/* Thrust Area Label */}
                            <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-[#FAF8F5] border border-[#E8E5DD] text-[#7A6F6A] font-mono">
                              {goal.thrustArea}
                            </span>
                            
                            {/* Shared Badges */}
                            {isShared && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#FAF8F5] border border-[#D5D1C6] text-[#8C7569]">
                                Shared Primary KPI
                              </span>
                            )}

                            {/* Goal Status Badge */}
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              goal.status === 'LOCKED' 
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                                : goal.status === 'SUBMITTED'
                                ? 'bg-blue-50 border border-blue-200 text-blue-800'
                                : goal.status === 'REJECTED'
                                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                                : 'bg-slate-50 border border-slate-200 text-slate-500'
                            }`}>
                              {goal.status}
                            </span>
                          </div>
                          
                          <p className="text-xs text-[#7A6F6A] leading-relaxed">{goal.description}</p>
                          
                          {/* Unit of measure target definitions */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1.5 text-[10px] text-[#7A6F6A] font-mono">
                            <div>Strategy: <strong className="text-[#2C221E]">{goal.uomType}</strong></div>
                            {goal.targetValue !== null && (
                              <div>Target: <strong className="text-[#2C221E]">{goal.targetValue}</strong></div>
                            )}
                            {goal.targetDate && (
                              <div>Target Date: <strong className="text-[#2C221E]">{new Date(goal.targetDate).toLocaleDateString()}</strong></div>
                            )}
                          </div>
                        </div>

                        {/* Weightage and progress meters */}
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 min-w-[120px]">
                          
                          {/* Weightage editing or viewing */}
                          <div className="text-right">
                            <span className="block text-[9px] uppercase font-mono text-[#7A6F6A]">Weightage</span>
                            
                            {isEditingGoal === goal.id ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <input
                                  type="number"
                                  defaultValue={goal.weightage}
                                  id={`w-${goal.id}`}
                                  className="w-14 bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-1.5 py-1 rounded text-center focus:outline-none"
                                />
                                <button
                                  onClick={() => {
                                    const val = (document.getElementById(`w-${goal.id}`) as HTMLInputElement)?.value;
                                    handleUpdateGoalField(goal.id, { weightage: parseFloat(val) });
                                  }}
                                  className="p-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded hover:bg-emerald-100 transition"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setIsEditingGoal(null)}
                                  className="p-1 bg-rose-50 border border-rose-200 text-rose-700 rounded hover:bg-rose-100 transition"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                                <strong className="text-sm font-bold text-[#2C221E] font-mono">{goal.weightage}%</strong>
                                
                                {/* Edit weightage toggle button */}
                                {(!isLocked || activeUser?.role === 'MANAGER' || activeUser?.role === 'ADMIN') && (
                                  <button
                                    onClick={() => setIsEditingGoal(goal.id)}
                                    className="p-1 hover:bg-[#FAF8F5] rounded border border-transparent hover:border-[#E8E5DD] transition"
                                    title="Edit Weightage"
                                  >
                                    <Sliders className="w-3 h-3 text-[#7A6F6A]" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Achievements scores display */}
                          {goal.achievements.length > 0 && (
                            <div className="text-right">
                              <span className="block text-[9px] uppercase font-mono text-[#7A6F6A]">Q1 Progress</span>
                              <span className="text-xs font-bold text-[#8C7569] font-mono">
                                {goal.achievements[0].progressScore}%
                              </span>
                            </div>
                          )}

                          {/* Action icons (Delete) */}
                          {!isLocked && (
                            <button
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="p-1.5 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl text-rose-600 transition active:scale-95"
                              title="Delete Goal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                      </div>

                      {/* Display inline manager review feedback comments if any */}
                      {goal.checkins.length > 0 && (
                        <div className="mt-4 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-900 leading-normal">
                          <strong>Manager Comment:</strong> "{goal.checkins[0].comment}"
                        </div>
                      )}

                      {/* QUICK QUARTERLY LOGGERS SLIDER PANEL */}
                      {isLocked && activeUser?.role === 'EMPLOYEE' && activePhase !== 'GOAL_SETTING' && activePhase !== 'CLOSED' && (
                        <div className="mt-4 pt-4 border-t border-[#F2EFE8] flex items-center justify-between gap-4">
                          <div className="flex items-center gap-1.5 text-xs text-[#7A6F6A]">
                            <Clock className="w-3.5 h-3.5 text-[#8C7569]" />
                            <span>Quarterly achievements logging active for <strong>{activePhase}</strong></span>
                          </div>
                          
                          {/* Log button */}
                          <button
                            onClick={() => {
                              setSelectedGoalForAchievement(goal);
                              setAchievementForm(prev => ({ ...prev, quarter: activePhase }));
                            }}
                            disabled={isShared} // shared goals read-only for recipient
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition active:scale-95 ${
                              isShared 
                                ? 'bg-[#FAF8F5] border-[#E8E5DD] text-slate-400 cursor-not-allowed'
                                : 'bg-white border-[#E8E5DD] text-[#2D1E18] hover:bg-[#FAF8F5]'
                            }`}
                          >
                            {isShared ? 'Shared Auto-Synced' : `Log ${activePhase} Actuals`}
                          </button>
                        </div>
                      )}

                      {/* MANAGER CHECK-IN SIGN-OFF BOX */}
                      {isLocked && activeUser?.role === 'MANAGER' && selectedReportId && activePhase !== 'GOAL_SETTING' && activePhase !== 'CLOSED' && (
                        <div className="mt-4 pt-4 border-t border-[#F2EFE8]">
                          <label className="block text-xs font-semibold text-[#2C221E] mb-2">
                            Log Manager {activePhase} Discussion Comments:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Write quarterly check-in review comments..."
                              id={`comment-${goal.id}`}
                              defaultValue={goal.checkins.find(c => c.quarter === activePhase)?.comment || ''}
                              className="flex-1 bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2D1E18]"
                            />
                            <button
                              onClick={() => {
                                const com = (document.getElementById(`comment-${goal.id}`) as HTMLInputElement)?.value;
                                handleManagerComment(goal.id, com, activePhase);
                              }}
                              className="px-4 py-2 bg-white text-[#2D1E18] border border-[#E8E5DD] hover:bg-[#FAF8F5] rounded-xl text-xs font-semibold transition"
                            >
                              Sign Off
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            {/* DRAFT SHEET ACTIONS (SUBMIT FORM FOR EMPLOYEE) */}
            {activeUser?.role === 'EMPLOYEE' && goals.length > 0 && goals.every(g => g.status === 'DRAFT' || g.status === 'REJECTED') && (
              <div className="mt-6 pt-5 border-t border-[#E8E5DD] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E5DD]">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#2C221E]">Submit Goal Sheet for Manager Approval</h4>
                  <p className="text-[11px] text-[#7A6F6A] max-w-lg">
                    Once submitted, your manager will review your targets. Submissions require exactly 100% total weightage and a minimum of 10% per goal.
                  </p>
                </div>

                <button
                  onClick={handleSubmitGoals}
                  disabled={totalWeightageSum !== 100}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                    totalWeightageSum === 100
                      ? 'bg-[#2D1E18] text-white hover:bg-[#3D2B24] border border-[#2D1E18]'
                      : 'bg-white text-slate-400 border border-[#E8E5DD] cursor-not-allowed'
                  }`}
                >
                  Submit Goal Sheet
                </button>
              </div>
            )}

            {/* MANAGER ACTION PANEL: PENDING APPROVAL QUEUE */}
            {activeUser?.role === 'MANAGER' && selectedReportId && goals.length > 0 && goals.some(g => g.status === 'SUBMITTED') && (
              <div className="mt-6 pt-5 border-t border-[#E8E5DD] flex flex-col gap-4 bg-[#FAF8F5] p-5 rounded-2xl border border-[#E8E5DD]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#8C7569]" />
                  <h4 className="text-xs font-bold text-[#2C221E]">Pending Approval Workflow</h4>
                </div>
                <p className="text-[11px] text-[#7A6F6A] leading-relaxed">
                  You are reviewing this employee's goals. You can adjust the weightages directly using the inline adjustment dials, or write feedback.
                </p>

                <div className="flex flex-col md:flex-row items-end gap-3 mt-1.5">
                  <div className="flex-1 w-full">
                    <label className="block text-[9px] uppercase font-mono text-[#7A6F6A] mb-1.5">Inline Adjustments Feedback / Rejection Notes:</label>
                    <input
                      type="text"
                      id="rejection-feedback"
                      placeholder="Write feedback remarks or corrections if rejecting..."
                      className="w-full bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2D1E18]"
                    />
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={() => handleApproveGoals(selectedReportId)}
                      className="flex-1 md:flex-none px-5 py-2.5 bg-[#2D1E18] text-white hover:bg-[#3D2B24] border border-[#2D1E18] rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
                    >
                      Approve & Lock Sheet
                    </button>
                    <button
                      onClick={() => {
                        const feedback = (document.getElementById('rejection-feedback') as HTMLInputElement)?.value;
                        handleRejectGoals(selectedReportId, feedback);
                      }}
                      className="flex-1 md:flex-none px-5 py-2.5 bg-white text-[#2D1E18] border border-[#E8E5DD] hover:bg-[#FAF8F5] rounded-xl text-xs font-bold transition active:scale-95"
                    >
                      Reject with Feedback
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ADMIN LOCKED OVERRIDE UNLOCK */}
            {activeUser?.role === 'ADMIN' && selectedReportId && goals.length > 0 && goals.every(g => g.status === 'LOCKED') && (
              <div className="mt-6 pt-5 border-t border-[#E8E5DD] flex items-center justify-between gap-4 bg-[#FAF8F5] p-4 rounded-2xl border border-[#E8E5DD]">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#2C221E] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#8C7569]" />
                    Administrative Override Lock Active
                  </h4>
                  <p className="text-[11px] text-[#7A6F6A]">
                    This employee sheet is locked. Administrators can unlock this sheet to reset it to draft for edits.
                  </p>
                </div>

                <button
                  onClick={() => setShowUnlockModalFor(selectedReportId)}
                  className="px-4 py-2 bg-white text-[#2D1E18] hover:bg-[#FAF8F5] border border-[#E8E5DD] text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5 text-[#8C7569]" />
                  Unlock Sheet
                </button>
              </div>
            )}

          </div>

          {/* DYNAMIC GOAL CREATION FORM (VISIBLE TO EMPLOYEE IN GOAL SETTING WINDOW) */}
          {activeUser?.role === 'EMPLOYEE' && activePhase === 'GOAL_SETTING' && goals.every(g => g.status === 'DRAFT' || g.status === 'REJECTED') && (
            <div className="glass-panel rounded-2xl p-6 border border-[#E8E5DD] bg-white">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-4 h-4 text-[#8C7569]" />
                <h3 className="font-display font-bold text-sm text-[#2C221E] uppercase tracking-wider">
                  Create Draft Goal
                </h3>
              </div>

              <form onSubmit={handleCreateGoal} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[9px] uppercase font-mono text-[#7A6F6A] mb-1.5">Goal Title *</label>
                  <input
                    type="text"
                    required
                    value={newGoalForm.title}
                    onChange={(e) => setNewGoalForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Optimize API Database Queries"
                    className="w-full bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2D1E18]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-mono text-[#7A6F6A] mb-1.5">Thrust Area</label>
                  <select
                    value={newGoalForm.thrustArea}
                    onChange={(e) => setNewGoalForm(prev => ({ ...prev, thrustArea: e.target.value }))}
                    className="w-full bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3 py-2 rounded-xl focus:outline-none"
                  >
                    <option>Operations</option>
                    <option>IT</option>
                    <option>Sales</option>
                    <option>HR</option>
                    <option>Finance</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[9px] uppercase font-mono text-[#7A6F6A] mb-1.5">Description *</label>
                  <textarea
                    required
                    rows={2}
                    value={newGoalForm.description}
                    onChange={(e) => setNewGoalForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed explanation of objectives, deliverables, and expectations..."
                    className="w-full bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2D1E18]"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-mono text-[#7A6F6A] mb-1.5">UoM Strategy Type</label>
                  <select
                    value={newGoalForm.uomType}
                    onChange={(e) => setNewGoalForm(prev => ({ ...prev, uomType: e.target.value }))}
                    className="w-full bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3 py-2 rounded-xl focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (Min)</option>
                    <option value="NUMERIC_MIN">Numeric Min (Higher Better)</option>
                    <option value="NUMERIC_MAX">Numeric Max (Lower Better)</option>
                    <option value="ZERO">Zero-Based (Zero Success)</option>
                    <option value="TIMELINE">Timeline (Date Bound)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-mono text-[#7A6F6A] mb-1.5">Target Value *</label>
                  <input
                    type="number"
                    required={newGoalForm.uomType !== 'TIMELINE'}
                    disabled={newGoalForm.uomType === 'TIMELINE'}
                    value={newGoalForm.uomType === 'TIMELINE' ? '' : newGoalForm.targetValue}
                    onChange={(e) => setNewGoalForm(prev => ({ ...prev, targetValue: e.target.value }))}
                    placeholder="e.g. 100 or 1500"
                    className="w-full bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2D1E18] disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-mono text-[#7A6F6A] mb-1.5">Target/Deadline Date</label>
                  <input
                    type="date"
                    required={newGoalForm.uomType === 'TIMELINE'}
                    value={newGoalForm.targetDate}
                    onChange={(e) => setNewGoalForm(prev => ({ ...prev, targetDate: e.target.value }))}
                    className="w-full bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2D1E18]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[9px] uppercase font-mono text-[#7A6F6A] mb-1.5">Individual Weightage (%) *</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={newGoalForm.weightage}
                    onChange={(e) => setNewGoalForm(prev => ({ ...prev, weightage: e.target.value }))}
                    className="w-full mt-2 accent-[#2D1E18] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#7A6F6A] font-mono mt-1">
                    <span>10% min</span>
                    <span className="text-[#8C7569] font-bold">{newGoalForm.weightage}% selected</span>
                    <span>100% max</span>
                  </div>
                </div>

                <div className="md:col-span-1 flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#2D1E18] hover:bg-[#3D2B24] text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    Add Goal to Sheet
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ANALYTICS CHARTS SECTION */}
          {goals.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Pie chart for Thrust Area Distributions */}
              <div className="glass-panel rounded-2xl p-5 border border-[#E8E5DD] bg-white flex flex-col justify-between min-h-[300px]">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <PieIcon className="w-4 h-4 text-[#8C7569]" />
                    <h4 className="font-display font-semibold text-xs text-[#2C221E] uppercase tracking-wider">
                      Thrust Areas Weightage Balance
                    </h4>
                  </div>
                  
                  <div className="w-full h-44 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartThrustAreas}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartThrustAreas.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* legend list */}
                <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-3 border-t border-[#F2EFE8]">
                  {chartThrustAreas.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span className="text-[#7A6F6A] truncate">{item.name}: {item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar Chart for Goal Status Metrics */}
              <div className="glass-panel rounded-2xl p-5 border border-[#E8E5DD] bg-white flex flex-col justify-between min-h-[300px]">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 className="w-4 h-4 text-[#8C7569]" />
                    <h4 className="font-display font-semibold text-xs text-[#2C221E] uppercase tracking-wider">
                      Sheet Status Metrics
                    </h4>
                  </div>

                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartStatusRates} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <XAxis dataKey="name" stroke="#7A6F6A" fontSize={9} />
                        <YAxis stroke="#7A6F6A" fontSize={9} />
                        <ChartTooltip cursor={{ fill: 'rgba(44,30,26,0.02)' }} />
                        <Bar dataKey="count" fill="#2D1E18" radius={[4, 4, 0, 0]}>
                          {chartStatusRates.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === 'LOCKED' ? '#5F7161' : entry.name === 'SUBMITTED' ? '#8C7569' : '#2D1E18'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Line Chart for QoQ Achievement Trends */}
              <div className="glass-panel rounded-2xl p-5 border border-[#E8E5DD] bg-white flex flex-col justify-between min-h-[300px]">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-[#5F7161]" />
                    <h4 className="font-display font-semibold text-xs text-[#2C221E] uppercase tracking-wider">
                      QoQ Progress Averages
                    </h4>
                  </div>

                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartQoQProgress} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <XAxis dataKey="quarter" stroke="#7A6F6A" fontSize={9} />
                        <YAxis stroke="#7A6F6A" fontSize={9} />
                        <ChartTooltip />
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,30,26,0.05)" />
                        <Line type="monotone" dataKey="Score" stroke="#5F7161" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ADMIN ONLY: SYSTEM AUDIT LOGGER (VISIBLE TO ADMINS) */}
          {activeUser?.role === 'ADMIN' && auditLogs.length > 0 && (
            <div className="glass-panel rounded-2xl p-5 border border-[#E8E5DD] bg-white">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-[#8C7569]" />
                <h4 className="font-display font-bold text-sm text-[#2C221E] uppercase tracking-wider">
                  Governance Audit Trail (Admin Console)
                </h4>
              </div>

              <div className="w-full overflow-x-auto rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] max-h-[350px] overflow-y-auto">
                <table className="w-full text-xs text-left text-[#7A6F6A] border-collapse">
                  <thead className="text-[10px] uppercase font-mono bg-[#E8E5DD]/30 text-[#7A6F6A] border-b border-[#E8E5DD]">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Override Reason / Details</th>
                      <th className="px-4 py-3 text-right">State Path</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E5DD]/40">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FCFAF7] transition">
                        <td className="px-4 py-3 font-mono text-[10px] text-[#7A6F6A]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#2C221E]">
                          {log.user.name} <span className="text-[9px] font-mono text-[#8C7569]">({log.user.role})</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'UNLOCK' 
                              ? 'bg-rose-50 text-rose-800 border border-rose-200/35'
                              : log.action === 'APPROVE'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/35'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-[#7A6F6A]">
                          {log.reason || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[10px] text-[#8C7569]">
                          {log.oldValue && log.newValue ? `${log.oldValue} -> ${log.newValue}` : 'State change complete'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </main>

      {/* 3. FLOATING MODALS AND OVERLAYS */}

      {/* OVERLAY A: DYNAMIC QUARTERLY ACHIEVEMENT LOGGER DRAWER */}
      {selectedGoalForAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D1E18]/45 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel max-w-md w-full rounded-3xl p-6 border border-[#E8E5DD] bg-white shadow-2xl relative animate-scaleIn">
            <button
              onClick={() => setSelectedGoalForAchievement(null)}
              className="absolute top-4 right-4 p-1 hover:bg-[#FAF8F5] rounded-xl transition text-[#7A6F6A] hover:text-[#2C221E]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-[#8C7569]" />
              <h3 className="font-display font-bold text-base text-[#2C221E]">
                Log {activePhase} Performance
              </h3>
            </div>

            <div className="mb-4 pb-4 border-b border-[#F2EFE8] text-xs">
              <h4 className="font-semibold text-[#2C221E] mb-1">{selectedGoalForAchievement.title}</h4>
              <p className="text-[#7A6F6A]">Strategy: <strong className="text-[#2C221E]">{selectedGoalForAchievement.uomType}</strong></p>
              {selectedGoalForAchievement.targetValue !== null && (
                <p className="text-[#7A6F6A]">Target Value: <strong className="text-[#2C221E]">{selectedGoalForAchievement.targetValue}</strong></p>
              )}
            </div>

            <form onSubmit={handleLogAchievement} className="space-y-4">
              {selectedGoalForAchievement.uomType !== 'TIMELINE' ? (
                <div>
                  <label className="block text-[9px] uppercase font-mono text-[#7A6F6A] mb-1.5">Actual Value Achieved *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={achievementForm.actualValue}
                    onChange={(e) => setAchievementForm(prev => ({ ...prev, actualValue: e.target.value }))}
                    placeholder="Enter recorded figures..."
                    className="w-full bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2D1E18]"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[9px] uppercase font-mono text-[#7A6F6A] mb-1.5">Actual Date Completed *</label>
                  <input
                    type="date"
                    required
                    value={achievementForm.actualDate}
                    onChange={(e) => setAchievementForm(prev => ({ ...prev, actualDate: e.target.value }))}
                    className="w-full bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[9px] uppercase font-mono text-[#7A6F6A] mb-1.5">Quarterly check-in notes & evidence</label>
                <textarea
                  rows={3}
                  value={achievementForm.notes}
                  onChange={(e) => setAchievementForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Provide supporting text, results links, or highlights..."
                  className="w-full bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2D1E18]"
                />
              </div>

              {/* Real-time Math Score display */}
              <div className="p-3 bg-[#FAF8F5] border border-[#E8E5DD] rounded-2xl flex justify-between items-center text-xs">
                <span className="text-[#7A6F6A]">Calculated score progress:</span>
                <strong className="text-sm font-bold text-[#8C7569] font-mono">
                  {/* Quick preview calculation */}
                  {selectedGoalForAchievement.uomType === 'ZERO' 
                    ? (parseFloat(achievementForm.actualValue) === 0 ? '100%' : '0%')
                    : selectedGoalForAchievement.uomType === 'TIMELINE'
                    ? (achievementForm.actualDate && selectedGoalForAchievement.targetDate && new Date(achievementForm.actualDate).getTime() <= new Date(selectedGoalForAchievement.targetDate).getTime() ? '100%' : '0%')
                    : (achievementForm.actualValue && selectedGoalForAchievement.targetValue 
                      ? `${Math.max(0, Math.round((selectedGoalForAchievement.uomType === 'NUMERIC_MAX' 
                        ? (selectedGoalForAchievement.targetValue / parseFloat(achievementForm.actualValue)) 
                        : (parseFloat(achievementForm.actualValue) / selectedGoalForAchievement.targetValue)) * 10000) / 100)}%`
                      : '0%')}
                </strong>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2D1E18] hover:bg-[#3D2B24] text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  Log quarterly results
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGoalForAchievement(null)}
                  className="px-4 py-2.5 bg-white border border-[#E8E5DD] text-[#2C221E] rounded-xl text-xs font-semibold hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OVERLAY B: ADMIN UNLOCK OVERRIDE REASON DIALOG */}
      {showUnlockModalFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D1E18]/45 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel max-w-md w-full rounded-3xl p-6 border border-[#E8E5DD] bg-white shadow-2xl relative">
            <button
              onClick={() => setShowUnlockModalFor(null)}
              className="absolute top-4 right-4 p-1 hover:bg-[#FAF8F5] rounded-xl transition text-[#7A6F6A] hover:text-[#2C221E]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Unlock className="w-5 h-5 text-rose-600" />
              <h3 className="font-display font-bold text-base text-[#2C221E]">
                Unlock Goal Sheet Override
              </h3>
            </div>

            <p className="text-xs text-[#7A6F6A] mb-4 leading-relaxed">
              Unlocking the sheet allows the employee to modify their goals and balances. A mandatory audit log reason must be specified for security compliance:
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] uppercase font-mono text-[#7A6F6A] mb-1.5">Override Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={overrideUnlockReason}
                  onChange={(e) => setOverrideUnlockReason(e.target.value)}
                  placeholder="e.g. Employee requested weightage adjustment due to project cancellation approved by VP."
                  className="w-full bg-white border border-[#E8E5DD] text-[#2C221E] text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAdminUnlock}
                  disabled={!overrideUnlockReason}
                  className="flex-1 py-2.5 bg-[#2D1E18] hover:bg-[#3D2B24] text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Unlock Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnlockModalFor(null)}
                  className="px-4 py-2.5 bg-white border border-[#E8E5DD] text-[#2C221E] rounded-xl text-xs font-semibold hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="py-6 px-6 border-t border-[#E8E5DD] bg-white text-center text-xs text-[#7A6F6A] font-mono">
        ATOMQUEST HACKATHON CORE BUILD // SYSTEM RUNNING IN LOCAL DEV SQLITE PERSISTENT ENVIRONMENT
      </footer>

    </div>
  );
}
