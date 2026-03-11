import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { WorkspaceItem } from '@/types/workspace';

interface WorkspaceContextType {
  items: WorkspaceItem[];
  createItem: (type: 'canvas' | 'project', parentId: string | null) => WorkspaceItem;
  renameItem: (id: string, name: string) => void;
  moveItem: (id: string, newParentId: string | null) => void;
  deleteItem: (id: string) => void;
  getChildren: (parentId: string | null) => WorkspaceItem[];
}

const WorkspaceContext = createContext<WorkspaceContextType>(null!);

const STORAGE_KEY = 'workspace-items';

function loadItems(): WorkspaceItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems(items: WorkspaceItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WorkspaceItem[]>(loadItems);

  const persist = useCallback((next: WorkspaceItem[]) => {
    setItems(next);
    saveItems(next);
  }, []);

  const createItem = useCallback((type: 'canvas' | 'project', parentId: string | null) => {
    const now = Date.now();
    const item: WorkspaceItem = {
      id: crypto.randomUUID(),
      type,
      name: type === 'canvas' ? 'Untitled Canvas' : 'Untitled Project',
      parentId,
      createdAt: now,
      updatedAt: now,
    };
    const next = [...items, item];
    persist(next);
    return item;
  }, [items, persist]);

  const renameItem = useCallback((id: string, name: string) => {
    persist(items.map(i => i.id === id ? { ...i, name, updatedAt: Date.now() } : i));
  }, [items, persist]);

  const moveItem = useCallback((id: string, newParentId: string | null) => {
    persist(items.map(i => i.id === id ? { ...i, parentId: newParentId, updatedAt: Date.now() } : i));
  }, [items, persist]);

  const deleteItem = useCallback((id: string) => {
    // Also delete children if it's a project
    const toDelete = new Set<string>();
    const collectChildren = (parentId: string) => {
      toDelete.add(parentId);
      items.filter(i => i.parentId === parentId).forEach(i => collectChildren(i.id));
    };
    collectChildren(id);
    persist(items.filter(i => !toDelete.has(i.id)));
  }, [items, persist]);

  const getChildren = useCallback((parentId: string | null) => {
    return items.filter(i => i.parentId === parentId);
  }, [items]);

  return (
    <WorkspaceContext.Provider value={{ items, createItem, renameItem, moveItem, deleteItem, getChildren }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
