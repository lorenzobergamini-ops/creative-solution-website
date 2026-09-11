import type { Metadata } from "next";
import { ProjectForm } from "@/components/admin/ProjectForm";

export const metadata: Metadata = {
  title: "Nuovo progetto",
};

/** /admin/galleria/nuovo — create a gallery project. */
export default function AdminGalleryNewPage() {
  return <ProjectForm />;
}