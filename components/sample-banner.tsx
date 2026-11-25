import { Chip } from "@heroui/react";

export function SampleBanner({ domain }: { domain: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3">
      <Chip color="accent" size="sm" variant="soft">
        Sample
      </Chip>
      <p className="text-sm text-muted">
        Showing labeled sample fixtures for {domain}. Drop real JSON under{" "}
        <code className="text-foreground">data/</code> to replace these numbers.
      </p>
    </div>
  );
}
