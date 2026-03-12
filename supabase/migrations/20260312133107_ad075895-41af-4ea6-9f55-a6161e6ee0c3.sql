
-- Workspace items table
CREATE TABLE public.workspace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('canvas', 'project')),
  name text NOT NULL DEFAULT 'Untitled',
  parent_id uuid REFERENCES public.workspace_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own workspace items"
  ON public.workspace_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Canvas data table (stores nodes and connections as JSON per canvas)
CREATE TABLE public.canvas_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id uuid REFERENCES public.workspace_items(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  connections jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.canvas_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own canvas data"
  ON public.canvas_data FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at triggers
CREATE TRIGGER update_workspace_items_updated_at
  BEFORE UPDATE ON public.workspace_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_canvas_data_updated_at
  BEFORE UPDATE ON public.canvas_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
