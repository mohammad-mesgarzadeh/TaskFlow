import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Trash2, Calendar } from 'lucide-react';
import { tasksApi } from '@/api/queries/tasks';
import { usersApi } from '@/api/queries/users';
import { TaskStatus, TaskPriority, type Task } from '@/types';
import { CommentsSection } from './CommentsSection';
import { ActivityTimeline } from './ActivityTimeline';

const statusLabels: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

const priorityLabels: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};



interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
  projectId: string;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskDetailModal({ open, onOpenChange, taskId, projectId, onEdit, onDelete }: TaskDetailModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');

  const { data: taskResponse } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.getById(projectId, taskId!),
    enabled: !!taskId && open,
  });

  const { data: usersResponse } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  const task = taskResponse?.data;
  const users = usersResponse?.data || [];

  const updateStatusMutation = useMutation({
    mutationFn: (status: TaskStatus) => tasksApi.update(projectId, taskId!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const updateAssigneeMutation = useMutation({
    mutationFn: (assigneeId: string) => tasksApi.update(projectId, taskId!, { assigneeId: assigneeId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <DialogTitle className="text-lg pr-8">{task.title}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{task.type}</Badge>
                <Badge variant="outline" className="text-xs">{statusLabels[task.status]}</Badge>
                <Badge variant="outline" className="text-xs">{priorityLabels[task.priority]}</Badge>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { onEdit(task); onOpenChange(false); }}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { onDelete(task); onOpenChange(false); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {task.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={task.status}
                onValueChange={(v) => updateStatusMutation.mutate(v as TaskStatus)}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Assignee</label>
              <Select
                value={task.assigneeId || 'none'}
                onValueChange={(v) => updateAssigneeMutation.mutate(v === 'none' ? '' : v)}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {task.labels.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Labels</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {task.labels.map((tl) => (
                  <Badge
                    key={tl.labelId}
                    variant="secondary"
                    className="text-xs"
                    style={{ backgroundColor: tl.label.color + '20', color: tl.label.color, borderColor: tl.label.color }}
                  >
                    {tl.label.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {task.dueDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Due: {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}

          <Separator />

          <div className="flex gap-2 border-b">
            <button
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'comments'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('comments')}
            >
              Comments
            </button>
            <button
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'activity'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('activity')}
            >
              Activity
            </button>
          </div>

          {activeTab === 'comments' && <CommentsSection taskId={task.id} />}
          {activeTab === 'activity' && <ActivityTimeline taskId={task.id} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
