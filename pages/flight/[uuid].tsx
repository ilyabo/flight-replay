import { EnrichedMovementTrace, MovementTrace } from '../../types';
import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import FlightMap from '../../components/FlightMap';
import { Box, Flex, Spinner } from '@chakra-ui/react';
import { css, Global } from '@emotion/react';
import distance from '@turf/distance';

export interface Props {}

const globalStyles = css`
  body {
    overflow: hidden;
    position: fixed;
    width: 100%;
  }
`;

function enrichMovementTrace(trace: MovementTrace): EnrichedMovementTrace {
  return {
    ...trace,
    speeds: trace.path.map((p, i) => {
      if (i === 0) {
        return 0;
      }
      const prev = trace.path[i - 1];
      const d = distance(p, prev, { units: 'kilometers' });
      const t = trace.timestamps[i] - trace.timestamps[i - 1];
      return (d / t) * 1000 * 60 * 60;
    }),
  };
}

async function fetchMovementTrace(uuid: string): Promise<EnrichedMovementTrace> {
  const response = await fetch(`/api/flight?id=${uuid}`);
  return enrichMovementTrace(await response.json());
}

const Uuid: FC<Props> = (props) => {
  const { query } = useRouter();
  const uuids = query.uuid;
  const [data, setData] = useState<EnrichedMovementTrace[]>();
  useEffect(() => {
    (async () => {
      if (uuids) {
        if (Array.isArray(uuids)) {
          setData(await Promise.all(uuids.map(fetchMovementTrace)));
        } else {
          setData([await fetchMovementTrace(uuids)]);
        }
      }
    })();
  }, [uuids]);
  return (
    <>
      <Global styles={globalStyles} />
      {data ? (
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
