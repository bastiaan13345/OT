import { UploadStudio } from "@/components/upload/UploadStudio";
import { getUploadStudioData } from "@/lib/upload/data";

export const metadata = {
  title: "Upload - Infini",
};

export default async function AdminUploadPage() {
  const initialData = await getUploadStudioData();
  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-ink">Upload</h1>
      <UploadStudio initialData={initialData} />
    </div>
  );
}
