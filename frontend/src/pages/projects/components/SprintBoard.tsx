import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Calendar, Target, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { sprintsApi } from '@/api/queries/sprints';
import { KanbanBoard } from './KanbanBoard';
import { CreateSprintModal } from './CreateSprintModal';
import type { Task, TaskStatus } from '@/types';

interface SprintBoardProps {
  projectId: string;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

export function SprintBoard({ projectId, tasks, onEditTask, onDeleteTask }: SprintBoardProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: sprintsResponse } = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => sprintsApi.getAll(projectId),
  });

  const sprints = sprintsResponse?.data || [];
  const activeSprint = sprints.find((s) => s.isActive);
  const displaySprint = selectedSprintId ? sprints.find((s) => s.id === selectedSprintId) : activeSprint;
  const sprintTasks = displaySprint ? tasks.filter((t) => t.sprintId === displaySprint.id) : [];
  const backlogTasks = tasks.filter((t) => !t.sprintId);

  const activateMutation = useMutation({
    mutationFn: (sprintId: string) => sprintsApi.activate(projectId, sprintId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sprints', projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (sprintId: string) => sprintsApi.delete(projectId, sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      if (selectedSprintId) setSelectedSprintId(null);
    },
  });

  const handleCreateTask = (_status: TaskStatus) => {
    // Handled by parent via KanbanBoard
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Sprints</h3>
          {activeSprint && (
            <Badge variant="default" className="gap-1">
              <Play className="h-3 w-3" />
              Active
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Sprint
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {sprints.map((sprint) => (
          <Button
            key={sprint.id}
            variant={selectedSprintId === sprint.id ? 'default' : 'outline'}
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => setSelectedSprintId(sprint.id === selectedSprintId ? null : sprint.id)}
          >
            {sprint.isActive && <Play className="h-3 w-3 text-green-500" />}
            {sprint.name}
            <Badge variant="secondary" className="ml-1 text-xs">
              {sprint._count?.tasks || 0}
            </Badge>
          </Button>
        ))}
      </div>

      {displaySprint ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{displaySprint.name}</CardTitle>
                {displaySprint.goal && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {displaySprint.goal}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {displaySprint.startDate && displaySprint.endDate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(displaySprint.startDate).toLocaleDateString()} - {new Date(displaySprint.endDate).toLocaleDateString()}
                  </span>
                )}
                {!displaySprint.isActive && (
                  <Button size="sm" variant="outline" onClick={() => activateMutation.mutate(displaySprint.id)}>
                    <Play className="h-3 w-3 mr-1" />
                    Start
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => deleteMutation.mutate(displaySprint.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Sprint
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {sprintTasks.length > 0 ? (
              <KanbanBoard
                tasks={sprintTasks}
                projectId={projectId}
                onCreateTask={handleCreateTask}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No tasks in this sprint.</p>
                <p className="text-sm mt-1">Assign tasks from the backlog or create new ones.</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backlog</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {backlogTasks.length > 0 ? (
              <KanbanBoard
                tasks={backlogTasks}
                projectId={projectId}
                onCreateTask={handleCreateTask}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No tasks in backlog.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <CreateSprintModal open={createOpen} onOpenChange={setCreateOpen} projectId={projectId} />
    </div>
  );
}
