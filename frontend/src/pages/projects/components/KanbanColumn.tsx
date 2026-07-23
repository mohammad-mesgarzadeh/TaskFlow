import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  children: ReactNode;
  onCreateTask: () => void;
}

export function KanbanColumn({ id, title, color, count, children, onCreateTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 min-w-72 flex-col rounded-lg bg-muted/50 p-2 transition-colors',
        isOver && 'bg-primary/5 ring-2 ring-primary/20'
      )}
    >
      <div className="mb-2 flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            {count}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCreateTask}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {children}
      </div>
    </div>
  );
}
