import { UploadPreferencesForm } from "@/components/settings/UploadPreferencesForm";
import { getUploadSettingsData } from "@/lib/upload/data";

export default async function UploadSettingsPage() {
  const { concurrency, presets, error } = await getUploadSettingsData();

  return (
    <main className="min-h-full bg-canvas px-4 py-8 sm:p-8">
      <UploadPreferencesForm concurrency={concurrency} presets={presets} error={error} />
    </main>
  );
}
