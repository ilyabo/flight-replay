export type TrajPoint = [number, number, number];

export type MovementTrace = {
  meta: {
    pilot: string;
    date: string;
  };
  path: TrajPoint[];
  timestamps: number[];
};
