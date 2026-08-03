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
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("messages_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `paciente_id=eq.${pacienteId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pacienteId]);

  const fetchData = async () => {
    setLoading(true);
    const data = await getChatInfoAction(pacienteId);
    if (data) {
      setPaciente(data.paciente);
      setMessages(data.messages);
      setTimeout(scrollToBottom, 100);
    }
    setLoading(false);
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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !selectedFile) return;

    setSending(true);
    let fileUrl = undefined;
    let presignedUrl = undefined;
    
    if (selectedFile) {
      const { uploadChatAttachmentAction } = await import("../../chat.actions");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("pacienteId", pacienteId);
      const subida = await uploadChatAttachmentAction(formData);
      if (subida.error) {
        toast.error("Error subiendo archivo: " + subida.error);
        setSending(false);
        return;
      }
      fileUrl = subida.url;
      presignedUrl = subida.presignedUrl;
    }

    const res = await sendMessageAction(
      pacienteId, 
      text, 
      fileUrl, 
      selectedFile?.name, 
      selectedFile?.type, 
      selectedFile?.size,
      presignedUrl
    );
    
    if (res.error) {
      toast.error(res.error);
    } else {
      setText("");
      setSelectedFile(null);
      fetchData(); 
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-cyan-500 animate-spin" />
      </div>
    );
  }

  const isLinked = !!paciente?.telegram_chat_id;

  if (!isLinked) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-500 dark:text-blue-400 mb-6">
          <Icon name="send" size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Chat por Telegram no vinculado
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 text-[14px]">
          El paciente aún no ha activado la comunicación por Telegram. Genera un enlace de invitación para que pueda iniciar la conversación con el bot de la clínica.
        </p>

        {paciente?.telegram_link_code ? (
          <div className="flex flex-col items-center gap-3 w-full max-w-sm">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl w-full flex items-center justify-between">
              <span className="text-[12px] font-mono text-slate-600 dark:text-slate-300 truncate">
                https://t.me/MaraDentalBot?start={paciente.telegram_link_code}
              </span>
              <button
                onClick={() => copyToClipboard(paciente.telegram_link_code)}
                className="w-8 h-8 flex items-center justify-center text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-lg transition-colors shrink-0 ml-2"
                title="Copiar enlace"
              >
                <Icon name="content_copy" size={16} />
              </button>
            </div>
            <p className="text-[12px] text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[600px]">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
          <Icon name="person" size={20} />
        </div>
        <div>
          <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Paciente</h2>
          <p className="text-[11px] text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Vinculado por Telegram
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/20">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[13px]">
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
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-sm"
                  }`}
                >
                  {m.file_url && (
                    <div className="mb-2">
                      {m.file_type?.startsWith("image/") ? (
                        <img src={m.file_url} alt="adjunto" className="max-w-[200px] rounded-lg border border-white/20" />
                      ) : (
                        <a href={m.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-black/10 dark:bg-white/10 p-2 rounded-lg hover:bg-black/20 transition-colors text-inherit">
                          <Icon name="description" size={20} />
                          <span className="truncate max-w-[150px]">{m.file_name || "Archivo adjunto"}</span>
                        </a>
                      )}
                    </div>
                  )}
                  {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                  <div className={`text-[10px] flex items-center justify-end gap-1 mt-1 ${isMe ? "text-cyan-100" : "text-slate-400"}`}>
                    {timeStr}
                    {isMe && <Icon name="done_all" size={14} className={m.is_read ? "text-blue-300" : "text-cyan-200"} />}
                  </div>
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

      <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
        {selectedFile && (
          <div className="mb-3 flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-2 rounded-lg text-[13px] border border-slate-200 dark:border-slate-600">
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
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors shrink-0"
            title="Adjuntar archivo"
          >
            <Icon name="attach_file" size={20} />
          </button>
          
          <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden min-h-[44px] flex items-center">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="w-full bg-transparent border-0 focus:ring-0 text-[14px] text-slate-700 dark:text-slate-200 px-4 py-3 resize-none max-h-[120px]"
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
                : "bg-slate-100 dark:bg-slate-700 text-slate-400"
              }`}
          >
            {sending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Icon name="send" size={18} className="ml-1" />}
          </button>
        </form>
      </div>
    </div>
  );
}
