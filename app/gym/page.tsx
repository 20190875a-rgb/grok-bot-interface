import { BodyReportsPanel } from "@/components/body-reports-panel";
import { GymMuscleHeatmap } from "@/components/gym-muscle-heatmap";
import { GymNextSession } from "@/components/gym-next-session";
import { GymSessionsTable } from "@/components/gym-sessions-table";
import { SampleBanner } from "@/components/sample-banner";
import { loadGymData } from "@/lib/gym";

export default async function GymPage() {
  const gym = await loadGymData();
  const { sessions, bodyReports, nextSession, muscleMap } = gym.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gym</h1>
        <p className="mt-1 text-muted">
          Next session, muscle heatmap, session timeline, body reports.
        </p>
      </div>
      {gym.source === "sample" ? <SampleBanner domain="Gym Buddy" /> : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Next session</h2>
        <GymNextSession nextSession={nextSession} />
      </section>
      <GymMuscleHeatmap muscleMap={muscleMap} sessions={sessions} />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Sessions</h2>
        <GymSessionsTable sessions={sessions} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Body reports</h2>
        <BodyReportsPanel reports={bodyReports} />
      </section>
    </div>
  );
}
