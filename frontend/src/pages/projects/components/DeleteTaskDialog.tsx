import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { tasksApi } from '@/api/queries/tasks';
import type { Task } from '@/types';

interface DeleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  projectId: string;
}

export function DeleteTaskDialog({ open, onOpenChange, task, projectId }: DeleteTaskDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(projectId, task!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      onOpenChange(false);
    },
  });

  if (!task) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Task"
      description={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="destructive"
      onConfirm={() => deleteMutation.mutate()}
      loading={deleteMutation.isPending}
    />
  );
}
