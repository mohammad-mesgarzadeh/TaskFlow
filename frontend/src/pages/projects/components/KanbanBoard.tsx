import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, type ApiResponse } from '@/api/queries/tasks';
import { TaskStatus, type Task } from '@/types';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';

interface KanbanBoardProps {
  tasks: Task[];
  projectId: string;
  onCreateTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

const columns: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'TODO', title: 'To Do', color: '#6b7280' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: '#3b82f6' },
  { id: 'IN_REVIEW', title: 'In Review', color: '#f59e0b' },
  { id: 'DONE', title: 'Done', color: '#22c55e' },
];

export function KanbanBoard({ tasks, projectId, onCreateTask, onEditTask, onDeleteTask }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
    };
    tasks.forEach((task) => {
      grouped[task.status].push(task);
    });
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => a.order - b.order);
    });
    return grouped;
  }, [tasks]);

  const reorderMutation = useMutation({
    mutationFn: (reorderData: { taskId: string; status: TaskStatus; order: number }[]) =>
      tasksApi.bulkReorder(projectId, reorderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    const overColumn = columns.find((c) => c.id === overId);
    const overTask = tasks.find((t) => t.id === overId);

    if (overColumn && activeTask.status !== overColumn.id) {
      queryClient.setQueryData(['tasks', projectId], (old: ApiResponse<Task[]> | undefined) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((t) =>
            t.id === activeId ? { ...t, status: overColumn.id } : t
          ),
        };
      });
    } else if (overTask && activeTask.status !== overTask.status) {
      queryClient.setQueryData(['tasks', projectId], (old: ApiResponse<Task[]> | undefined) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((t) =>
            t.id === activeId ? { ...t, status: overTask.status } : t
          ),
        };
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    const overColumn = columns.find((c) => c.id === overId);
    const targetStatus = overColumn?.id || tasks.find((t) => t.id === overId)?.status || activeTask.status;

    const columnTasks = tasksByStatus[targetStatus].filter((t) => t.id !== activeId);
    const overIndex = columnTasks.findIndex((t) => t.id === overId);

    if (overColumn) {
      columnTasks.push(activeTask);
    } else if (overIndex >= 0) {
      columnTasks.splice(overIndex, 0, activeTask);
    } else {
      columnTasks.push(activeTask);
    }

    const reorderData = columnTasks.map((t, index) => ({
      taskId: t.id,
      status: targetStatus,
      order: index,
    }));

    const currentTasks = tasksByStatus[targetStatus];
    const isUnchanged =
      currentTasks.length === columnTasks.length &&
      currentTasks.every(
        (t, i) =>
          t.id === columnTasks[i].id &&
          t.status === columnTasks[i].status &&
          t.order === i
      );

    if (isUnchanged) return;

    queryClient.setQueryData(['tasks', projectId], (old: ApiResponse<Task[]> | undefined) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.map((t) => {
          const update = reorderData.find((r) => r.taskId === t.id);
          if (update) {
            return { ...t, status: update.status, order: update.order };
          }
          return t;
        }),
      };
    });

    reorderMutation.mutate(reorderData);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            count={tasksByStatus[column.id].length}
            onCreateTask={() => onCreateTask(column.id)}
          >
            <SortableContext
              items={tasksByStatus[column.id].map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {tasksByStatus[column.id].map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  onEdit={() => onEditTask(task)}
                  onDelete={() => onDeleteTask(task)}
                />
              ))}
            </SortableContext>
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 opacity-80">
            <KanbanCard task={activeTask} onEdit={() => {}} onDelete={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
