import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Shield, ShieldCheck, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { projectsApi } from '@/api/queries/projects';
import { usersApi } from '@/api/queries/users';
import { useAuthStore } from '@/stores/auth.store';
import { ProjectRole } from '@/types';
import type { Project } from '@/types';

interface MembersSectionProps {
  project: Project;
}

const roleIcons: Record<ProjectRole, React.ReactNode> = {
  ADMIN: <ShieldCheck className="h-3 w-3" />,
  MEMBER: <Shield className="h-3 w-3" />,
  VIEWER: <Eye className="h-3 w-3" />,
};

const roleLabels: Record<ProjectRole, string> = {
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

export function MembersSection({ project }: MembersSectionProps) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>(ProjectRole.MEMBER);

  const currentMember = project.members.find((m) => m.userId === currentUser?.id);
  const isAdmin = currentMember?.role === 'ADMIN';

  const { data: usersResponse } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  const allUsers = usersResponse?.data || [];
  const memberUserIds = project.members.map((m) => m.userId);
  const availableUsers = allUsers.filter(
    (u) => !memberUserIds.includes(u.id) && u.name.toLowerCase().includes(search.toLowerCase())
  );

  const addMemberMutation = useMutation({
    mutationFn: () =>
      projectsApi.addMember(project.id, {
        userId: selectedUserId,
        role: selectedRole,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      setAddOpen(false);
      setSelectedUserId('');
      setSearch('');
      setSelectedRole('MEMBER');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      projectsApi.removeMember(project.id, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: ProjectRole }) =>
      projectsApi.updateMemberRole(project.id, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Members</CardTitle>
        {isAdmin && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {project.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {member.user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{member.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && member.userId !== currentUser?.id ? (
                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      updateRoleMutation.mutate({
                        memberId: member.userId,
                        role: value as ProjectRole,
                      })
                    }
                  >
                    <SelectTrigger className="w-[110px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    {roleIcons[member.role]}
                    {roleLabels[member.role]}
                  </Badge>
                )}
                {isAdmin && member.userId !== currentUser?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeMemberMutation.mutate(member.userId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Search for a user and add them to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-user">Search Users</Label>
              <Input
                id="search-user"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {search && (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-1">
                {availableUsers.length === 0 ? (
                  <p className="p-2 text-sm text-muted-foreground">
                    No users found
                  </p>
                ) : (
                  availableUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className={`flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent ${
                        selectedUserId === user.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setSearch(user.name);
                      }}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {user.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as ProjectRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedUserId || addMemberMutation.isPending}
              onClick={() => addMemberMutation.mutate()}
            >
              {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
