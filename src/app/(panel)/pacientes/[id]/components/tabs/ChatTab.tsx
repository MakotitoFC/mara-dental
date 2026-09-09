"use client";

import { useEffect, useState, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { getChatInfoAction, generateChatLinkAction, sendMessageAction } from "../../chat.actions";
import { createClient } from "@/lib/supabase/client";

export function ChatTab({ pacienteId }: { pacienteId: string }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingAttachment, setLoadingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();

    // Nombre de canal único por paciente para evitar colisiones
    const channelName = `chat_tab_${pacienteId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `paciente_id=eq.${pacienteId}` },
        (payload) => {
          const newMsg = payload.new;
          if (!newMsg || newMsg.paciente_id !== pacienteId) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          
          setPaciente((prev: any) => (prev && !prev.telegram_chat_id ? { ...prev, telegram_chat_id: "linked" } : prev));
          
          setTimeout(scrollToBottom, 100);

          if (newMsg.direction === "inbound" && !newMsg.is_read) {
            supabase.from("messages").update({ is_read: true }).eq("id", newMsg.id).then();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pacientes", filter: `id=eq.${pacienteId}` },
        (payload) => {
          if (payload.new && payload.new.id === pacienteId) {
            setPaciente((prev: any) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `paciente_id=eq.${pacienteId}` },
        (payload) => {
          if (payload.new) {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pacienteId]);

  // Sondeo automático de respaldo: verifica vinculación e ingreso de nuevos mensajes en tiempo real
  useEffect(() => {
    const isLinked = !!paciente?.telegram_chat_id;
    // Si aún no está vinculado, verificar cada 3 segundos para habilitar el chat instantáneamente cuando el paciente conecte
    const intervalMs = isLinked ? 6000 : 3000;

    const interval = setInterval(async () => {
      const data = await getChatInfoAction(pacienteId, 0, 20);
      if (data && data.paciente) {
        setPaciente((prev: any) => {
          if (!prev?.telegram_chat_id && data.paciente.telegram_chat_id) {
            return data.paciente;
          }
          return prev ? { ...prev, ...data.paciente } : data.paciente;
        });

        if (data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const hasNew = data.messages.some((m: any) => !existingIds.has(m.id));
            if (!hasNew) return prev;

            const map = new Map();
            prev.forEach((m) => map.set(m.id, m));
            data.messages.forEach((m: any) => map.set(m.id, m));
            const sorted = Array.from(map.values()).sort(
              (a: any, b: any) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
            );
            setTimeout(scrollToBottom, 100);
            return sorted;
          });
        }
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [pacienteId, paciente?.telegram_chat_id]);

  useEffect(() => {
    // Verificar si hay un archivo o carga pendiente proveniente de otra pestaña
    const pendingFile = (window as any).__pendingTelegramFile;
    const pendingCaption = (window as any).__pendingTelegramCaption || (window as any).__autoSendTelegramMessage || "";
    const isLoading = (window as any).__loadingTelegramAttachment;

    if (pendingFile) {
      setSelectedFile(pendingFile);
      if (pendingCaption) setText(pendingCaption);
      (window as any).__pendingTelegramFile = null;
      (window as any).__pendingTelegramCaption = null;
      (window as any).__autoSendPending = false;
      (window as any).__autoSendTelegramMessage = null;
      toast.info("Documento cargado. Puedes agregar un mensaje y presionar Enviar.");
    } else if (isLoading) {
      setLoadingAttachment(true);
    }

    const handleReady = (e: any) => {
      setLoadingAttachment(false);
      const { file, caption } = e.detail || {};
      if (file) {
        setSelectedFile(file);
        if (caption) setText(caption);
        (window as any).__pendingTelegramFile = null;
        (window as any).__pendingTelegramCaption = null;
        (window as any).__loadingTelegramAttachment = false;
        toast.info("Documento cargado. Puedes agregar un mensaje y presionar Enviar.");
      }
    };

    const handleError = () => {
      setLoadingAttachment(false);
      (window as any).__loadingTelegramAttachment = false;
    };

    window.addEventListener("telegram_attachment_ready", handleReady);
    window.addEventListener("telegram_attachment_error", handleError);

    return () => {
      window.removeEventListener("telegram_attachment_ready", handleReady);
      window.removeEventListener("telegram_attachment_error", handleError);
    };
  }, [pacienteId]);

  const [accessDenied, setAccessDenied] = useState(false);
  const [deniedMessage, setDeniedMessage] = useState("");

  const fetchData = async (pageNum: number = 0) => {
    if (pageNum === 0) setLoading(true);
    const data = await getChatInfoAction(pacienteId, pageNum, 20);
    if (data) {
      if (data.allowed === false) {
        setAccessDenied(true);
        setDeniedMessage(data.error || "No tienes permiso para acceder al chat de este paciente.");
        if (pageNum === 0) setLoading(false);
        return;
      }
      setAccessDenied(false);
      if (pageNum === 0) {
        setPaciente(data.paciente);
        setMessages(data.messages || []);
        setTimeout(scrollToBottom, 100);
      } else {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = (data.messages || []).filter((m: any) => !existingIds.has(m.id));
          return [...newMessages, ...prev];
        });
      }
      setHasMore(data.messages?.length === 20);
    }
    if (pageNum === 0) setLoading(false);
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchData(nextPage);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0) {
      loadMore();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleGenerateLink = async () => {
    const res = await generateChatLinkAction(pacienteId);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    fetchData();
    toast.success("Enlace de invitación generado.");
  };

  const copyToClipboard = (code: string) => {
    const url = `https://t.me/MaraDentalBot?start=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Enlace copiado al portapapeles");
  };

  const executeSendMessage = async (fileToSend: File | null, textToSend: string) => {
    if (!textToSend.trim() && !fileToSend) return;

    setSending(true);

    // Optimistic UI
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: textToSend,
      direction: "outbound",
      sent_at: new Date().toISOString(),
      status: "sending",
      file_name: fileToSend?.name,
      file_type: fileToSend?.type,
      file_size: fileToSend?.size,
      file_url: fileToSend ? URL.createObjectURL(fileToSend) : null
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setTimeout(scrollToBottom, 100);

    let fileUrl = undefined;
    let presignedUrl = undefined;
    
    if (fileToSend) {
      const { uploadChatAttachmentAction } = await import("../../chat.actions");
      const formData = new FormData();
      formData.append("file", fileToSend);
      formData.append("pacienteId", pacienteId);
      const subida = await uploadChatAttachmentAction(formData);
      if (subida.error) {
        toast.error("Error subiendo archivo: " + subida.error);
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
        setSending(false);
        return;
      }
      fileUrl = subida.url;
      presignedUrl = subida.presignedUrl;
    }

    const res = await sendMessageAction(
      pacienteId, 
      textToSend, 
      fileUrl, 
      fileToSend?.name, 
      fileToSend?.type, 
      fileToSend?.size,
      presignedUrl
    );
    
    if (res.error) {
      toast.error(res.error);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: "failed" } : m));
    } else if (res.message) {
      setMessages(prev => prev.map(m => m.id === tempId ? res.message : m));
      toast.success(fileToSend ? "Documento enviado a Telegram con éxito." : "Mensaje enviado.");
    }
    
    setSending(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !selectedFile) return;

    const currentText = text;
    const currentFile = selectedFile;
    setText("");
    setSelectedFile(null);

    await executeSendMessage(currentFile, currentText);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
 <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-cyan-500 animate-spin"/>
      </div>
    );
  }

  if (accessDenied) {
    return (
 <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center my-4">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mb-4">
          <Icon name="lock" size={32} />
        </div>
 <h2 className="text-lg font-bold text-slate-800 mb-2">
          Acceso Restringido al Chat
        </h2>
 <p className="text-slate-500 max-w-md mx-auto text-[13.5px] leading-relaxed">
          {deniedMessage || "Solo el médico tratante de este paciente o los administradores pueden acceder a esta conversación."}
        </p>
      </div>
    );
  }

  const isLinked = !!paciente?.telegram_chat_id;

  if (!isLinked) {
    return (
 <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center">
 <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-6">
          <Icon name="send" size={32} />
        </div>
 <h2 className="text-xl font-bold text-slate-800 mb-2">
          Chat por Telegram no vinculado
        </h2>
 <p className="text-slate-500 max-w-md mx-auto mb-8 text-[14px]">
          El paciente aún no ha activado la comunicación por Telegram. Genera un enlace de invitación para que pueda iniciar la conversación con el bot de la clínica.
        </p>

        {paciente?.telegram_link_code ? (
          <div className="flex flex-col items-center gap-3 w-full max-w-sm">
 <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl w-full flex items-center justify-between">
 <span className="text-[12px] font-mono text-slate-600 truncate">
                https://t.me/MaraDentalBot?start={paciente.telegram_link_code}
              </span>
              <button
                onClick={() => copyToClipboard(paciente.telegram_link_code)}
 className="w-8 h-8 flex items-center justify-center text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors shrink-0 ml-2"
                title="Copiar enlace"
              >
                <Icon name="content_copy" size={16} />
              </button>
            </div>
 <p className="text-[12px] text-amber-600 flex items-center gap-1.5">
              <Icon name="pending" size={14} />
              Esperando a que el paciente inicie el bot...
            </p>
          </div>
        ) : (
          <button
            onClick={handleGenerateLink}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl text-[14px] font-medium transition-colors"
          >
            <Icon name="link" size={18} />
            Generar Enlace de Invitación
          </button>
        )}
      </div>
    );
  }

  const pacienteNombre = [paciente?.nombre, paciente?.apellido].filter(Boolean).join(" ") || "Paciente";
  const pacienteIniciales = (`${paciente?.nombre?.[0] ?? ""}${paciente?.apellido?.[0] ?? ""}`.toUpperCase()) || "P";

  return (
 <div className="flex flex-col h-[600px] lg:h-full bg-white overflow-hidden">
 <div className="shrink-0 flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-200">
        <div className="relative shrink-0">
 <div className="w-10 h-10 rounded-full bg-cyan-50 border-2 border-cyan-200 flex items-center justify-center">
 <span className="text-[13px] font-bold text-cyan-700">{pacienteIniciales}</span>
          </div>
 <span className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-[color:var(--telegram-blue)] border-2 border-white flex items-center justify-center">
            <Icon name="send" size={9} className="text-white" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
 <h2 className="text-[14px] font-bold text-slate-800 truncate">{pacienteNombre}</h2>
 <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Icon name="send" size={11} className="text-[color:var(--telegram-blue)]" />
            Vinculado por Telegram
          </p>
        </div>
      </div>

      <div
 className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-5 flex flex-col gap-4 bg-slate-50/50"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
 <div className="flex-1 flex items-center justify-center text-slate-400 text-[13px]">
            No hay mensajes. Envía el primero para comenzar.
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.direction === "outbound";
            const date = new Date(m.sent_at);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%] ${isMe ? "self-end" : "self-start"}`}>
                <div 
                  className={`px-4 py-2 rounded-2xl text-[13px] relative shadow-sm ${
                    isMe 
                      ? "bg-cyan-600 text-white rounded-br-sm" 
 :"bg-white text-slate-700 border border-slate-200 rounded-bl-sm"
                  }`}
                >
                  {m.file_url && (
                    <div className="mb-2">
                      {m.file_type?.startsWith("image/") ? (
                        <img src={`/api/proxy-image?url=${encodeURIComponent(m.file_url)}`} alt="adjunto" className="max-w-[200px] rounded-lg border border-white/20" />
                      ) : m.file_type?.startsWith("audio/") || m.file_name?.endsWith(".ogg") || m.file_name?.endsWith(".mp3") || m.file_name?.endsWith(".wav") ? (
                        <audio controls src={`/api/proxy-image?url=${encodeURIComponent(m.file_url)}&type=${encodeURIComponent(m.file_type || "audio/ogg")}`} className="h-10 max-w-[200px]" />
                      ) : (
                        <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg text-sm border border-white/20">
                          <Icon name="file" size={18} />
                          <a href={`/api/proxy-image?url=${encodeURIComponent(m.file_url)}`} target="_blank" rel="noopener noreferrer" className="hover:underline line-clamp-1 flex-1">
                            {m.file_name || "Documento adjunto"}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                  <span className="text-[10px] opacity-70 mt-1 self-end flex items-center gap-1">
                    {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && (
                      m.status === "sending" ? (
                        <Icon name="check" size={14} className="text-white/50" />
                      ) : m.status === "failed" ? (
                        <Icon name="x_circle" size={14} className="text-red-300" />
                      ) : (
                        <Icon name="done_all" size={14} className={m.is_read ? "text-cyan-200" : "text-white/70"} />
                      )
                    )}
                  </span>
                </div>
                {isMe && m.doctor_nombre && (
                  <span className="text-[10px] text-slate-400 mt-1 mr-1">{m.doctor_nombre}</span>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        {loadingAttachment && (
          <div className="mb-3 flex items-center gap-2.5 bg-cyan-50 border border-cyan-200 p-2.5 rounded-xl text-[13px] text-cyan-800 animate-pulse">
            <div className="w-4 h-4 rounded-full border-2 border-cyan-600 border-t-transparent animate-spin shrink-0" />
            <span>Generando y cargando documento PDF...</span>
          </div>
        )}
        {selectedFile && (
 <div className="mb-3 flex items-center justify-between bg-slate-100 p-2 rounded-lg text-[13px] border border-slate-200">
            <div className="flex items-center gap-2 truncate">
              <Icon name={selectedFile.type.startsWith("image/") ? "image" : "description"} size={18} className="text-cyan-600" />
              <span className="truncate">{selectedFile.name}</span>
            </div>
            <button type="button" onClick={() => setSelectedFile(null)} className="text-slate-500 hover:text-red-500 transition-colors">
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-end gap-2 relative">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setSelectedFile(e.target.files[0]);
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
 className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-full transition-colors shrink-0"
            title="Adjuntar archivo"
          >
            <Icon name="attach_file" size={20} />
          </button>
          
 <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden min-h-[44px] flex items-center">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe un mensaje..."
 className="w-full bg-transparent border-0 focus:ring-0 text-[14px] text-slate-700 px-4 py-3 resize-none max-h-[120px]"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
          </div>

          <button
            type="submit"
            disabled={(!text.trim() && !selectedFile) || sending}
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors shrink-0 shadow-sm
              ${(text.trim() || selectedFile) && !sending 
                ? "bg-cyan-600 hover:bg-cyan-700 text-white" 
 :"bg-slate-100 text-slate-400"
              }`}
          >
            {sending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Icon name="send" size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
