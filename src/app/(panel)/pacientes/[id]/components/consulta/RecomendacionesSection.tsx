"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";
import { saveRecomendacionAction, editRecomendacionAction, deleteRecomendacionAction, getSedeInfoAction } from "../../consulta.actions";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmModal";
import {
  buildNotaCuidadosHtml, downloadHtmlAsPaginatedPdf, generatePaginatedPdfBlob, printHtml, type ClinicaInfo,
} from "@/lib/reportExport";

interface Recomendacion {
  id: number;
  contenido: string;
  created_at: string;
}

export function RecomendacionesSection({
  consultaId,
  pacienteId,
  initial,
  enabled = true,
  onSaved,
  scrollBody = false,
  pacienteNombre,
  onNavigateTab,
}: {
  consultaId: string; pacienteId: string; initial: Recomendacion[]; enabled?: boolean; onSaved?: () => void; /** El rótulo queda fijo y solo el listado de registros scrollea (uso en el modal mobile). */ scrollBody?: boolean;
  /** Para el documento "Nota de Cuidados" — igual patrón de props que ya usa RecetaSection. */
  pacienteNombre?: string;
  onNavigateTab?: (tab: string) => void;
}) {
  const [recomendaciones, setRecomendaciones] = useState<Recomendacion[]>(initial || []);
  const [creating, setCreating] = useState(false);
  const [contenido, setContenido] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRecomendaciones(initial || []);
  }, [initial]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContenido, setEditContenido] = useState("");

  const toast = useToast();
  const confirm = useConfirm();

  // ── Documento "Nota de Cuidados" ────────────────────────────────────────
  const [sede, setSede] = useState<ClinicaInfo | null>(null);
  const [exportando, setExportando] = useState<"print" | "pdf" | "telegram" | null>(null);

  useEffect(() => {
    getSedeInfoAction().then(setSede).catch(() => {});
  }, []);

  function buildNotaCuidadosDoc() {
    return buildNotaCuidadosHtml({
      titulo: "Cuidados e indicaciones para el paciente",
      pacienteNombre,
      fecha: new Date().toISOString(),
      recomendaciones: recomendaciones.map((r) => r.contenido),
    });
  }

  async function handleExportar(mode: "print" | "pdf" | "telegram") {
    setExportando(mode);
    try {
      const html = buildNotaCuidadosDoc();
      const pacienteSlug = (pacienteNombre || "paciente").replace(/\s+/g, "_");
      if (mode === "print") {
        await printHtml(html, `Nota de Cuidados · ${pacienteNombre || ""}`, "a5-vertical");
      } else if (mode === "pdf") {
        await downloadHtmlAsPaginatedPdf(html, `nota_cuidados_${pacienteSlug}.pdf`, 640, undefined, "a5-vertical");
      } else if (mode === "telegram") {
        (window as any).__loadingTelegramAttachment = true;
        (window as any).__autoSendPending = false;
        onNavigateTab?.("chat");
        const blob = await generatePaginatedPdfBlob(html, 640, undefined, "a5-vertical");
        const filename = `Nota_Cuidados_${pacienteSlug}.pdf`;
        const pdfFile = new File([blob], filename, { type: "application/pdf" });
        const caption = `🦷 Nota de cuidados e indicaciones para ${pacienteNombre || "el paciente"}.`;
        (window as any).__pendingTelegramFile = pdfFile;
        (window as any).__pendingTelegramCaption = caption;
        (window as any).__loadingTelegramAttachment = false;
        window.dispatchEvent(new CustomEvent("telegram_attachment_ready", { detail: { file: pdfFile, caption } }));
      }
    } catch (err) {
      console.error("Error exportando nota de cuidados: ", err);
      if (mode === "telegram") {
        (window as any).__loadingTelegramAttachment = false;
        window.dispatchEvent(new CustomEvent("telegram_attachment_error"));
      }
      toast.error("No se pudo generar el documento.");
    } finally {
      setExportando(null);
    }
  }

  function startEdit(item: Recomendacion) {
    setEditingId(item.id);
    setEditContenido(item.contenido);
  }

  async function handleAdd() {
    if (!contenido.trim()) return;
    setSaving(true);
    
    // Update optimistically
    const tempId = Date.now();
    const tempContent = contenido;
    setRecomendaciones(prev => [{ id: tempId, contenido: tempContent, created_at: new Date().toISOString() }, ...prev]);
    setContenido(""); 
    setCreating(false);

    const res = await saveRecomendacionAction({ consulta_id: String(consultaId), contenido: tempContent, paciente_id: String(pacienteId) });
    setSaving(false);
    
    if (res?.error) {
      setRecomendaciones(prev => prev.filter(r => r.id !== tempId));
      setContenido(tempContent);
      setCreating(true);
      toast.error(res.error);
    } else {
      onSaved?.();
      toast.success("Recomendación agregada correctamente");
    }
  }

  async function handleEdit() {
    if (!editingId || !editContenido.trim()) return;
    setSaving(true);
    const res = await editRecomendacionAction({ id: String(editingId), contenido: editContenido, paciente_id: String(pacienteId) });
    setSaving(false);
    if (!res?.error) {
      setRecomendaciones(prev => prev.map(r => r.id === editingId ? { ...r, contenido: editContenido } : r));
      setEditingId(null);
      toast.success("Recomendación actualizada correctamente");
    } else {
      toast.error(res.error);
    }
  }

  async function handleDelete(itemId: number) {
    const ok = await confirm({
      title: "¿Eliminar recomendación? ",
      message: "Esta acción no se puede deshacer.",
    });
    if (!ok) return;
    await deleteRecomendacionAction(String(itemId), String(pacienteId));
    setRecomendaciones(prev => prev.filter(r => r.id !== itemId));
    toast.success("Recomendación eliminada");
    onSaved?.();
  }

  return (
 <motion.div variants={fadeIn} initial="hidden" animate="visible" className={`bg-white rounded-2xl border relative ${scrollBody ? "flex flex-col h-full overflow-hidden" : ""} ${enabled ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
      {!enabled && (
 <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-2xl">
 <Icon name="lock" size={22} className="text-slate-400"/>
 <p className="text-[12px] font-semibold text-slate-500">Disponible con diagnóstico definitivo</p>
        </div>
      )}
 <div className={`${scrollBody ? "shrink-0" : ""} flex flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-4 border-b border-slate-100`}>
        <div className="flex items-center gap-2 min-w-0">
 <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
            <Icon name="tips_and_updates" size={18} />
          </div>
 <h2 className="text-[14px] font-semibold text-slate-800">Recomendaciones</h2>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => handleExportar("print")} disabled={exportando !== null} title="Imprimir Nota de Cuidados"
 className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
            <Icon name="print" size={13} />
          </button>
          <button onClick={() => handleExportar("pdf")} disabled={exportando !== null} title="Descargar PDF"
 className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
            <Icon name="download" size={13} />
          </button>
          <button onClick={() => handleExportar("telegram")} disabled={exportando !== null} title="Enviar por Telegram"
 className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-[color:var(--telegram-blue)] hover:bg-[color:var(--telegram-blue)]/10 disabled:opacity-40 transition-colors">
            <Icon name="send" size={13} />
          </button>
          <button onClick={() => enabled && setCreating(v => !v)} disabled={!enabled}
 className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cyan-200 text-[12px] font-semibold text-cyan-600 hover:bg-cyan-50 disabled:opacity-40 transition-colors">
            <Icon name={creating ? "remove" : "add"} size={16} />
            {creating ? "Cancelar" : (
              <>
                <span className="sm:hidden">Nueva</span>
                <span className="hidden sm:inline">Nueva recomendación</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className={`p-5 flex flex-col gap-4 ${scrollBody ? "flex-1 min-h-0 overflow-y-auto no-scrollbar" : ""}`}>
        {creating && (
 <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
            <textarea
              value={contenido}
              onChange={e => setContenido(e.target.value)}
              placeholder="Escribe la recomendación para el paciente..."
              rows={3}
 className="border border-slate-200 rounded-lg px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-400 resize-none bg-white w-full"
            />
            <div className="flex justify-end">
              <button onClick={handleAdd} disabled={saving || !contenido.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[12px] font-semibold border-0 transition-colors">
                <Icon name="check" size={14} /> Guardar
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {recomendaciones.length === 0 && !creating ? (
 <div className="py-8 text-center text-slate-400">
              <Icon name="tips_and_updates" size={28} className="opacity-30 mx-auto mb-2" />
              <p className="text-[12px]">Sin recomendaciones</p>
            </div>
          ) : (
            <motion.div variants={staggerContainer()} initial="hidden" animate="visible" className="flex flex-col gap-3">
            {recomendaciones.map((item, idx) => (
 <motion.div key={item.id} variants={staggerItem} className="flex items-center gap-3 p-4 bg-orange-50/30 rounded-xl border border-orange-100">
 <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>

                {editingId === item.id ? (
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <textarea
                      value={editContenido}
                      onChange={e => setEditContenido(e.target.value)}
                      rows={3}
 className="border border-slate-200 rounded-lg px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-400 resize-none bg-white w-full"
                    />
                    <div className="flex justify-end gap-2">
 <button onClick={() => setEditingId(null)} disabled={saving} className="text-slate-500 hover:text-slate-700 font-medium text-[12px] px-2 py-1 transition-colors border-0">Cancelar</button>
                      <button onClick={handleEdit} disabled={saving || !editContenido.trim()} className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors border-0">
                        <Icon name="check" size={13} /> Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
 <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">{item.contenido}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(item)}
 className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-orange-100 text-orange-400 hover:text-orange-600 border-0 transition-colors">
                        <Icon name="edit" size={14} />
                      </button>
                      <button onClick={() => handleDelete(item.id)}
 className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500 border-0 transition-colors">
                        <Icon name="delete" size={14} />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
            </motion.div>
          )}
        </div>
      </div>

    </motion.div>
  );
}
