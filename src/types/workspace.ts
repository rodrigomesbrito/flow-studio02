export interface WorkspaceItem {
  id: string;
  type: 'canvas' | 'project';
  name: string;
  parentId: string | null; // null = root, otherwise inside a project
  createdAt: number;
  updatedAt: number;
}
