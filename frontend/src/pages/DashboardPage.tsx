import { useQuery } from '@tanstack/react-query';
import { FolderKanban, CheckCircle2, Clock, AlertTriangle, ListTodo, Target } from 'lucide-react';
import { dashboardApi } from '@/api/queries/dashboard';
import { useAuthStore } from '@/stores/auth.store';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import { StatCard } from '@/components/StatCard';
import { DashboardCharts } from '@/components/DashboardCharts';
import { ActivityFeed } from '@/components/ActivityFeed';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: statsResponse, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
  });

  if (isLoading) return <PageLoader />;

  const stats = statsResponse?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your projects and tasks.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Projects"
          value={stats?.totalProjects || 0}
          icon={FolderKanban}
          description="Projects you're a member of"
        />
        <StatCard
          title="Total Tasks"
          value={stats?.totalTasks || 0}
          icon={ListTodo}
          description="Across all projects"
        />
        <StatCard
          title="Completed"
          value={stats?.completedTasks || 0}
          icon={CheckCircle2}
          description={stats?.totalTasks ? `${Math.round(((stats?.completedTasks || 0) / stats.totalTasks) * 100)}% completion rate` : 'No tasks yet'}
        />
        <StatCard
          title="Overdue"
          value={stats?.overdueTasks || 0}
          icon={AlertTriangle}
          description="Tasks past due date"
          className={stats?.overdueTasks ? 'border-destructive/50' : undefined}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="To Do"
          value={stats?.tasksByStatus?.TODO || 0}
          icon={Clock}
          description="Tasks to start"
        />
        <StatCard
          title="In Progress"
          value={stats?.tasksByStatus?.IN_PROGRESS || 0}
          icon={Target}
          description="Currently working on"
        />
        <StatCard
          title="In Review"
          value={stats?.tasksByStatus?.IN_REVIEW || 0}
          icon={ListTodo}
          description="Awaiting review"
        />
        <StatCard
          title="My Tasks"
          value={stats?.myAssignedTasks || 0}
          icon={Target}
          description="Assigned to you"
        />
      </div>

      <DashboardCharts
        tasksByStatus={stats?.tasksByStatus || { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 }}
        tasksByPriority={stats?.tasksByPriority || { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 }}
        tasksByType={stats?.tasksByType || { BUG: 0, FEATURE: 0, TASK: 0, STORY: 0 }}
      />

      <ActivityFeed
        activities={stats?.recentActivities || []}
        title="Recent Activity"
        maxItems={15}
      />
    </div>
  );
}
