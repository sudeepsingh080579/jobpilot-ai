import Link from "next/link";
import { Check } from "lucide-react";
import type { JourneyStepView } from "@/lib/journey";
import { cn } from "@/lib/utils";

const tints = ["bg-indigo text-white", "bg-teal text-white", "bg-coral text-white", "bg-sun text-ink", "bg-violet text-white", "bg-indigo-deep text-white"];

export function JourneyStepper({ steps }: { steps: JourneyStepView[] }) {
  return (
    <ol data-testid="journey-stepper" className="flex gap-2 overflow-x-auto pb-1">
      {steps.map((step, index) => (
        <li key={step.id} className="min-w-[4.5rem] flex-1">
          <Link href={step.href} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "grid h-11 w-11 place-items-center rounded-full text-sm font-bold",
                tints[index],
                step.status === "upcoming" && "opacity-40",
                step.status === "current" && "ring-4 ring-white ring-offset-2 ring-offset-canvas",
              )}
            >
              {step.status === "done" ? <Check className="h-5 w-5" /> : index + 1}
            </span>
            <span className={cn("text-center text-xs font-semibold", step.status === "current" ? "text-ink" : "text-muted")}>{step.short}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function StepScreen({
  stepId,
  steps,
  title,
  helper,
  children,
}: {
  stepId: string;
  steps: JourneyStepView[];
  title: string;
  helper: string;
  children: React.ReactNode;
}) {
  const index = steps.findIndex((step) => step.id === stepId);
  const next = steps[index + 1];
  return (
    <div className="mx-auto max-w-xl" data-testid={`step-${stepId}`}>
      <JourneyStepper steps={steps} />
      <h1 className="mt-6 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-base leading-7 text-muted">{helper}</p>
      <div className="mt-6 space-y-4">{children}</div>
      <Link
        href={next?.href ?? "/dashboard"}
        data-testid="step-next"
        className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-indigo text-lg font-bold text-white"
      >
        {next ? "Next" : "Back home"}
      </Link>
    </div>
  );
}
