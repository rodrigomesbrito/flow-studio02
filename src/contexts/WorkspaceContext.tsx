import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { WorkspaceItem } from '@/types/workspace';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WorkspaceContextType {
  items: WorkspaceItem[];
  loading: boolean;
  createItem: (type: 'canvas' | 'project', parentId: string | null) => Promise<WorkspaceItem>;
  renameItem: (id: string, name: string) => void;
  moveItem: (id: string, newParentId: string | null) => void;
  deleteItem: (id: string) => void;
  getChildren: (parentId: string | null) => WorkspaceItem[];
}

const WorkspaceContext = createContext<WorkspaceContextType>(null!);

function mapRow(row: any): WorkspaceItem {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    parentId: row.parent_id,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load items from database
  useEffect(() => {
    if (!user) { setItems([]); setLoading(false); return; }

    const fetchItems = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('workspace_items')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        setItems(data.map(mapRow));
      }
      setLoading(false);
    };

    fetchItems();
  }, [user]);

  const createItem = useCallback(async (type: 'canvas' | 'project', parentId: string | null): Promise<WorkspaceItem> => {
    const name = type === 'canvas' ? 'Untitled Canvas' : 'Untitled Project';
    const { data, error } = await supabase
      .from('workspace_items')
      .insert({ type, name, parent_id: parentId, user_id: user!.id })
      .select()
      .single();

    if (error) throw error;

    const item = mapRow(data);
    setItems(prev => [...prev, item]);
    return item;
  }, [user]);

  const renameItem = useCallback(async (id: string, name: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, name, updatedAt: Date.now() } : i));
    await supabase.from('workspace_items').update({ name }).eq('id', id);
  }, []);

  const moveItem = useCallback(async (id: string, newParentId: string | null) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, parentId: newParentId, updatedAt: Date.now() } : i));
    await supabase.from('workspace_items').update({ parent_id: newParentId }).eq('id', id);
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    // Collect all descendants to remove from local state
    const toDelete = new Set<string>();
    const collectChildren = (parentId: string) => {
      toDelete.add(parentId);
      items.filter(i => i.parentId === parentId).forEach(i => collectChildren(i.id));
    };
    collectChildren(id);
    setItems(prev => prev.filter(i => !toDelete.has(i.id)));
    // DB cascade handles children
    await supabase.from('workspace_items').delete().eq('id', id);
  }, [items]);

  const getChildren = useCallback((parentId: string | null) => {
    return items.filter(i => i.parentId === parentId);
  }, [items]);

  return (
    <WorkspaceContext.Provider value={{ items, loading, createItem, renameItem, moveItem, deleteItem, getChildren }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
