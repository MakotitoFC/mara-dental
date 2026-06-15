import type { Cita } from "@/types/agenda";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function CITAS_MOCK(): Cita[] {
  const t   = toDateStr(new Date());
  const tm1 = toDateStr(addDays(new Date(), -1));
  const t1  = toDateStr(addDays(new Date(), 1));
  const t2  = toDateStr(addDays(new Date(), 2));
  const t3  = toDateStr(addDays(new Date(), 3));
  const t4  = toDateStr(addDays(new Date(), 4));

  return [
    { id:"1",  paciente_id:"p1",  paciente_nombre:"María González",  alergias:["Penicilina"],              tipo_consulta:"Limpieza dental",   doctor_nombre:"Dr. García", fecha:t,   hora_inicio:"08:30", hora_fin:"09:15", estado:"confirmada" },
    { id:"2",  paciente_id:"p2",  paciente_nombre:"Carlos Ríos",     alergias:[],                          tipo_consulta:"Ortodoncia",         doctor_nombre:"Dr. García", fecha:t,   hora_inicio:"10:00", hora_fin:"11:00", estado:"hecha"      },
    { id:"3",  paciente_id:"p3",  paciente_nombre:"Ana Torres",      alergias:["Penicilina","Ibuprofeno"], tipo_consulta:"Extracción molar",   doctor_nombre:"Dr. García", fecha:t,   hora_inicio:"11:30", hora_fin:"12:00", estado:"programada" },
    { id:"4",  paciente_id:"p4",  paciente_nombre:"Luis Vargas",     alergias:[],                          tipo_consulta:"Urgencia",           doctor_nombre:"Dr. García", fecha:t,   hora_inicio:"14:30", hora_fin:"15:30", estado:"confirmada" },
    { id:"5",  paciente_id:"p5",  paciente_nombre:"Rosa Méndez",     alergias:[],                          tipo_consulta:"Control ortodoncia", doctor_nombre:"Dr. García", fecha:t,   hora_inicio:"16:00", hora_fin:"16:30", estado:"cancelada"  },
    { id:"6",  paciente_id:"p6",  paciente_nombre:"Pedro Díaz",      alergias:[],                          tipo_consulta:"Blanqueamiento",     doctor_nombre:"Dr. García", fecha:tm1, hora_inicio:"09:00", hora_fin:"10:00", estado:"hecha"      },
    { id:"7",  paciente_id:"p7",  paciente_nombre:"Julia Flores",    alergias:[],                          tipo_consulta:"Endodoncia molar",   doctor_nombre:"Dr. García", fecha:t1,  hora_inicio:"09:00", hora_fin:"10:30", estado:"confirmada" },
    { id:"8",  paciente_id:"p8",  paciente_nombre:"Sandra Ruiz",     alergias:["Aspirina"],                tipo_consulta:"Ortodoncia",         doctor_nombre:"Dr. García", fecha:t1,  hora_inicio:"11:00", hora_fin:"11:30", estado:"programada" },
    { id:"9",  paciente_id:"p9",  paciente_nombre:"Kevin López",     alergias:[],                          tipo_consulta:"Profilaxis",         doctor_nombre:"Dr. García", fecha:t2,  hora_inicio:"08:00", hora_fin:"08:45", estado:"confirmada" },
    { id:"10", paciente_id:"p10", paciente_nombre:"Nora Cruz",       alergias:[],                          tipo_consulta:"Urgencia",           doctor_nombre:"Dr. García", fecha:t2,  hora_inicio:"14:00", hora_fin:"15:00", estado:"confirmada" },
    { id:"11", paciente_id:"p11", paciente_nombre:"Gustavo Ramos",   alergias:[],                          tipo_consulta:"Blanqueamiento",     doctor_nombre:"Dr. García", fecha:t3,  hora_inicio:"10:00", hora_fin:"11:00", estado:"programada" },
    { id:"12", paciente_id:"p12", paciente_nombre:"Carmen Vega",     alergias:["Penicilina"],              tipo_consulta:"Implante dental",    doctor_nombre:"Dr. García", fecha:t4,  hora_inicio:"09:00", hora_fin:"11:00", estado:"programada" },
  ];
}
