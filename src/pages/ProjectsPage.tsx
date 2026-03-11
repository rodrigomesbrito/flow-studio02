import { FolderOpen, Plus, LayoutGrid } from 'lucide-react';

const mockProjects = [
  { id: '1', name: 'Projeto Alpha', canvasCount: 3 },
  { id: '2', name: 'Projeto Beta', canvasCount: 1 },
];

export default function ProjectsPage() {
  return (
    <div className="ml-14 min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Projetos</h1>
            <p className="text-muted-foreground mt-1">Organize seus canvases por projeto</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} />
            Novo Projeto
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mockProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <FolderOpen size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{project.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                    <LayoutGrid size={12} />
                    {project.canvasCount} {project.canvasCount === 1 ? 'canvas' : 'canvases'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
