import { AccountBankroll } from "@/components/account-bankroll";
import { PredictionsMatrix } from "@/components/predictions-matrix";
import { SampleBanner } from "@/components/sample-banner";
import { formatDateTime } from "@/lib/dates";
import { loadPredictionsData } from "@/lib/predictions";

export default async function PredictionsPage() {
  const loaded = await loadPredictionsData();
  const { accounts, columns, rows, asOf } = loaded.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Predictions</h1>
        <p className="mt-1 text-muted">
          City × horizon accounts, last three target dates, and bankroll.
          {asOf ? ` As of ${formatDateTime(asOf)}.` : null}
        </p>
      </div>
      {loaded.source === "sample" ? <SampleBanner domain="weather-sim" /> : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Bankroll</h2>
        <AccountBankroll accounts={accounts} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Prediction matrix</h2>
        <PredictionsMatrix columns={columns} rows={rows} />
      </section>
    </div>
  );
}
