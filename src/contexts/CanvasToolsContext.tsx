import { createContext, useContext, useState, useCallback } from 'react';
import { NodeType } from '@/types/canvas';

interface CanvasToolsContextType {
  addNodeHandler: ((type: NodeType) => void) | null;
  registerAddNode: (handler: (type: NodeType) => void) => void;
  unregisterAddNode: () => void;
}

const CanvasToolsContext = createContext<CanvasToolsContextType>({
  addNodeHandler: null,
  registerAddNode: () => {},
  unregisterAddNode: () => {},
});

export function CanvasToolsProvider({ children }: { children: React.ReactNode }) {
  const [addNodeHandler, setAddNodeHandler] = useState<((type: NodeType) => void) | null>(null);

  const registerAddNode = useCallback((handler: (type: NodeType) => void) => {
    setAddNodeHandler(() => handler);
  }, []);

  const unregisterAddNode = useCallback(() => {
    setAddNodeHandler(null);
  }, []);

  return (
    <CanvasToolsContext.Provider value={{ addNodeHandler, registerAddNode, unregisterAddNode }}>
      {children}
    </CanvasToolsContext.Provider>
  );
}

export function useCanvasTools() {
  return useContext(CanvasToolsContext);
}
