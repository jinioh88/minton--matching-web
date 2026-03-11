"use client";

type ActivitySummaryProps = {
  hostedCount?: number;
  joinedCount?: number;
  penaltyCount?: number;
};

export const ActivitySummary = ({
  hostedCount = 0,
  joinedCount = 0,
  penaltyCount = 0,
}: ActivitySummaryProps) => {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">
        활동 요약
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{hostedCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            내가 만든 매칭
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{joinedCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            참여한 매칭
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{penaltyCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">패널티</p>
        </div>
      </div>
    </section>
  );
};
