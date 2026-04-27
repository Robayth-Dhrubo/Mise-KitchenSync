// Re-export canonical types
// To regenerate: npx supabase gen types typescript --project-id <your-id> > src/lib/types/database.ts

export type Database = {
  public: {
    Tables: Record<string, any>;
    Enums: Record<string, any>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = any;
export type Enums<T extends keyof Database['public']['Enums']> = any;
