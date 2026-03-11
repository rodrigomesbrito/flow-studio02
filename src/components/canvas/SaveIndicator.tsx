import { useState, useEffect, useRef } from 'react';
import { Check, Loader2 } from 'lucide-react';

interface SaveIndicatorProps {
  /** Any value that changes when the canvas state changes */
  watchValue: unknown;
}

export function SaveIndicator({ watchValue }: SaveIndicatorProps) {
  const [status, setStatus] = useState<'saved' | 'saving'>('saved');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setStatus('saving');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setStatus('saved');
    }, 600);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [watchValue]);

  return (
    <div className="fixed top-3 right-4 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-card/80 backdrop-blur-sm border border-border text-xs text-muted-foreground">
      {status === 'saving' ? (
        <>
          <Loader2 size={12} className="animate-spin" />
          <span>Salvando...</span>
        </>
      ) : (
        <>
          <Check size={12} className="text-primary" />
          <span>Salvo</span>
        </>
      )}
    </div>
  );
}
