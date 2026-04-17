import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Wine = {
  id: string;
  name: string;
  type: string;
  year: string;
  producer: string;
  country: string;
  region: string;
  castas: string;
  serve_temp: string;
  capacity: string;
  abv: string;
  description: string;
  price: number;
  image_url: string;
  is_featured: boolean;
  is_available?: boolean;
  stock?: number;
};

export type InventoryLog = {
  id: string;
  created_at: string;
  wine_id: string;
  transaction_type: 'entrada' | 'venda' | 'perda';
  quantity: number;
  comment?: string;
  user_name?: string;
  transaction_date?: string;
};
