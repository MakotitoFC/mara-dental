// Utilidades compartidas para avatares con color/iniciales determinísticos por id.
// Antes vivían copiadas (hash*31+charCode + paleta propia) en doctorColors.ts,
// PacientesView.tsx y PagosView.tsx — unificadas aquí para no divergir.

export function hashToIndex(id: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % modulo;
}

export function getInitials(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase();
}

// Paleta compartida para avatares de persona (pacientes, movimientos de pago) —
// ver mara-dental-design-spec.md sección 2.4.
export const AVATAR_PALETTE = [
 { bg: "bg-cyan-100", text: "text-cyan-700"},
 { bg: "bg-emerald-100", text: "text-emerald-700"},
 { bg: "bg-amber-100", text: "text-amber-700"},
 { bg: "bg-slate-200", text: "text-slate-700"},
 { bg: "bg-blue-100", text: "text-blue-700"},
 { bg: "bg-cyan-50", text: "text-cyan-600"},
 { bg: "bg-emerald-50", text: "text-emerald-600"},
 { bg: "bg-amber-50", text: "text-amber-600"},
] as const;

export function avatarStyle(id: string) {
  return AVATAR_PALETTE[hashToIndex(id, AVATAR_PALETTE.length)];
}

// Paleta curada de marca (tonos derivados del cian) para avatares de doctor —
// usada como hex plano porque se aplica vía inline style (eventos de calendario,
// badges de médico), no como clases Tailwind.
export const DOCTOR_AVATAR_COLORS = ["#0A8EA0", "#0D7377", "#1D95A0", "#073D42"];

export function hashDoctorColor(doctorId: string): string {
  return DOCTOR_AVATAR_COLORS[hashToIndex(doctorId, DOCTOR_AVATAR_COLORS.length)];
}

export function getDoctorVars(doctorId: string): { solid: string; bg: string; text: string } {
  const hex = hashDoctorColor(doctorId);
  return { solid: hex, bg: `${hex}26`, text: hex };
}
