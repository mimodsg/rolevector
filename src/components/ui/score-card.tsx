import { Panel } from "./panel";
import { HelperText } from "./typography";

export function ScoreCard({
  label = "ATS Alignment",
  score,
  summary
}: {
  label?: string;
  score: string;
  summary: string;
}) {
  return (
    <Panel className="grid gap-4 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.2),transparent_46%),linear-gradient(145deg,var(--color-surface),rgba(30,41,59,0.78))]">
      <div>
        <h3 className="font-title text-xl uppercase text-rv-text">{label}</h3>
        <HelperText>Sample score component for job fit analysis.</HelperText>
      </div>
      <div className="flex items-center gap-4">
        <div className="grid aspect-square h-[88px] place-items-center rounded-full border-8 border-rv-accent font-title text-3xl font-medium text-rv-text">
          {score}
        </div>
        <div>
          <strong className="text-rv-text">Strong Match</strong>
          <HelperText>{summary}</HelperText>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-rv-bg">
        <div className="h-full w-[78%] rounded-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-highlight),var(--color-accent))]" />
      </div>
    </Panel>
  );
}
