import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    let chatId = formData.get('chatId') as string;
    const archivoId = formData.get('archivoId') as string;
    const caption = formData.get('caption') as string;
    const file = formData.get('photo') as Blob | null;

    const supabase = await createClient();

    // Si no mandan chatId, buscarlo por archivoId
    if (!chatId && archivoId) {
      const { data } = await supabase.from('archivos_clinicos').select('diagnostico(historia_clinica(pacientes(telegram_chat_id)))').eq('id', archivoId).single();
      chatId = (data as any)?.diagnostico?.historia_clinica?.pacientes?.telegram_chat_id;
    }

    if (!chatId) {
      return NextResponse.json({ error: 'Falta chatId o el paciente no tiene telegram configurado' }, { status: 400 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Falta configurar TELEGRAM_BOT_TOKEN en el backend' }, { status: 500 });
    }

    if (file) {
      // Enviar con foto
      const tgFormData = new FormData();
      tgFormData.append('chat_id', chatId);
      if (caption) tgFormData.append('caption', caption);
      tgFormData.append('photo', file, 'imagen.png');

      const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        body: tgFormData,
      });

      const data = await response.json();
      if (!data.ok) throw new Error(data.description || 'Error al enviar foto a Telegram');
      
      return NextResponse.json({ success: true, data });
    } else {
      // Enviar solo texto
      if (!caption) return NextResponse.json({ error: 'Falta texto para enviar' }, { status: 400 });
      
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: caption }),
      });

      const data = await response.json();
      if (!data.ok) throw new Error(data.description || 'Error al enviar mensaje a Telegram');
      
      return NextResponse.json({ success: true, data });
    }

  } catch (err: any) {
    console.error('Error enviando a Telegram:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
