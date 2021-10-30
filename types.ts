export type TrajPoint = [number, number, number];

export type MovementTrace = {
  meta: {
    pilot: string;
    date: string;
    location: string;
  };
  path: TrajPoint[];
  timestamps: number[];
};

export type EnrichedMovementTrace = MovementTrace & {
  speeds: number[];
};
