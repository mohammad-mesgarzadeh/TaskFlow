import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { activitiesApi } from '@/api/queries/activities';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ActivityAction } from '@/types';

const actionLabels: Record<ActivityAction, string> = {
  CREATED: 'created this task',
  UPDATED: 'updated this task',
  DELETED: 'deleted this task',
  STATUS_CHANGED: 'changed status',
  ASSIGNED: 'assigned this task',
  UNASSIGNED: 'unassigned this task',
  LABEL_ADDED: 'added a label',
  LABEL_REMOVED: 'removed a label',
  COMMENT_ADDED: 'added a comment',
  PRIORITY_CHANGED: 'changed priority',
  SPRINT_CREATED: 'created a sprint',
  SPRINT_UPDATED: 'updated a sprint',
  SPRINT_TASK_ADDED: 'added task to sprint',
  SPRINT_TASK_REMOVED: 'removed task from sprint',
};

const statusLabels: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

const priorityLabels: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

function formatMetadata(action: ActivityAction, metadata: Record<string, unknown> | null): string {
  if (!metadata) return '';

  if (action === 'STATUS_CHANGED') {
    const from = statusLabels[metadata.from as string] || metadata.from;
    const to = statusLabels[metadata.to as string] || metadata.to;
    return `from "${from}" to "${to}"`;
  }

  if (action === 'PRIORITY_CHANGED') {
    const from = priorityLabels[metadata.from as string] || metadata.from;
    const to = priorityLabels[metadata.to as string] || metadata.to;
    return `from "${from}" to "${to}"`;
  }

  if (action === 'ASSIGNED' && metadata.assigneeId) {
    return `to user`;
  }

  if (action === 'COMMENT_ADDED' && metadata.content) {
    return `: "${String(metadata.content).substring(0, 50)}${String(metadata.content).length > 50 ? '...' : ''}"`;
  }

  return '';
}

interface ActivityTimelineProps {
  taskId: string;
}

export function ActivityTimeline({ taskId }: ActivityTimelineProps) {
  const { data: activitiesResponse } = useQuery({
    queryKey: ['activities', taskId],
    queryFn: () => activitiesApi.getByTask(taskId),
    enabled: !!taskId,
  });

  const activities = activitiesResponse?.data || [];

  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Activity</h4>
      <div className="relative space-y-3 pl-6">
        <div className="absolute left-2.5 top-0 bottom-0 w-px bg-border" />
        {activities.map((activity) => (
          <div key={activity.id} className="relative">
            <div className="absolute -left-[14px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground/30" />
            <div className="flex items-start gap-2">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarFallback className="text-[8px]">
                  {activity.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs">
                  <span className="font-medium">{activity.user.name}</span>{' '}
                  <span className="text-muted-foreground">
                    {actionLabels[activity.action] || activity.action}
                  </span>{' '}
                  {formatMetadata(activity.action, activity.metadata)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
