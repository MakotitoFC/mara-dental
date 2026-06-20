"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { searchCatalogoAction, saveTratamientoAction, deleteTratamientoAction, editTratamientoAction } from "../actions";

interface Tratamiento {
  id: number;
  catalogo_tratamiento_id?: number;
  nombre: string;
  precio: number;
  moneda: string;
  notas?: string;
}

export function TratamientoSection({
  diagnosticoId,
  consultaId,
  initial,
  enabled = true,
}: { diagnosticoId: number; consultaId: number; initial: Tratamiento[]; enabled?: boolean }) {
  const [items, setItems] = useState<Tratamiento[]>(initial);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuery, setEditQuery] = useState("");
  const [editResults, setEditResults] = useState<any[]>([]);
  const [editSelected, setEditSelected] = useState<any | null>(null);
  const [editNotas, setEditNotas] = useState("");
  const [editSearching, setEditSearching] = useState(false);

  async function handleSearch(q: string, isEdit = false) {
    if (isEdit) {
      setEditQuery(q);
      if (q.length < 2) { setEditResults([]); return; }
      setEditSearching(true);
      const res = await searchCatalogoAction(q);
      setEditResults(res);
      setEditSearching(false);
    } else {
      setQuery(q);
      if (q.length < 2) { setResults([]); return; }
      setSearching(true);
      const res = await searchCatalogoAction(q);
      setResults(res);
      setSearching(false);
    }
  }

  function startEdit(item: Tratamiento) {
    setEditingId(item.id);
    setEditSelected({ id: item.catalogo_tratamiento_id, nombre: item.nombre, precio: item.precio, moneda: item.moneda });
    setEditQuery("");
    setEditNotas(item.notas || "");
  }

  async function handleEdit() {
    if (!editingId || !editSelected) return;
    setSaving(true);
    const res = await editTratamientoAction({
      id: editingId,
      catalogo_id: editSelected.id,
      notas: editNotas,
      consulta_id: consultaId
    });
    setSaving(false);
    if (!res?.error) {
      setItems(prev => prev.map(i => i.id === editingId ? { ...i, catalogo_tratamiento_id: editSelected.id, nombre: editSelected.nombre, precio: editSelected.precio, moneda: editSelected.moneda, notas: editNotas } : i));
      setEditingId(null);
    }
  }

  async function handleAdd() {
    if (!selected) return;
    setSaving(true);
    const res = await saveTratamientoAction({ diagnostico_id: diagnosticoId, catalogo_id: selected.id, notas, consulta_id: consultaId });
    setSaving(false);
    if (!res?.error) {
      setItems(prev => [...prev, { id: Date.now(), catalogo_tratamiento_id: selected.id, nombre: selected.nombre, precio: selected.precio, moneda: selected.moneda, notas }]);
      setAdding(false); setSelected(null); setQuery(""); setNotas(""); setResults([]);
    }
  }

  async function handleDelete(id: number) {
    await deleteTratamientoAction(id, consultaId);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const total = items.reduce((s, t) => s + (t.precio ?? 0), 0);

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden relative ${enabled ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
      {!enabled && (
        <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-2xl">
          <Icon name="lock" size={22} className="text-slate-400" />
          <p className="text-[12px] font-semibold text-slate-500">Disponible con diagnóstico definitivo</p>
        </div>
      )}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Icon name="healing" size={18} />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-slate-800">Tratamientos</h2>
            {items.length > 0 && (
              <p className="text-[10px] text-slate-400">Total: S/ {total.toFixed(2)}</p>
            )}
          </div>
        </div>
        <button onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1 text-[12px] font-medium text-cyan-600 hover:text-cyan-700 transition-colors border-0">
          <Icon name={adding ? "remove" : "add"} size={16} />
          {adding ? "Cancelar" : "Agregar"}
        </button>
      </div>

      <div className="p-5 flex flex-col gap-3">
        {adding && (
          <div className="border border-cyan-200 bg-cyan-50/40 rounded-xl p-4 flex flex-col gap-3">
            <div className="relative">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Buscar en catálogo *</label>
              {selected ? (
                <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50 rounded-xl px-3 py-2">
                  <div>
                    <p className="text-[13px] font-semibold text-emerald-800">{selected.nombre}</p>
                    <p className="text-[11px] text-emerald-600">S/ {Number(selected.precio).toFixed(2)}</p>
                  </div>
                  <button onClick={() => { setSelected(null); setQuery(""); }} className="text-emerald-500 hover:text-emerald-700 border-0">
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Icon name="search" size={15} className="absolute left-3 top-2.5 text-slate-400" />
                    <input value={query} onChange={e => handleSearch(e.target.value)}
                      placeholder="Ej. Limpieza dental, Blanqueamiento…"
                      className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[13px] outline-none focus:border-cyan-400 bg-white" />
                    {searching && <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />}
                  </div>
                  {results.length > 0 && (
                    <div className="absolute left-4 right-4 top-[100%] mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-44 overflow-y-auto">
                      {results.map(r => (
                        <button key={r.id} onClick={() => { setSelected(r); setResults([]); setQuery(""); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col gap-0.5">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[13px] text-slate-800 font-medium">{r.nombre}</span>
                            <span className="text-[12px] text-slate-500 font-mono">S/ {Number(r.precio).toFixed(2)}</span>
                          </div>
                          {r.descripcion && <span className="text-[11px] text-slate-500 line-clamp-1">{r.descripcion}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Notas</label>
              <textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones del tratamiento..."
                className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-cyan-400 resize-none bg-white" />
            </div>
            <div className="flex justify-end">
              <button onClick={handleAdd} disabled={saving || !selected}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[12px] font-semibold border-0 transition-colors">
                <Icon name="check" size={14} /> {saving ? "Guardando…" : "Agregar tratamiento"}
              </button>
            </div>
          </div>
        )}

        {items.length === 0 && !adding ? (
          <div className="py-8 text-center text-slate-400">
            <Icon name="healing" size={28} className="opacity-30 mx-auto mb-2" />
            <p className="text-[12px]">Sin tratamientos registrados</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                <Icon name="check_circle" size={16} />
              </div>
              
              {editingId === item.id ? (
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  <div className="relative">
                    {editSelected ? (
                      <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50 rounded-xl px-3 py-2">
                        <div>
                          <p className="text-[13px] font-semibold text-emerald-800">{editSelected.nombre}</p>
                          <p className="text-[11px] text-emerald-600">S/ {Number(editSelected.precio).toFixed(2)}</p>
                        </div>
                        <button onClick={() => { setEditSelected(null); setEditQuery(""); }} className="text-emerald-500 hover:text-emerald-700 border-0">
                          <Icon name="close" size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Icon name="search" size={15} className="absolute left-3 top-2.5 text-slate-400" />
                          <input value={editQuery} onChange={e => handleSearch(e.target.value, true)}
                            placeholder="Buscar para reemplazar..."
                            className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[13px] outline-none focus:border-cyan-400 bg-white" />
                          {editSearching && <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />}
                        </div>
                        {editResults.length > 0 && (
                          <div className="absolute left-0 right-0 top-[100%] mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-44 overflow-y-auto">
                            {editResults.map(r => (
                              <button key={r.id} onClick={() => { setEditSelected(r); setEditResults([]); setEditQuery(""); }}
                                className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col gap-0.5">
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-[13px] text-slate-800 font-medium">{r.nombre}</span>
                                  <span className="text-[12px] text-slate-500 font-mono">S/ {Number(r.precio).toFixed(2)}</span>
                                </div>
                                {r.descripcion && <span className="text-[11px] text-slate-500 line-clamp-1">{r.descripcion}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <textarea rows={2} value={editNotas} onChange={e => setEditNotas(e.target.value)} placeholder="Notas"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-cyan-400 resize-none bg-white" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} disabled={saving} className="text-slate-500 hover:text-slate-700 font-medium text-[12px] px-2 py-1 transition-colors">Cancelar</button>
                    <button onClick={handleEdit} disabled={saving || !editSelected} className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors">
                      <Icon name="check" size={13} /> Guardar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-slate-800">{item.nombre}</span>
                      <span className="text-[12px] font-mono font-semibold text-slate-600 shrink-0">S/ {Number(item.precio).toFixed(2)}</span>
                    </div>
                    {item.notas && <p className="text-[11px] text-slate-500 mt-0.5">{item.notas}</p>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => startEdit(item)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200 text-slate-400 hover:text-slate-600 border-0 transition-colors">
                      <Icon name="edit" size={14} />
                    </button>
                    <button onClick={() => handleDelete(item.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500 border-0 transition-colors">
                      <Icon name="delete" size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
