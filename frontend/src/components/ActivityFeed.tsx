import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ActivityAction, type Activity } from '@/types';

type ActivityWithTask = Activity & { task: { id: string; title: string } | null };

const actionLabels: Record<ActivityAction, string> = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  STATUS_CHANGED: 'changed status on',
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',
  LABEL_ADDED: 'added label to',
  LABEL_REMOVED: 'removed label from',
  COMMENT_ADDED: 'commented on',
  PRIORITY_CHANGED: 'changed priority on',
  SPRINT_CREATED: 'created sprint',
  SPRINT_UPDATED: 'updated sprint',
  SPRINT_TASK_ADDED: 'added task to sprint',
  SPRINT_TASK_REMOVED: 'removed task from sprint',
};

interface ActivityFeedProps {
  activities: ActivityWithTask[];
  title?: string;
  maxItems?: number;
}

export function ActivityFeed({ activities, title = 'Recent Activity', maxItems = 10 }: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  if (displayActivities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivities.map((activity) => {
            const initials = activity.user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div key={activity.id} className="flex items-start gap-3">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user.name}</span>{' '}
                    <span className="text-muted-foreground">
                      {actionLabels[activity.action] || activity.action}
                    </span>
                    {activity.task && (
                      <> <span className="font-medium">{activity.task.title}</span></>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
