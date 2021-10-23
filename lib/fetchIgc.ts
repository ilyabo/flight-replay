import IGCParser from 'igc-parser';
import { MovementTrace } from '../types';
import { ascending } from 'd3-array';

export default async function fetchIgc(url: string): Promise<MovementTrace> {
  const response = await fetch(url);
  const text = await response.text();
  const parsed = IGCParser.parse(text);
  return prepareIgcForTripsLayer(parsed);
}

function prepareIgcForTripsLayer(data: IGCParser.IGCFile): MovementTrace {
  const traj = data.fixes
    .map(({ latitude, longitude, timestamp, pressureAltitude }) => ({
      lat: latitude,
      lon: longitude,
      alt: pressureAltitude || 0,
      timestamp,
    }))
    .sort((a, b) => ascending(a.timestamp, b.timestamp));
  return {
    path: traj.map((d) => [d.lon, d.lat, d.alt]),
    timestamps: traj.map((d) => d.timestamp),
  };
}
