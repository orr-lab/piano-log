import { RecordingForm } from "@/components/recording-form";

export default function NewRecordingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Log a new take</h1>
        <p className="text-muted-foreground">Capture how this run went while it&apos;s fresh.</p>
      </div>
      <RecordingForm mode="create" />
    </div>
  );
}
