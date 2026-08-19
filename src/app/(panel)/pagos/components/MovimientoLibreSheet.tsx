"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { registrarMovimientoLibreAction, searchProveedoresAction, searchClientesPagoAction } from "../caja.actions";

export function MovimientoLibreSheet({
  cajaId, categoriasIngreso, categoriasEgreso, mediosPago, tiposMoneda, onClose
}: {
  cajaId: string;
  categoriasIngreso: { id: number; nombre: string }[];
  categoriasEgreso: { id: number; nombre: string }[];
  mediosPago: { id: number; nombre: string }[];
  tiposMoneda: { id: number; moneda: string }[];
  onClose: () => void;
}) {
  const [tipo, setTipo] = useState<"E" | "I">("E"); // I = Ingreso, E = Egreso
  const [monto, setMonto] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [medioPagoId, setMedioPagoId] = useState(mediosPago[0] ? String(mediosPago[0].id) : "");
  const [monedaId, setMonedaId] = useState(tiposMoneda.find(m => m.moneda === "PEN") ? String(tiposMoneda.find(m => m.moneda === "PEN")?.id) : "1");
  const [referencia, setReferencia] = useState("");
  const [observacion, setObservacion] = useState("");
  
  // Proveedores State (Egresos)
  const [proveedorSearch, setProveedorSearch] = useState("");
  const [proveedoresOptions, setProveedoresOptions] = useState<any[]>([]);
  const [selectedProveedor, setSelectedProveedor] = useState<{ id?: string; nombre: string; ruc?: string; telefono?: string; email?: string } | null>(null);
  const [isNewProveedor, setIsNewProveedor] = useState(false);
  const [searchingProv, setSearchingProv] = useState(false);

  // Clientes State (Ingresos)
  const [clienteSearch, setClienteSearch] = useState("");
  const [clientesOptions, setClientesOptions] = useState<any[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<{ id?: number; nombres: string; apellidos: string; tipo_documento: string; numero_documento: string } | null>(null);
  const [isNewCliente, setIsNewCliente] = useState(false);
  const [searchingCli, setSearchingCli] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const provTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cliTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initial select setup
  useEffect(() => {
    if (tipo === "E" && categoriasEgreso.length > 0) setCategoriaId(String(categoriasEgreso[0].id));
    if (tipo === "I" && categoriasIngreso.length > 0) setCategoriaId(String(categoriasIngreso[0].id));
  }, [tipo, categoriasEgreso, categoriasIngreso]);

  useEffect(() => {
    if (!proveedorSearch || selectedProveedor?.nombre === proveedorSearch) {
      setProveedoresOptions([]);
      return;
    }
    if (provTimeoutRef.current) clearTimeout(provTimeoutRef.current);
    provTimeoutRef.current = setTimeout(async () => {
      setSearchingProv(true);
      const res = await searchProveedoresAction(proveedorSearch);
      setProveedoresOptions(res);
      setSearchingProv(false);
    }, 400);
    return () => { if (provTimeoutRef.current) clearTimeout(provTimeoutRef.current); };
  }, [proveedorSearch, selectedProveedor]);

  // Async Search Clientes
  useEffect(() => {
    if (!clienteSearch || selectedCliente?.nombres === clienteSearch) {
      setClientesOptions([]);
      return;
    }
    if (cliTimeoutRef.current) clearTimeout(cliTimeoutRef.current);
    cliTimeoutRef.current = setTimeout(async () => {
      setSearchingCli(true);
      const res = await searchClientesPagoAction(clienteSearch);
      setClientesOptions(res);
      setSearchingCli(false);
    }, 400);
    return () => { if (cliTimeoutRef.current) clearTimeout(cliTimeoutRef.current); };
  }, [clienteSearch, selectedCliente]);

  const handleGuardar = async () => {
    const m = Number(monto);
    if (!m || m <= 0) { setError("Ingrese un monto válido"); return; }
    if (!categoriaId) { setError("Seleccione una categoría"); return; }
    if (!medioPagoId) { setError("Seleccione un medio de pago"); return; }
    
    if (tipo === "E" && isNewProveedor) {
      if (!selectedProveedor?.nombre) { setError("Ingrese el nombre del proveedor"); return; }
    }
    if (tipo === "I" && isNewCliente) {
      if (!selectedCliente?.nombres || !selectedCliente?.apellidos) { setError("Ingrese nombres y apellidos del cliente"); return; }
    }

    setSaving(true);
    setError("");

    const payload = {
      caja_turno_id: cajaId,
      tipo,
      monto: m,
      categoria_id: parseInt(categoriaId),
      medio_pago_id: parseInt(medioPagoId),
      tipo_moneda_id: parseInt(monedaId),
      proveedor: tipo === "E" && selectedProveedor ? selectedProveedor : undefined,
      cliente_pago: tipo === "I" && selectedCliente ? selectedCliente : undefined,
      referencia,
      observacion
    };

    const res = await registrarMovimientoLibreAction(payload);
    setSaving(false);

    if (res.error) setError(res.error);
    else onClose();
  };

  const fechaActual = new Date().toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });

  return (
    <ResponsiveSheet
      onClose={onClose}
      title="Registrar Movimiento Libre"
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <p className="text-[11.5px] text-red-600 dark:text-red-400 font-medium flex items-center gap-1.5">
              <Icon name="warning" size={13} /> {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={saving}
              className={`flex-1 h-11 flex items-center justify-center gap-2 rounded-xl text-white text-[13px] font-semibold transition-colors disabled:opacity-50 ${tipo === "E" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              <Icon name={tipo === "E" ? "remove_circle_outline" : "add_circle_outline"} size={15} />
              {saving ? "Guardando…" : (tipo === "E" ? "Registrar Egreso" : "Registrar Ingreso")}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setTipo("E")}
            className={`flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-colors ${tipo === "E" ? "bg-white dark:bg-slate-700 text-red-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Egreso (Salida)
          </button>
          <button
            onClick={() => setTipo("I")}
            className={`flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-colors ${tipo === "I" ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Ingreso Libre
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Monto</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-slate-400">S/</span>
              <input
                type="number" step="0.01" min="0"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl pl-8 pr-3 py-2 text-[13px] outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Moneda</label>
            <Select
              value={monedaId}
              onChange={setMonedaId}
              options={tiposMoneda.map(m => ({ value: String(m.id), label: m.moneda }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Categoría</label>
            <Select
              value={categoriaId}
              onChange={setCategoriaId}
              options={(tipo === "E" ? categoriasEgreso : categoriasIngreso).map(c => ({ value: String(c.id), label: c.nombre }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Medio de Pago</label>
            <Select
              value={medioPagoId}
              onChange={setMedioPagoId}
              options={mediosPago.map(m => ({ value: String(m.id), label: m.nombre }))}
            />
          </div>
        </div>

        {tipo === "E" && (
          <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide">Proveedor (Opcional)</label>
              {!selectedProveedor && !isNewProveedor && (
                <button onClick={() => setIsNewProveedor(true)} className="text-[10.5px] font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
                  <Icon name="add" size={12} /> Nuevo Proveedor
                </button>
              )}
              {(selectedProveedor || isNewProveedor) && (
                <button onClick={() => { setSelectedProveedor(null); setIsNewProveedor(false); setProveedorSearch(""); }} className="text-[10.5px] font-semibold text-red-500 hover:text-red-600">
                  Descartar / Cambiar
                </button>
              )}
            </div>

            {!selectedProveedor && !isNewProveedor ? (
              <div className="relative">
                <input
                  placeholder="Buscar por Nombre o RUC..."
                  value={proveedorSearch}
                  onChange={e => setProveedorSearch(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 pl-8 text-[13px] outline-none focus:border-cyan-400"
                />
                <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                {searchingProv && <Icon name="progress_activity" size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                
                {proveedoresOptions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-10 overflow-hidden">
                    {proveedoresOptions.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedProveedor({ id: p.id, nombre: p.nombre, ruc: p.ruc });
                          setProveedorSearch(p.nombre);
                          setProveedoresOptions([]);
                        }}
                        className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0"
                      >
                        <p className="font-semibold">{p.nombre}</p>
                        {p.ruc && <p className="text-[10.5px] text-slate-500">RUC: {p.ruc}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : isNewProveedor ? (
              <div className="grid grid-cols-2 gap-3 mt-1">
                <input
                  placeholder="Razón Social / Empresa *"
                  value={selectedProveedor?.nombre || ""}
                  onChange={e => setSelectedProveedor(prev => ({ ...prev, nombre: e.target.value }))}
                  className="col-span-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400"
                />
                <input
                  placeholder="RUC"
                  value={selectedProveedor?.ruc || ""}
                  onChange={e => setSelectedProveedor(prev => ({ ...prev, ruc: e.target.value, nombre: prev?.nombre || "" }))}
                  className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400"
                />
                <input
                  placeholder="Teléfono"
                  value={selectedProveedor?.telefono || ""}
                  onChange={e => setSelectedProveedor(prev => ({ ...prev, telefono: e.target.value, nombre: prev?.nombre || "" }))}
                  className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400"
                />
                <input
                  placeholder="Email"
                  value={selectedProveedor?.email || ""}
                  onChange={e => setSelectedProveedor(prev => ({ ...prev, email: e.target.value, nombre: prev?.nombre || "" }))}
                  className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400"
                />
              </div>
            ) : (
              <div className="px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2">
                <Icon name="check_circle" size={16} className="text-emerald-500" />
                <div>
                  <p className="text-[13px] font-semibold">{selectedProveedor?.nombre}</p>
                  {selectedProveedor?.ruc && <p className="text-[11px] text-slate-500">RUC: {selectedProveedor.ruc}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {tipo === "I" && (
          <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide">Cliente (Opcional)</label>
              {!selectedCliente && !isNewCliente && (
                <button onClick={() => { setIsNewCliente(true); setSelectedCliente({ nombres: "", apellidos: "", tipo_documento: "DNI", numero_documento: "" }); }} className="text-[10.5px] font-semibold text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
                  <Icon name="add" size={12} /> Nuevo Cliente
                </button>
              )}
              {(selectedCliente || isNewCliente) && (
                <button onClick={() => { setSelectedCliente(null); setIsNewCliente(false); setClienteSearch(""); }} className="text-[10.5px] font-semibold text-red-500 hover:text-red-600">
                  Descartar / Cambiar
                </button>
              )}
            </div>

            {!selectedCliente && !isNewCliente ? (
              <div className="relative">
                <input
                  placeholder="Buscar por Nombre, Apellidos o Documento..."
                  value={clienteSearch}
                  onChange={e => setClienteSearch(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 pl-8 text-[13px] outline-none focus:border-cyan-400"
                />
                <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                {searchingCli && <Icon name="progress_activity" size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                
                {clientesOptions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-10 overflow-hidden">
                    {clientesOptions.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCliente({ 
                            id: c.id, 
                            nombres: c.nombre, 
                            apellidos: c.apellidos, 
                            tipo_documento: c.dni ? "DNI" : c.pasaporte ? "Pasaporte" : c.carnet_extranjeria ? "CE" : "DNI",
                            numero_documento: c.dni || c.pasaporte || c.carnet_extranjeria || ""
                          });
                          setClienteSearch(`${c.nombre} ${c.apellidos}`);
                          setClientesOptions([]);
                        }}
                        className="w-full text-left px-3 py-2 text-[12.5px] hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0"
                      >
                        <p className="font-semibold">{c.nombre} {c.apellidos}</p>
                        {(c.dni || c.pasaporte || c.carnet_extranjeria) && <p className="text-[10.5px] text-slate-500">Doc: {c.dni || c.pasaporte || c.carnet_extranjeria}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : isNewCliente ? (
              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className="col-span-2 grid grid-cols-3 gap-3">
                  <Select
                    value={selectedCliente?.tipo_documento || "DNI"}
                    onChange={val => setSelectedCliente(prev => ({ ...prev!, tipo_documento: val }))}
                    options={[
                      { value: "DNI", label: "DNI" },
                      { value: "CE", label: "CE" },
                      { value: "Pasaporte", label: "Pasaporte" },
                    ]}
                  />
                  <input
                    placeholder="Nro. Documento"
                    value={selectedCliente?.numero_documento || ""}
                    onChange={e => setSelectedCliente(prev => ({ ...prev!, numero_documento: e.target.value }))}
                    className="col-span-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400"
                  />
                </div>
                <input
                  placeholder="Nombres *"
                  value={selectedCliente?.nombres || ""}
                  onChange={e => setSelectedCliente(prev => ({ ...prev!, nombres: e.target.value }))}
                  className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400"
                />
                <input
                  placeholder="Apellidos *"
                  value={selectedCliente?.apellidos || ""}
                  onChange={e => setSelectedCliente(prev => ({ ...prev!, apellidos: e.target.value }))}
                  className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400"
                />
              </div>
            ) : (
              <div className="px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2">
                <Icon name="check_circle" size={16} className="text-emerald-500" />
                <div>
                  <p className="text-[13px] font-semibold">{selectedCliente?.nombres} {selectedCliente?.apellidos}</p>
                  {selectedCliente?.numero_documento && <p className="text-[11px] text-slate-500">Doc: {selectedCliente.numero_documento}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Referencia</label>
          <input
            value={referencia}
            onChange={e => setReferencia(e.target.value)}
            placeholder="Boleta, factura, ticket..."
            className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Observaciones</label>
          <textarea
            rows={2}
            value={observacion}
            onChange={e => setObservacion(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-cyan-400 resize-none"
          />
        </div>
        
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 justify-end">
          <Icon name="calendar_month" size={13} />
          <span>{fechaActual}</span>
        </div>
      </div>
    </ResponsiveSheet>
  );
}
