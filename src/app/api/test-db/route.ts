import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('tipo_archivo').select('*');
  
  return NextResponse.json({
    data,
    error,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL
  });
}
