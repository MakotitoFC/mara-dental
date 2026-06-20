"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { updateAnotacionesAction } from "../actions";

interface Archivo {
  id: number;
  nombre_archivo: string;
  url: string;
  tipo_archivo: string;
  categoria: string;
  anotaciones?: any[];
  displayUrl?: string;
}

export function VisorModal({
  archivo: initialArchivo,
  todos,
  onClose,
  onNav,
}: {
  archivo: Archivo;
  todos: Archivo[];
  onClose: () => void;
  onNav: (a: Archivo) => void;
}) {
  const idx = todos.findIndex((x) => x.id === initialArchivo.id);
  const prev = idx > 0 ? todos[idx - 1] : null;
  const next = idx < todos.length - 1 ? todos[idx + 1] : null;

  const a = initialArchivo;
  const isImage = a.tipo_archivo === "imagen" || a.nombre_archivo.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const imgUrl = a.displayUrl || a.url;

  const [anotacionesState, setAnotacionesState] = useState<any[]>(a.anotaciones || []);
  const anotacionesRef = useRef<any[]>(a.anotaciones || []);
  const anotaciones = anotacionesState;
  
  function setAnotaciones(newArr: any[]) {
    anotacionesRef.current = newArr;
    setAnotacionesState(newArr);
  }

  const [mode, setMode] = useState<"view" | "pin" | "draw">("view");

  // Pins
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [pinNota, setPinNota] = useState("");
  const [hoveredAnn, setHoveredAnn] = useState<string | null>(null);
  const [annotationToDelete, setAnnotationToDelete] = useState<string | null>(null);

  // Draw
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const isDrawingRef = useRef(false);
  const strokeRef = useRef<{ x: number; y: number }[]>([]);
  const [color, setColor] = useState("#ef4444");

  const pines = anotaciones.filter((x) => x.type === "pin");
  const draws = anotaciones.filter((x) => x.type === "draw");

  useEffect(() => {
    setAnotaciones(initialArchivo.anotaciones || []);
    setMode("view");
    setPendingPin(null);
  }, [initialArchivo]);

  useEffect(() => {
    if (mode === "draw" || mode === "view") redrawCanvas();
  }, [anotaciones, mode]);

  function redrawCanvas() {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    draws.forEach((drawLayer) => {
      drawLayer.strokes?.forEach((stroke: any) => {
        if (!stroke.points || stroke.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width || 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        stroke.points.forEach((pt: any, i: number) => {
          // Convert percentages to absolute pixels
          const px = (pt.x / 100) * canvas.width;
          const py = (pt.y / 100) * canvas.height;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      });
    });
  }

  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  function handleUpdateDB(newArr: any[]) {
    setAnotaciones(newArr);
    a.anotaciones = newArr;
    
    // Ejecutar el action del lado del cliente como side effect sin bloquear
    updateAnotacionesAction(a.id, newArr).catch((err) => console.error(err));
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== "pin" || !isImage) return;
    if ((e.target as HTMLElement).closest("[data-pin]")) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x, y });
    setPinNota("");
  }

  async function savePin() {
    if (!pendingPin || !pinNota.trim()) return;
    const newAnn = {
      type: "pin",
      id: uid(),
      x: pendingPin.x,
      y: pendingPin.y,
      nota: pinNota.trim(),
      fecha: new Date().toISOString().split("T")[0],
    };
    handleUpdateDB([...anotacionesRef.current, newAnn]);
    setPendingPin(null);
    setPinNota("");
  }

  function deleteAnnotation(id: string) {
    setAnnotationToDelete(id);
  }

  function confirmDeleteAnnotation() {
    if (!annotationToDelete) return;
    handleUpdateDB(anotacionesRef.current.filter((x) => x.id !== annotationToDelete));
    setAnnotationToDelete(null);
  }

  // Mouse Draw Handlers
  function getCanvasPoint(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    // ensure within bounds 0-100%
    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    return { x, y };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    if (mode !== "draw") return;
    if (e.cancelable && e.type !== "touchstart") e.preventDefault(); // Evitar drag nativo
    const pt = getCanvasPoint(e);
    if (!pt) return;
    isDrawingRef.current = true;
    strokeRef.current = [pt];
  }

  function moveDraw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawingRef.current || mode !== "draw") return;
    const pt = getCanvasPoint(e);
    if (!pt) return;
    
    const lastPt = strokeRef.current[strokeRef.current.length - 1];
    strokeRef.current.push(pt);

    // render real time
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const px1 = (lastPt.x / 100) * canvas.width;
    const py1 = (lastPt.y / 100) * canvas.height;
    const px2 = (pt.x / 100) * canvas.width;
    const py2 = (pt.y / 100) * canvas.height;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(px1, py1);
    ctx.lineTo(px2, py2);
    ctx.stroke();
  }

  function endDraw() {
    if (!isDrawingRef.current || mode !== "draw") return;
    isDrawingRef.current = false;
    
    const stroke = [...strokeRef.current];
    strokeRef.current = [];
    
    if (stroke.length < 2) return;

    // A draw is a single layer of stroke
    const newDraw = {
      type: "draw",
      id: uid(),
      strokes: [{ color, width: 3, points: stroke }],
      fecha: new Date().toISOString().split("T")[0],
    };
    handleUpdateDB([...anotacionesRef.current, newDraw]);
  }

  function handleResizeCanvas() {
    if (!imgRef.current || !canvasRef.current) return;
    canvasRef.current.width = imgRef.current.clientWidth;
    canvasRef.current.height = imgRef.current.clientHeight;
    redrawCanvas();
  }

  async function forceDownload() {
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = a.nombre_archivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(imgUrl, "_blank");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 md:pb-4"
      style={{ background: "rgba(0,0,0,0.82)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden flex flex-col md:flex-row w-full shadow-2xl"
        style={{ maxWidth: 1000, maxHeight: "min(92vh, calc(100dvh - 96px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* VIEW PORT */}
        <div
          className="relative overflow-hidden min-h-45 h-[48vw] md:h-auto md:flex-1 flex items-center justify-center"
          style={{
            background: "#0f172a",
            cursor: mode === "pin" ? "crosshair" : mode === "draw" ? "crosshair" : "default",
          }}
        >
          {isImage && imgUrl ? (
            <div 
              ref={containerRef} 
              className="relative inline-block"
              onClick={handleImageClick}
              onMouseDown={startDraw}
              onMouseMove={moveDraw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={moveDraw}
              onTouchEnd={endDraw}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imgUrl}
                alt={a.nombre_archivo}
                className="max-w-full max-h-[85vh] object-contain select-none pointer-events-none"
                draggable={false}
                style={{ WebkitUserDrag: "none" }}
                onLoad={handleResizeCanvas}
              />
              
              <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ width: "100%", height: "100%" }}
              />

              {/* Pins existentes */}
              {pines.map((ann, i) => {
                const isHov = hoveredAnn === ann.id;
                return (
                  <div
                    key={ann.id}
                    data-pin="true"
                    className="absolute"
                    style={{
                      left: `${ann.x}%`,
                      top: `${ann.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 10,
                    }}
                    onMouseEnter={() => setHoveredAnn(ann.id)}
                    onMouseLeave={() => setHoveredAnn(null)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white select-none"
                      style={{
                        background: isHov ? "#ef4444" : "#0891b2",
                        border: "2.5px solid white",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                        transition: "background 0.15s",
                      }}
                    >
                      {i + 1}
                    </div>

                    {isHov && (
                      <div
                        className="absolute z-20 bg-white rounded-xl p-3 shadow-2xl"
                        style={{
                          left: ann.x > 70 ? "auto" : "34px",
                          right: ann.x > 70 ? "34px" : "auto",
                          top: ann.y > 70 ? "auto" : 0,
                          bottom: ann.y > 70 ? 0 : "auto",
                          width: 200,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[11px] font-semibold text-slate-700">Nota #{i + 1}</p>
                          <button onClick={() => deleteAnnotation(ann.id)} className="text-red-400 hover:text-red-600">
                            <Icon name="delete" size={14} />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{ann.nota}</p>
                        <p className="text-[9px] text-slate-400 mt-1.5">{ann.fecha}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pin pendiente */}
              {pendingPin && (
                <div
                  data-pin="true"
                  className="absolute"
                  style={{
                    left: `${pendingPin.x}%`,
                    top: `${pendingPin.y}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 20,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center animate-pulse"
                    style={{
                      background: "#f59e0b",
                      border: "2.5px solid white",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                    }}
                  >
                    <Icon name="add" size={12} className="text-white" />
                  </div>

                  <div
                    className="absolute z-30 bg-white rounded-2xl shadow-2xl p-3.5"
                    style={{
                      left: pendingPin.x > 65 ? "auto" : "34px",
                      right: pendingPin.x > 65 ? "34px" : "auto",
                      top: pendingPin.y > 65 ? "auto" : 0,
                      bottom: pendingPin.y > 65 ? 0 : "auto",
                      width: 220,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#f59e0b" }}>
                        <Icon name="pin_drop" size={9} className="text-white" />
                      </div>
                      <p className="text-[11px] font-semibold text-slate-700">Nueva anotación</p>
                    </div>
                    <textarea
                      autoFocus
                      rows={3}
                      value={pinNota}
                      onChange={(e) => setPinNota(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) savePin(); }}
                      placeholder="Describe la zona o hallazgo clínico…"
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-[11px] outline-none resize-none focus:border-cyan-400"
                      style={{ lineHeight: 1.5 }}
                    />
                    <p className="text-[9px] text-slate-400 mt-1 mb-2">Ctrl+Enter para guardar</p>
                    <div className="flex gap-1.5">
                      <button
                        onClick={savePin}
                        disabled={!pinNota.trim()}
                        className="flex-1 py-1.5 text-[11px] font-semibold text-white rounded-lg disabled:opacity-40 transition-opacity"
                        style={{ background: "#0891b2" }}
                      >
                        Guardar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingPin(null); }}
                        className="flex-1 py-1.5 text-[11px] font-medium text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full h-full justify-center p-4">
              {a.tipo_archivo === "pdf" ? (
                <iframe src={imgUrl} className="w-full h-full rounded-xl border-0 bg-white" title={a.nombre_archivo} />
              ) : (
                <>
                  <Icon name="description" size={40} className="text-slate-400" />
                  <p className="text-white font-medium text-[13px]">{a.nombre_archivo}</p>
                </>
              )}
            </div>
          )}

          {prev && (
            <button
              onClick={(e) => { e.stopPropagation(); onNav(prev); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
              style={{ zIndex: 5 }}
            >
              <Icon name="chevron_left" size={22} />
            </button>
          )}
          {next && (
            <button
              onClick={(e) => { e.stopPropagation(); onNav(next); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
              style={{ zIndex: 5 }}
            >
              <Icon name="chevron_right" size={22} />
            </button>
          )}

          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-white/50" style={{ zIndex: 5 }}>
            {idx + 1} / {todos.length}
          </span>
          
          {mode !== "view" && (
             <div
             className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white"
             style={{ background: mode === "draw" ? "rgba(239, 68, 68, 0.9)" : "rgba(8,145,178,0.9)", backdropFilter: "blur(4px)", zIndex: 5 }}
           >
             <Icon name={mode === "draw" ? "draw" : "pin_drop"} size={13} />
             {mode === "draw" ? "Modo Dibujo — arrastra sobre la imagen" : "Modo anotación — haz clic en la imagen"}
           </div>
          )}
        </div>

        {/* CONTROLES */}
        <div className="w-full md:w-64 md:shrink-0 flex flex-col border-t border-slate-100 md:border-t-0 md:border-l overflow-hidden flex-1 md:flex-none">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 gap-2">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 uppercase"
              style={{ background: "#f1f5f9", color: "#475569" }}
            >
              {a.tipo_archivo}
            </span>
            <button onClick={onClose} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">
              <Icon name="close" size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <p className="text-[12px] font-semibold text-slate-900 break-all">{a.nombre_archivo}</p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Icon name="category" size={14} /> {a.categoria}
            </div>

            {isImage && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => setMode(mode === "pin" ? "view" : "pin")}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-colors ${
                    mode === "pin" ? "bg-cyan-50 border-cyan-300 text-cyan-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon name="pin_drop" size={18} />
                  <span className="text-[10px] font-bold">Pines</span>
                </button>
                <button
                  onClick={() => setMode(mode === "draw" ? "view" : "draw")}
                  className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border transition-colors ${
                    mode === "draw" ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon name="draw" size={18} />
                  <span className="text-[10px] font-bold">Dibujar</span>
                </button>
              </div>
            )}
            
            {mode === "draw" && (
              <div className="flex items-center gap-2 mt-1 justify-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                {["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#ffffff", "#000000"].map(c => (
                  <button key={c} onClick={() => setColor(c)} className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110" style={{ background: c, borderColor: color === c ? "#0ea5e9" : "transparent", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
                ))}
              </div>
            )}

            {pines.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Pines ({pines.length})
                </p>
                <div className="flex flex-col gap-1.5">
                  {pines.map((ann, i) => {
                    const isHov = hoveredAnn === ann.id;
                    return (
                      <div
                        key={ann.id}
                        className="flex items-start gap-2 p-2.5 rounded-xl border transition-colors cursor-pointer"
                        style={{ borderColor: isHov ? "#7dd3fc" : "#f1f5f9", background: isHov ? "#f0f9ff" : "white" }}
                        onMouseEnter={() => setHoveredAnn(ann.id)}
                        onMouseLeave={() => setHoveredAnn(null)}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                          style={{ background: isHov ? "#ef4444" : "#0891b2", transition: "background 0.15s" }}
                        >
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-slate-700 leading-snug">{ann.nota}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{ann.fecha}</p>
                        </div>
                        <button onClick={() => deleteAnnotation(ann.id)} className="text-red-400 hover:text-red-600 opacity-50 hover:opacity-100">
                          <Icon name="delete" size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {draws.length > 0 && (
              <div className="mt-2">
                 <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Trazos de Dibujo ({draws.length})
                </p>
                <div className="flex flex-col gap-1">
                  {draws.map((d, i) => (
                    <div key={d.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[11px] text-slate-600">Trazo #{i + 1}</span>
                      <button onClick={() => deleteAnnotation(d.id)} className="text-red-400 hover:text-red-600">
                         <Icon name="delete" size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div className="p-4 border-t border-slate-100 flex flex-col gap-2">
            <button onClick={forceDownload} className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-[12px] text-slate-700 hover:bg-slate-50 transition-colors w-full">
              <Icon name="download" size={14} className="text-cyan-600" />
              Descargar Archivo Original
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de eliminación de anotación */}
      {annotationToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-xs w-full border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-3">
              <Icon name="warning" size={24} />
            </div>
            <h3 className="text-[15px] font-bold text-slate-800 mb-1">¿Borrar anotación?</h3>
            <p className="text-[12px] text-slate-500 mb-5">
              Esta acción eliminará el trazo o pin de forma permanente.
            </p>
            <div className="flex gap-2 w-full">
              <button onClick={() => setAnnotationToDelete(null)}
                className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmDeleteAnnotation}
                className="flex-1 py-2 rounded-xl text-[12px] font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
