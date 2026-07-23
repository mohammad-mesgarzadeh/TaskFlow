import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, LayoutGrid, List, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { projectsApi } from '@/api/queries/projects';
import { tasksApi } from '@/api/queries/tasks';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import { MembersSection } from './components/MembersSection';
import { KanbanBoard } from './components/KanbanBoard';
import { SprintBoard } from './components/SprintBoard';
import { CreateTaskModal } from './components/CreateTaskModal';
import { EditTaskModal } from './components/EditTaskModal';
import { DeleteTaskDialog } from './components/DeleteTaskDialog';
import { TaskDetailModal } from './components/TaskDetailModal';
import { TaskStatus, type Task } from '@/types';

export function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [defaultTaskStatus, setDefaultTaskStatus] = useState<TaskStatus>('TODO');
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const { data: projectResponse, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(id!),
    enabled: !!id,
  });

  const { data: tasksResponse, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => tasksApi.getAll(id!),
    enabled: !!id,
  });

  if (projectLoading || tasksLoading) return <PageLoader />;

  if (!projectResponse?.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold">Project not found</h2>
        <Link to="/projects">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const project = projectResponse.data;
  const tasks = tasksResponse?.data || [];

  const handleCreateTask = (status: TaskStatus) => {
    setDefaultTaskStatus(status);
    setCreateTaskOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <Badge variant="secondary">{project.key}</Badge>
          </div>
          <p className="text-muted-foreground">
            {project.description || 'No description'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Board
          </TabsTrigger>
          <TabsTrigger value="sprints" className="gap-2">
            <Rocket className="h-4 w-4" />
            Sprints
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-2">
            <List className="h-4 w-4" />
            Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4">
          <KanbanBoard
            tasks={tasks}
            projectId={project.id}
            onCreateTask={handleCreateTask}
            onEditTask={(task) => setEditTask(task)}
            onDeleteTask={(task) => setDeleteTask(task)}
          />
        </TabsContent>

        <TabsContent value="sprints" className="mt-4">
          <SprintBoard
            projectId={project.id}
            tasks={tasks}
            onEditTask={(task) => setEditTask(task)}
            onDeleteTask={(task) => setDeleteTask(task)}
          />
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Project Details</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Owner</span>
                    <span className="font-medium">{project.owner.name}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-medium">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Tasks</span>
                    <span className="font-medium">{tasks.length}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-medium">{project.members.length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <MembersSection project={project} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CreateTaskModal
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        projectId={project.id}
        defaultStatus={defaultTaskStatus}
      />

      <EditTaskModal
        open={!!editTask}
        onOpenChange={(open) => !open && setEditTask(null)}
        task={editTask}
        projectId={project.id}
      />

      <DeleteTaskDialog
        open={!!deleteTask}
        onOpenChange={(open) => !open && setDeleteTask(null)}
        task={deleteTask}
        projectId={project.id}
      />

      <TaskDetailModal
        open={!!detailTaskId}
        onOpenChange={(open) => !open && setDetailTaskId(null)}
        taskId={detailTaskId}
        projectId={project.id}
        onEdit={(task) => setEditTask(task)}
        onDelete={(task) => setDeleteTask(task)}
      />
    </div>
  );
}
