import { Topbar } from "@/components/layout/Topbar";
import { ArchivosView } from "./components/ArchivosView";


export default async function ArchivosPage() {
  return (
    <>
      <Topbar title="Archivos Clínicos" />
      <div className="flex-1 overflow-y-auto">
        <ArchivosView />
      </div>
    </>
  );
}
