import IGCParser from 'igc-parser';
import { MovementTrace } from '../types';
import { ascending } from 'd3-array';

export default async function fetchIgc(
  url: string,
  opts: { meta?: any } = {}
): Promise<MovementTrace> {
  const response = await fetch(url);
  const text = await response.text();
  const parsed = IGCParser.parse(text);
  return prepareIgcForTripsLayer(parsed, opts.meta);
}

function prepareIgcForTripsLayer(data: IGCParser.IGCFile, meta: any): MovementTrace {
  const { fixes, ...rest } = data;
  const traj = fixes
    .filter(({ valid }) => valid !== false)
    .map(({ latitude, longitude, timestamp, pressureAltitude, gpsAltitude }) => ({
      lat: latitude,
      lon: longitude,
      alt: gpsAltitude || pressureAltitude || 0,
      timestamp,
    }))
    .sort((a, b) => ascending(a.timestamp, b.timestamp));
  return {
    meta: {
      ...rest,
      ...meta,
    } as MovementTrace['meta'],
    path: traj.map((d) => [d.lon, d.lat, d.alt]),
    timestamps: traj.map((d) => d.timestamp),
  };
}
