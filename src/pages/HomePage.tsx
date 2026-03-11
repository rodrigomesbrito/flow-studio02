import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, FolderOpen } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="ml-14 min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Bem-vindo ao seu workspace</p>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/canvas')}
            className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 hover:border-primary/40 hover:bg-card/80 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
              <Plus size={22} className="text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Criar novo Canvas</span>
          </button>

          <button
            onClick={() => navigate('/canvas')}
            className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 hover:border-primary/40 hover:bg-card/80 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
              <LayoutGrid size={22} className="text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Meus Canvases</span>
          </button>

          <button
            onClick={() => navigate('/projects')}
            className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 hover:border-primary/40 hover:bg-card/80 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
              <FolderOpen size={22} className="text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">Projetos</span>
          </button>
        </div>

        {/* Recent canvases */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Canvases recentes</h2>
          <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center justify-center text-center">
            <LayoutGrid size={32} className="text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum canvas criado ainda.</p>
            <button
              onClick={() => navigate('/canvas')}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Criar primeiro canvas →
            </button>
          </div>
        </section>

        {/* Recent projects */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Projetos recentes</h2>
          <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center justify-center text-center">
            <FolderOpen size={32} className="text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum projeto criado ainda.</p>
            <button
              onClick={() => navigate('/projects')}
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Criar primeiro projeto →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
