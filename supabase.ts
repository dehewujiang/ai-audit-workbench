import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 验证环境变量是否存在
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables missing:')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗')
  throw new Error('Missing Supabase environment variables. Please check .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)