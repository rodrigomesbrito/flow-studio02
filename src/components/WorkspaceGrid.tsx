import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, LayoutGrid, Search, List, Grid3X3, MoreHorizontal, Pencil, Trash2, ExternalLink, FolderInput } from 'lucide-react';
import { WorkspaceItem } from '@/types/workspace';
import { useWorkspace } from '@/contexts/WorkspaceContext';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `Last edited ${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Last edited ${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last edited ${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `Last edited ${days} day${days > 1 ? 's' : ''} ago`;
}

interface WorkspaceGridProps {
  items: WorkspaceItem[];
  title: string;
  breadcrumbs?: { label: string; path: string }[];
}

export function WorkspaceGrid({ items, title, breadcrumbs }: WorkspaceGridProps) {
  const navigate = useNavigate();
  const { renameItem, deleteItem, getChildren } = useWorkspace();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpen = (item: WorkspaceItem) => {
    if (item.type === 'project') {
      navigate(`/project/${item.id}`);
    } else {
      navigate(`/canvas/${item.id}`);
    }
  };

  const startRename = (item: WorkspaceItem, e?: Event) => {
    e?.preventDefault();
    e?.stopPropagation();
    setRenamingId(item.id);
    setRenameValue(item.name);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      renameItem(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const renderContextActions = (item: WorkspaceItem) => (
    <>
      <ContextMenuItem onClick={() => handleOpen(item)}>
        <FolderOpen size={14} className="mr-2" /> Open
      </ContextMenuItem>
      <ContextMenuItem onClick={() => window.open(`${window.location.origin}/${item.type === 'project' ? 'project' : 'canvas'}/${item.id}`, '_blank')}>
        <ExternalLink size={14} className="mr-2" /> Open in a new tab
      </ContextMenuItem>
      <ContextMenuItem onClick={() => startRename(item)}>
        <Pencil size={14} className="mr-2" /> Rename
      </ContextMenuItem>
      <ContextMenuItem onClick={() => deleteItem(item.id)} className="text-destructive">
        <Trash2 size={14} className="mr-2" /> Delete
      </ContextMenuItem>
    </>
  );

  const renderDropdownActions = (item: WorkspaceItem) => (
    <>
      <DropdownMenuItem onClick={() => handleOpen(item)}>
        <FolderOpen size={14} className="mr-2" /> Open
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => window.open(`${window.location.origin}/${item.type === 'project' ? 'project' : 'canvas'}/${item.id}`, '_blank')}>
        <ExternalLink size={14} className="mr-2" /> Open in a new tab
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => startRename(item)}>
        <Pencil size={14} className="mr-2" /> Rename
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => deleteItem(item.id)} className="text-destructive">
        <Trash2 size={14} className="mr-2" /> Delete
      </DropdownMenuItem>
    </>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6">
        <span className="text-sm text-muted-foreground">Workspace</span>
      </header>

      <div className="flex-1 p-6">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm mb-4">
            {breadcrumbs.map((bc, i) => (
              <span key={bc.path} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted-foreground">›</span>}
                <button
                  onClick={() => navigate(bc.path)}
                  className={`transition-colors ${
                    i === breadcrumbs.length - 1
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {bc.label}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Title + controls */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-4 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-48"
              />
            </div>
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Grid3X3 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-32">
            <FolderOpen size={40} className="text-muted-foreground mb-4" strokeWidth={1} />
            <h2 className="text-foreground font-medium mb-1">This folder is empty</h2>
            <p className="text-muted-foreground text-sm">Create new files or move files here from other folders</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(item => (
              <ContextMenu key={item.id}>
                <ContextMenuTrigger>
                  <div
                    onClick={() => { if (renamingId === item.id) return; handleOpen(item); }}
                    className="group relative rounded-xl border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[4/3] flex items-center justify-center rounded-t-xl bg-secondary/50">
                      {item.type === 'canvas' ? (
                        <LayoutGrid size={28} className="text-muted-foreground" strokeWidth={1} />
                      ) : (
                        <FolderOpen size={28} className="text-muted-foreground" strokeWidth={1} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {renamingId === item.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename();
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-transparent text-sm text-foreground font-medium outline-none border-b border-primary pb-0.5"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {item.type === 'project' && <FolderOpen size={12} className="text-muted-foreground flex-shrink-0" />}
                            <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.type === 'canvas' ? timeAgo(item.updatedAt) : `${getChildren(item.id).length} files`}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
                          >
                            <MoreHorizontal size={14} className="text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {renderDropdownActions(item)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-44">
                  {renderContextActions(item)}
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filtered.map(item => (
              <ContextMenu key={item.id}>
                <ContextMenuTrigger>
                  <div
                    onClick={() => renamingId !== item.id && handleOpen(item)}
                    className="group flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                      {item.type === 'canvas' ? (
                        <LayoutGrid size={16} className="text-muted-foreground" strokeWidth={1.5} />
                      ) : (
                        <FolderOpen size={16} className="text-muted-foreground" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {renamingId === item.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-transparent text-sm text-foreground font-medium outline-none border-b border-primary pb-0.5"
                        />
                      ) : (
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {item.type === 'canvas' ? timeAgo(item.updatedAt) : `${getChildren(item.id).length} files`}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
                        >
                          <MoreHorizontal size={14} className="text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {renderDropdownActions(item)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-44">
                  {renderContextActions(item)}
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
