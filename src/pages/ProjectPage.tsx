import { useParams } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceGrid } from '@/components/WorkspaceGrid';

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { items, getChildren } = useWorkspace();

  const project = items.find(i => i.id === projectId);
  const children = getChildren(projectId ?? null);

  return (
    <WorkspaceGrid
      items={children}
      title={project?.name ?? 'Project'}
      breadcrumbs={[
        { label: 'My files', path: '/' },
        { label: project?.name ?? 'Project', path: `/project/${projectId}` },
      ]}
    />
  );
}
