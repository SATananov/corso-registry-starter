// js/api.js — Supabase клиент (с ESM от CDN, без билд стъпка)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// TODO: СЛОЖИ ТВОИТЕ ДАННИ
const SUPABASE_URL = 'https://wwdshtnrduxauwxtgadl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZHNodG5yZHV4YXV3eHRnYWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxODQ5NDUsImV4cCI6MjA3Mzc2MDk0NX0.R_ITamQoP4G6webhXg-q81iywl3nzmysRBDx6YwJKNw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
