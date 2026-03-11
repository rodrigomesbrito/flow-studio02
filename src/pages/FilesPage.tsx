import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceGrid } from '@/components/WorkspaceGrid';

export default function FilesPage() {
  const { getChildren } = useWorkspace();
  const rootItems = getChildren(null);

  return (
    <WorkspaceGrid
      items={rootItems}
      title="My files"
    />
  );
}
