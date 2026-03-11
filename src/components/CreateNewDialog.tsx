import { useState } from 'react';
import { LayoutGrid, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CreateNewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCanvas: () => void;
  onCreateProject: () => void;
}

export function CreateNewDialog({ open, onOpenChange, onCreateCanvas, onCreateProject }: CreateNewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create New</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => { onCreateCanvas(); onOpenChange(false); }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <LayoutGrid size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Canvas</p>
              <p className="text-xs text-muted-foreground">Create a new visual canvas</p>
            </div>
          </button>
          <button
            onClick={() => { onCreateProject(); onOpenChange(false); }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <FolderOpen size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Project</p>
              <p className="text-xs text-muted-foreground">Create a folder to organize canvases</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
