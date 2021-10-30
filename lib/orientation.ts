import { EnrichedMovementTrace, MovementTrace, TrajPoint } from '../types';
import { bisect, bisectLeft, bisectRight } from 'd3-array';
import { interpolateArray } from 'd3-interpolate';

const angleX = 90;
const angleY = 0;
const angleZ = 90;

export function getYaw(prevPoint: [number, number, number], nextPoint: [number, number, number]) {
  const dx = nextPoint[0] - prevPoint[0];
  const dy = nextPoint[1] - prevPoint[1];
  // if (dx < 1e-10 || dy < 1e-10) return NaN;
  return radiansToDegrees(Math.atan2(dy, dx));
}

export function getPitch(prevPoint: [number, number, number], nextPoint: [number, number, number]) {
  if (nextPoint[2] === 0 && prevPoint[2] === 0) {
    // some datasets have no altitude => this should prevent erratic pitch changes
    return -90;
  }
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

export function runningAverage<T>(arr: T[], f: (p: T) => number, steps = 10) {
  return arr.map((d, i) => {
    let avg = f(d),
      count = 0;
    for (let j = i - 1; j >= i - steps && j >= 0; j--) {
      avg += f(arr[j]);
      count++;
    }
    avg /= count;
    return avg;
  });
}

export function runningAverageDiffs<T>(
  arr: T[],
  idx: number,
  f: (p1: T, p2: T) => number,
  steps = 10
) {
  let sum = 0,
    cnt = 0;
  for (let i = 1; i < steps; i++) {
    const prevIdx = idx + 1 - i;
    const nextIdx = idx + 1;

    // const prevIdx = idx + 1 - i - 1;
    // const nextIdx = idx + 1 - i;

    // const nextIdx = idx + 1 - i + 1;
    // const prevIdx = idx + 1 - i;
    if (0 <= prevIdx && prevIdx < arr.length && 0 <= nextIdx && nextIdx < arr.length) {
      // console.log(`prevIdx=${prevIdx} nextIdx=${nextIdx}`);
      const v = f(arr[prevIdx], arr[nextIdx]);
      sum += v;
      // if (isFinite(v)) {
      //   sum += v;
      //   cnt++;
      // }
    }
    cnt++;
  }
  // console.log(cnt, steps, sum, nextIdx);
  // return cnt > 0 ? sum / cnt : 0;
  return sum / cnt;
}

export function getTimeOffset(currentTime: Date, timestamps: number[], idx: number) {
  return (currentTime.getTime() - timestamps[idx - 1]) / (timestamps[idx] - timestamps[idx - 1]);
}

export function getOrientationGetter(currentTime: Date, runningAverageSteps = 10) {
  return ({ timestamps, path }: MovementTrace) => {
    const idx = bisectRight(timestamps, currentTime.getTime());
    if (idx < 1 || idx > path.length - 1) return [angleX - 90, angleY, angleZ];
    // const pitch = idx < path.length - 1 ? getPitch(path[idx], path[idx + 1]) : 0;
    // const yaw = idx < path.length - 1 ? getYaw(path[idx], path[idx + 1]) : 0;
    // // const yaw = runningAverage(path, idx, getYaw);
    // // const pitch = runningAverage(path, idx, getPitch);
    // return [angleX + pitch, angleY + yaw, angleZ];
    // console.log(path[idx].map((x, i) => path[idx - 1][i] - x));

    const timeOff = getTimeOffset(currentTime, timestamps, idx);
    const angles = interpolateArray(
      [
        angleX + runningAverageDiffs(path, idx - 1, getPitch, runningAverageSteps),
        angleY + runningAverageDiffs(path, idx - 1, getYaw, runningAverageSteps),
        angleZ,
      ],
      [
        angleX + runningAverageDiffs(path, idx, getPitch, runningAverageSteps),
        angleY + runningAverageDiffs(path, idx, getYaw, runningAverageSteps),
        angleZ,
      ]
    )(timeOff);
    return angles;
  };
}

export function getPositionGetter(currentTime: Date, runningAverageSteps = 0) {
  return ({ timestamps, path }: MovementTrace) => {
    const idx = bisectRight(timestamps, currentTime.getTime());
    if (idx < 1 || idx > path.length - 1) {
      // TODO: better way to hide the objects
      // return [0, 0, -10000];
    }
    // return path[idx];
    const timeOff = getTimeOffset(currentTime, timestamps, idx);
    if (runningAverageSteps > 0) {
      return interpolateArray(
        [
          runningAverageDiffs(path, idx - 1, (d) => d[0], runningAverageSteps),
          runningAverageDiffs(path, idx - 1, (d) => d[1], runningAverageSteps),
          runningAverageDiffs(path, idx - 1, (d) => d[2], runningAverageSteps),
        ],
        [
          runningAverageDiffs(path, idx, (d) => d[0], runningAverageSteps),
          runningAverageDiffs(path, idx, (d) => d[1], runningAverageSteps),
          runningAverageDiffs(path, idx, (d) => d[2], runningAverageSteps),
        ]
      )(timeOff);
    }
    return interpolateArray(path[idx - 1], path[idx])(timeOff);
  };
}

export function getIndexFromTimeGetter({ timestamps }: EnrichedMovementTrace, currentTime: Date) {
  const idx = bisectLeft(timestamps, currentTime.getTime());
  if (idx < 0 || idx > timestamps.length - 1) {
    return -1;
  }
  return idx;
}
