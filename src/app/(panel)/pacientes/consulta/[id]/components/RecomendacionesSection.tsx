"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { getRecomendacionesAction, enviarRecomendacionAction } from "../actions";

interface Recom {
  id: number;
  categoria: string;
  titulo: string;
  contenido: string;
}

export function RecomendacionesSection({ consultaId }: { consultaId: number }) {
  const [catalog, setCatalog] = useState<Recom[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sent, setSent] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState<number | null>(null);

  useEffect(() => {
    getRecomendacionesAction().then(data => { setCatalog(data as Recom[]); setLoading(false); });
  }, []);

  const categories = [...new Set(catalog.map(r => r.categoria))].sort();
  const filtered = catalog.filter(r =>
    !filter || r.categoria === filter || r.titulo.toLowerCase().includes(filter.toLowerCase())
  );

  async function handleSend(r: Recom) {
    setSending(r.id);
    await enviarRecomendacionAction({ consulta_id: consultaId, recomendacion_id: r.id, recomendacion_texto: r.contenido });
    setSent(prev => new Set([...prev, r.id]));
    setSending(null);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Icon name="send" size={18} />
          </div>
          <h2 className="text-[14px] font-semibold text-slate-800">Recomendaciones</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter("")}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold border-0 transition-colors ${!filter ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            Todas
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold border-0 transition-colors ${filter === cat ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <Icon name="send" size={28} className="opacity-30 mx-auto mb-2" />
            <p className="text-[12px]">No hay recomendaciones disponibles</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(r => {
              const wasSent = sent.has(r.id);
              const isSending = sending === r.id;
              return (
                <div key={r.id} className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${wasSent ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{r.categoria}</span>
                      <span className="text-[12px] font-semibold text-slate-800">{r.titulo}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{r.contenido}</p>
                  </div>
                  <button
                    onClick={() => !wasSent && handleSend(r)}
                    disabled={wasSent || isSending}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border-0 shrink-0 transition-all ${wasSent
                        ? "bg-emerald-100 text-emerald-700 cursor-default"
                        : "bg-cyan-600 hover:bg-cyan-700 text-white"
                      } disabled:opacity-50`}
                  >
                    {isSending ? (
                      <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                    ) : wasSent ? (
                      <><Icon name="check" size={12} /> Enviada</>
                    ) : (
                      <><Icon name="send" size={12} /> Enviar</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
