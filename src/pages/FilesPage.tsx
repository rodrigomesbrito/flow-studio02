import { FileImage, Upload } from 'lucide-react';

export default function FilesPage() {
  return (
    <div className="ml-14 min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Arquivos</h1>
            <p className="text-muted-foreground mt-1">Gerencie imagens, uploads e assets</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Upload size={16} />
            Upload
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center justify-center text-center">
          <FileImage size={32} className="text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">Nenhum arquivo enviado ainda.</p>
          <p className="text-muted-foreground text-xs mt-1">Faça upload de imagens e assets para usar nos seus canvases.</p>
        </div>
      </div>
    </div>
  );
}
