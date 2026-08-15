'use client';

import type { ProofStage } from '../types';

export type PipelineStep = {
  step: number;
  label: string;
};

export const REPORT_PIPELINE_STEPS: PipelineStep[] = [
  { step: 1, label: 'Hash sealed' },
  { step: 2, label: 'Credential proven' },
  { step: 3, label: 'ZK proof generated' },
  { step: 4, label: 'Tx balanced' },
  { step: 5, label: 'On-chain' },
];

export function ProofProgress({
  stage,
  steps = REPORT_PIPELINE_STEPS,
}: {
  stage: ProofStage;
  steps?: PipelineStep[];
}) {
  const activeStep = Math.max(1, Math.min(steps.length, stage.step));
  const done = !stage.running;
  const showVerifiedCard =
    done && activeStep === steps.length && steps === REPORT_PIPELINE_STEPS;

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-mist">
          Proof pipeline
        </h3>
        {stage.error ? (
          <span className="text-xs font-semibold text-danger">{stage.error}</span>
        ) : stage.running ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-neon">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-neon" />
            {stage.label}
          </span>
        ) : (
          <span className="text-xs font-semibold text-emerald-400">
            {stage.label}
          </span>
        )}
      </div>

      <ol className="flex flex-wrap items-center gap-y-3">
        {steps.map((item, index) => {
          return (
            <li key={item.step} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-bold transition-colors ${
                    item.step < activeStep
                      ? 'border-neon/50 bg-neon/15 text-neon'
                      : item.step === activeStep
                        ? stage.error
                          ? 'border-danger/50 bg-danger/10 text-danger'
                          : 'animate-pulse-ring border-neon bg-neon/20 text-neon'
                        : 'border-edge bg-white/5 text-mist'
                  }`}
                >
                  {item.step < activeStep ? '✓' : item.step}
                </span>
                <span
                  className={`max-w-24 text-center text-[10px] font-medium leading-tight ${
                    item.step <= activeStep ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <span
                  className={`mx-2 mb-4 h-px w-6 sm:w-10 ${
                    item.step < activeStep ? 'bg-neon/60' : 'bg-edge'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      {showVerifiedCard && (
        <div className="mt-5 rounded-xl border border-neon/30 bg-neon/10 p-4 text-center">
          <p className="text-sm font-bold text-neon">
            ✓ PRIVACY PROOF VERIFIED
          </p>
          <p className="mt-1 text-xs text-slate-300">
            {stage.label}
          </p>
        </div>
      )}
    </div>
  );
}
