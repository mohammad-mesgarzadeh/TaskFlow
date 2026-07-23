import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { searchApi } from '@/api/queries/search';
import type { TaskWithProject } from '@/types';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<{
    status?: string;
    priority?: string;
    type?: string;
  }>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const hasFilters = Object.values(filters).some(Boolean);

  const { data: results } = useQuery({
    queryKey: ['search', query, filters],
    queryFn: () => searchApi.searchTasks({ q: query, ...filters }),
    enabled: query.length >= 2 || hasFilters,
    staleTime: 30000,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const tasks = results?.data || [];

  const handleTaskClick = (task: TaskWithProject) => {
    navigate(`/projects/${task.projectId}`);
    setIsOpen(false);
    setQuery('');
    setFilters({});
  };

  const toggleFilter = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key as keyof typeof prev] === value ? undefined : value,
    }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Search tasks...</span>
        <kbd className="pointer-events-none ml-4 rounded border bg-muted px-1.5 py-0.5 text-xs font-medium">
          {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl+'}K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[15vh]" onClick={() => setIsOpen(false)}>
      <div className="w-full max-w-lg rounded-lg border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center border-b px-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            className="border-0 focus-visible:ring-0 shadow-none"
          />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-1 p-2 border-b">
          <Button
            variant={filters.status ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => toggleFilter('status', 'TODO')}
          >
            To Do
          </Button>
          <Button
            variant={filters.status === 'IN_PROGRESS' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => toggleFilter('status', 'IN_PROGRESS')}
          >
            In Progress
          </Button>
          <Button
            variant={filters.priority === 'HIGH' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => toggleFilter('priority', 'HIGH')}
          >
            High Priority
          </Button>
          <Button
            variant={filters.type === 'BUG' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => toggleFilter('type', 'BUG')}
          >
            Bugs
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {tasks.length === 0 && query.length >= 2 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No tasks found
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Type to search across all projects
            </div>
          ) : (
            <div className="space-y-1">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className="w-full rounded-md p-2 text-left hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs shrink-0">{task.project.key}</Badge>
                    <span className="text-sm font-medium truncate">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">{task.status.replace('_', ' ')}</Badge>
                    <Badge variant="secondary" className="text-xs">{task.priority}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
