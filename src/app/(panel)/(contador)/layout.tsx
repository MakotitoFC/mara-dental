import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ContadorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar que el usuario tenga el rol de contador (rol_id = 5)
  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol_id')
    .eq('id', user.id)
    .single();

  if (userData?.rol_id !== 5) {
    // Si no es contador, mandarlo a su dashboard respectivo o a la raíz
    redirect('/dashboard');
  }

  return <>{children}</>;
}
