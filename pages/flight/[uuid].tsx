import { EnrichedMovementTrace, MovementTrace, TrajPoint } from '../../types';
import { FC, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import FlightMap from '../../components/FlightMap';
import { Box, Flex, Spinner, VStack, Text } from '@chakra-ui/react';
import { css, Global } from '@emotion/react';
import distance from '@turf/distance';
import { scaleSequential } from 'd3-scale';
import { interpolateRdBu, interpolateRdYlBu } from 'd3-scale-chromatic';
import { max, min, sum } from 'd3-array';
import { colorAsRgb } from '../../lib/color';
import { runningAverage, runningAverageArr } from '../../lib/orientation';
import Link from 'next/link';

export interface Props {}

const globalStyles = css`
  body {
    overflow: hidden;
    position: fixed;
    width: 100%;
  }
`;

// function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
//   const R = 6371; // Radius of the earth in km
//   const dLat = deg2rad(lat2 - lat1); // deg2rad below
//   const dLon = deg2rad(lon2 - lon1);
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   const d = R * c; // Distance in km
//   return d;
// }
//
// function deg2rad(deg: number) {
//   return deg * (Math.PI / 180);
// }

function enrichMovementTrace(trace: MovementTrace): EnrichedMovementTrace {
  const smoothedPath = runningAverageArr(trace.path, (d) => d, 10) as TrajPoint[];
  const smoothedPath100 = runningAverageArr(trace.path, (d) => d, 100) as TrajPoint[];
  const smoothedPath800 = runningAverageArr(trace.path, (d) => d, 800) as TrajPoint[];

  const distances100 = smoothedPath100.map((p, i) => {
    if (i === 0) {
      return 0;
    }
    const prev = smoothedPath100[i - 1];
    return distance(p, prev, { units: 'kilometers' });
  });

  const speeds = distances100.map((d, i) => {
    if (i === 0) {
      return 0;
    }
    const t = trace.timestamps[i] - trace.timestamps[i - 1];
    return (d / t) * 1000 * 60 * 60;
  });

  const distances800 = smoothedPath800.map((p, i) => {
    if (i === 0) {
      return 0;
    }
    const prev = smoothedPath800[i - 1];
    return distance(p, prev, { units: 'kilometers' });
  });

  const distancesFromStart = distances800.reduce((acc, d, i) => {
    acc.push((i > 0 ? acc[i - 1] : 0) + d);
    return acc;
  }, [] as number[]);

  const speedsRunningAverage = runningAverage(speeds, (d) => d, 50);

  const colorScale = scaleSequential(interpolateRdYlBu).domain([
    max(speedsRunningAverage) || 0,
    min(speedsRunningAverage) || 0,
  ]);

  const speedColors = speedsRunningAverage.map((d, i) => {
    return colorAsRgb(colorScale(d));
  });

  return {
    ...trace,
    path: smoothedPath,
    distancesFromStart,
    speeds,
    speedsRunningAverage,
    speedColors,
  };
}

async function fetchMovementTrace(uuid: string): Promise<EnrichedMovementTrace> {
  const response = await fetch(`/api/flight?id=${uuid}`);
  if (response.status === 200) {
    const result = await response.json();
    return enrichMovementTrace(result);
  }
  throw new Error(await response.text());
}

const Uuid: FC<Props> = (props) => {
  const { query } = useRouter();
  const uuids = query.uuid;
  const [data, setData] = useState<EnrichedMovementTrace[]>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    (async () => {
      if (uuids) {
        try {
          if (Array.isArray(uuids)) {
            setData(await Promise.all(uuids.map(fetchMovementTrace)));
          } else {
            setData([await fetchMovementTrace(uuids)]);
          }
        } catch (err) {
          console.log(err);
          setError(`${err}`);
        }
      }
    })();
  }, [uuids]);
  return (
    <>
      <Global styles={globalStyles} />
      {error ? (
        <Box pt={20}>
          <VStack>
            <Text color="tomato">Oops… Sorry, the trace couldn't be loaded</Text>
            <Text color="tomato">{error}</Text>
            <Text pt={10}>
              <Link href="/">Return to homepage</Link>
            </Text>
          </VStack>
        </Box>
      ) : data ? (
        <FlightMap data={data} />
      ) : (
        <Flex position="absolute" inset="0px" alignItems="center" justifyContent="center">
          <Spinner color="tomato" />
        </Flex>
      )}
    </>
  );
};

export default Uuid;
