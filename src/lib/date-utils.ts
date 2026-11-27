/** Convierte un texto de fecha a `Date` sin correr el día. Una fecha de solo
 * día ("1990-08-01") se lee como UTC con `new Date(...)`, y en zonas con
 * desfase negativo (Perú, UTC−5) pasa a ser el día anterior a las 19:00; aquí
 * se interpreta como fecha LOCAL. Los textos con hora (timestamps) se parsean
 * igual que antes. */
export function parseFechaLocal(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
}

export function calcEdad(fechaNac: string): number {
  const hoy = new Date();
  const nac = parseFechaLocal(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

export function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}
