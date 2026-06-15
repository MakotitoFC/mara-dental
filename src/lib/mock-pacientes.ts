import type { Paciente, NotaClinica } from "@/types/paciente";

export const PACIENTES_MOCK: Paciente[] = [
  {
    id: "p1",
    nombre: "María González López",
    dni: "12345678A",
    fecha_nacimiento: "1990-03-15",
    telefono: "+51 987 654 321",
    email: "maria.gonzalez@email.com",
    grupo_sanguineo: "O+",
    alergias: ["Penicilina"],
    antecedentes: ["Hipertensión arterial"],
    estado: "activo",
    ultima_visita: "2026-06-14",
    proxima_cita: "2026-07-10",
    notas: "Paciente muy puntual. Prefiere citas en la mañana.",
  },
  {
    id: "p2",
    nombre: "Carlos Ríos Mendoza",
    dni: "87654321B",
    fecha_nacimiento: "1985-07-22",
    telefono: "+51 912 345 678",
    email: "carlos.rios@email.com",
    grupo_sanguineo: "A+",
    alergias: [],
    antecedentes: [],
    estado: "activo",
    ultima_visita: "2026-06-14",
    proxima_cita: "2026-08-05",
  },
  {
    id: "p3",
    nombre: "Ana Torres Vidal",
    dni: "11223344C",
    fecha_nacimiento: "1978-11-08",
    telefono: "+51 945 678 901",
    email: "ana.torres@email.com",
    grupo_sanguineo: "B-",
    alergias: ["Penicilina", "Ibuprofeno"],
    antecedentes: ["Diabetes tipo 2", "Asma"],
    estado: "activo",
    ultima_visita: "2026-06-14",
    proxima_cita: "2026-06-28",
    notas: "Requiere glucómetro antes de procedimientos largos.",
  },
  {
    id: "p4",
    nombre: "Luis Vargas Castillo",
    dni: "55667788D",
    fecha_nacimiento: "1995-02-28",
    telefono: "+51 933 111 222",
    email: "luis.vargas@email.com",
    grupo_sanguineo: "AB+",
    alergias: [],
    antecedentes: [],
    estado: "activo",
    ultima_visita: "2026-06-14",
  },
  {
    id: "p5",
    nombre: "Rosa Méndez Paredes",
    dni: "99887766E",
    fecha_nacimiento: "2001-09-14",
    telefono: "+51 922 333 444",
    email: "rosa.mendez@email.com",
    grupo_sanguineo: "O-",
    alergias: [],
    antecedentes: [],
    estado: "activo",
    ultima_visita: "2026-06-14",
    proxima_cita: "2026-07-20",
  },
  {
    id: "p6",
    nombre: "Pedro Díaz Rojas",
    dni: "44332211F",
    fecha_nacimiento: "1972-05-30",
    telefono: "+51 955 777 888",
    email: "pedro.diaz@email.com",
    grupo_sanguineo: "A-",
    alergias: [],
    antecedentes: ["Hipertensión arterial"],
    estado: "activo",
    ultima_visita: "2026-06-13",
    proxima_cita: "2026-09-01",
  },
  {
    id: "p7",
    nombre: "Julia Flores Quispe",
    dni: "66554433G",
    fecha_nacimiento: "1993-12-01",
    telefono: "+51 966 999 000",
    email: "julia.flores@email.com",
    grupo_sanguineo: "B+",
    alergias: [],
    antecedentes: [],
    estado: "nuevo",
    proxima_cita: "2026-06-15",
  },
  {
    id: "p8",
    nombre: "Sandra Ruiz Torres",
    dni: "22334455H",
    fecha_nacimiento: "1988-04-17",
    telefono: "+51 977 222 333",
    email: "sandra.ruiz@email.com",
    grupo_sanguineo: "O+",
    alergias: ["Aspirina"],
    antecedentes: ["Gastritis crónica"],
    estado: "activo",
    ultima_visita: "2026-06-15",
    proxima_cita: "2026-07-15",
  },
  {
    id: "p9",
    nombre: "Kevin López Silva",
    dni: "77665544I",
    fecha_nacimiento: "2000-08-09",
    telefono: "+51 988 444 555",
    email: "kevin.lopez@email.com",
    grupo_sanguineo: "A+",
    alergias: [],
    antecedentes: [],
    estado: "nuevo",
    proxima_cita: "2026-06-16",
  },
  {
    id: "p10",
    nombre: "Nora Cruz Villanueva",
    dni: "33221100J",
    fecha_nacimiento: "1969-06-25",
    telefono: "+51 911 666 777",
    email: "nora.cruz@email.com",
    grupo_sanguineo: "AB-",
    alergias: [],
    antecedentes: ["Diabetes tipo 2", "Hipertensión arterial"],
    estado: "activo",
    ultima_visita: "2026-06-16",
    proxima_cita: "2026-07-02",
    notas: "Control de glucosa obligatorio antes de anestesia.",
  },
  {
    id: "p11",
    nombre: "Gustavo Ramos León",
    dni: "10293847K",
    fecha_nacimiento: "1982-01-12",
    telefono: "+51 944 888 999",
    email: "gustavo.ramos@email.com",
    grupo_sanguineo: "O+",
    alergias: [],
    antecedentes: [],
    estado: "inactivo",
    ultima_visita: "2025-11-20",
  },
  {
    id: "p12",
    nombre: "Carmen Vega Mora",
    dni: "09182736L",
    fecha_nacimiento: "1975-10-03",
    telefono: "+51 900 111 222",
    email: "carmen.vega@email.com",
    grupo_sanguineo: "B+",
    alergias: ["Penicilina"],
    antecedentes: ["Tiroides"],
    estado: "activo",
    ultima_visita: "2026-06-17",
    proxima_cita: "2026-08-12",
  },
];

export const NOTAS_MOCK: NotaClinica[] = [
  {
    id: "n1", paciente_id: "p1", fecha: "2026-06-14", medico: "Dr. García",
    tipo: "procedimiento", titulo: "Limpieza dental y profilaxis",
    descripcion: "Se realizó limpieza supragingival completa. Depósitos de sarro moderados en sector posteroinferior. Sangrado al sondaje en piezas 36 y 46.",
    tratamiento: "Detartraje ultrasónico + pulido coronal con pasta profiláctica.",
    medicacion: "Enjuague con clorhexidina 0.12% por 7 días.",
  },
  {
    id: "n2", paciente_id: "p1", fecha: "2026-03-10", medico: "Dr. García",
    tipo: "consulta", titulo: "Control de ortodoncia",
    descripcion: "Revisión mensual de aparatología fija. Buen avance en alineación del sector anterosuperior.",
    tratamiento: "Cambio de arco a 0.017x0.025 NiTi.",
  },
  {
    id: "n3", paciente_id: "p1", fecha: "2025-12-05", medico: "Dr. García",
    tipo: "consulta", titulo: "Consulta inicial y plan de tratamiento",
    descripcion: "Paciente acude por primera vez. Presenta apiñamiento leve superior e inferior. Caries oclusal en pieza 17.",
    tratamiento: "Plan: Ortodoncia + restauración pieza 17.",
  },
  {
    id: "n4", paciente_id: "p3", fecha: "2026-06-14", medico: "Dr. García",
    tipo: "procedimiento", titulo: "Extracción molar inferior",
    descripcion: "Extracción de pieza 46 con raíces convergentes. Procedimiento sin complicaciones. Control glucémico previo: 118 mg/dL.",
    tratamiento: "Extracción bajo anestesia (lidocaína al 2% sin vasoconstrictor por DM).",
    medicacion: "Amoxicilina 500mg c/8h × 5 días. Paracetamol 500mg c/6h según dolor (no ibuprofeno).",
  },
];

export function getPaciente(id: string): Paciente | undefined {
  return PACIENTES_MOCK.find((p) => p.id === id);
}

export function getNotasPaciente(id: string): NotaClinica[] {
  return NOTAS_MOCK.filter((n) => n.paciente_id === id).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function calcEdad(fechaNac: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

export function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  const meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}
