import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TaskPriority, TaskType, type Task } from '@/types';

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  MEDIUM: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  HIGH: { label: 'High', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  URGENT: { label: 'Urgent', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const typeConfig: Record<TaskType, { label: string; className: string }> = {
  BUG: { label: 'Bug', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  FEATURE: { label: 'Feature', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  TASK: { label: 'Task', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  STORY: { label: 'Story', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

interface KanbanCardProps {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
}

export function KanbanCard({ task, onEdit }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = priorityConfig[task.priority];
  const type = typeConfig[task.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-pointer rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-50 shadow-lg'
      )}
      onClick={onEdit}
      {...attributes}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-1 text-muted-foreground" {...listeners}>
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        <div className="flex gap-1">
          <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', type.className)}>
            {type.label}
          </Badge>
          <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', priority.className)}>
            {priority.label}
          </Badge>
        </div>
      </div>

      <p className="mb-2 text-sm font-medium line-clamp-2">{task.title}</p>

      {task.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.labels.map((tl) => (
            <span
              key={tl.labelId}
              className="h-1.5 w-8 rounded-full"
              style={{ backgroundColor: tl.label.color }}
              title={tl.label.name}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span className={cn(
              'flex items-center gap-1',
              new Date(task.dueDate) < new Date() && task.status !== 'DONE' && 'text-destructive'
            )}>
              <Calendar className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          {task._count && task._count.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {task._count.comments}
            </span>
          )}
        </div>

        {task.assignee && (
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[8px]">
              {task.assignee.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
