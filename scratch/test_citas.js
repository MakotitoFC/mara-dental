const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: citas, error } = await supabase
    .from("citas")
    .select(`
      id,
      fecha,
      hora_inicio,
      tipo_consulta_id,
      estado,
      notas,
      tipo_consulta:tipo_consulta_id ( tipo_consulta, color )
    `)
    .limit(1);
    
  console.log(JSON.stringify(citas, null, 2));
}
run();
