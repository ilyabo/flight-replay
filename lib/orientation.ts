import { MovementTrace, TrajPoint } from '../types';
import { bisectRight } from 'd3-array';
import { interpolateArray } from 'd3-interpolate';

export function getYaw(prevPoint: [number, number, number], nextPoint: [number, number, number]) {
  const dx = nextPoint[0] - prevPoint[0];
  const dy = nextPoint[1] - prevPoint[1];
  return radiansToDegrees(Math.atan2(dy, dx));
}

export function getPitch(prevPoint: [number, number, number], nextPoint: [number, number, number]) {
  // https://stackoverflow.com/questions/18184848/calculate-pitch-and-yaw-between-two-unknown-points
  const dx = nextPoint[0] - prevPoint[0];
  const dy = nextPoint[1] - prevPoint[1];
  const dz = nextPoint[2] - prevPoint[2];
  return radiansToDegrees(Math.atan2(Math.sqrt(dz * dz + dx * dx), dy) + Math.PI);
}

export function radiansToDegrees(x: number) {
  let rv = (x * 180) / Math.PI;
  return rv;
}

export function runningAverage(
  arr: TrajPoint[],
  idx: number,
  f: (p1: [number, number, number], p2: [number, number, number]) => number,
  steps = 10
) {
  let sum = 0,
    cnt = 0;
  for (let i = 1; i < steps; i++) {
    const prevIdx = idx + 1 - i;
    const nextIdx = idx + 1;
    if (0 <= prevIdx && prevIdx < arr.length && 0 <= nextIdx && nextIdx < arr.length) {
      sum += f(arr[prevIdx], arr[nextIdx]);
    }
    cnt++;
  }
  return sum / cnt;
}

export function getTimeOffset(currentTime: Date, timestamps: number[], idx: number) {
  return (currentTime.getTime() - timestamps[idx - 1]) / (timestamps[idx] - timestamps[idx - 1]);
}

export function getPositionGetter(currentTime: Date, runningAverageSteps = 0) {
  return ({ timestamps, path }: MovementTrace) => {
    const idx = bisectRight(timestamps, currentTime.getTime());
    if (idx < 1 || idx > path.length - 1) {
      // TODO: better way to hide the objects
      return [0, 0, -10000];
    }
    // return path[idx];
    const timeOff = getTimeOffset(currentTime, timestamps, idx);
    if (runningAverageSteps > 0) {
      return interpolateArray(
        [
          runningAverage(path, idx - 1, (d) => d[0], runningAverageSteps),
          runningAverage(path, idx - 1, (d) => d[1], runningAverageSteps),
        ],
        [
          runningAverage(path, idx, (d) => d[0], runningAverageSteps),
          runningAverage(path, idx, (d) => d[1], runningAverageSteps),
        ]
      )(timeOff);
    }
    return interpolateArray(path[idx - 1], path[idx])(timeOff);
  };
}
