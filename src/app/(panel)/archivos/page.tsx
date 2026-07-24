import { Header } from "@/components/layout/Header";
import { ArchivosView } from "./components/ArchivosView";


export default async function ArchivosPage() {
  return (
    <>
      <Header title="Archivos Clínicos" />
      <div className="flex-1 overflow-y-auto">
        <ArchivosView />
      </div>
    </>
  );
}
