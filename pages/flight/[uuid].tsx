import { MovementTrace } from '../../types';
import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import FlightMap from '../../components/FlightMap';
import { Box } from '@chakra-ui/react';

export interface Props {}

async function fetchMovementTrace(uuid: string): Promise<MovementTrace> {
  const response = await fetch(`/api/load-flight?id=${uuid}`);
  return await response.json();
}

const Uuid: FC<Props> = (props) => {
  const { query } = useRouter();
  const uuids = query.uuid;
  const [data, setData] = useState<MovementTrace[]>();
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
    <Box position="absolute" top={0} left={0} w="100vw" height="100vh">
      {data ? <FlightMap data={data} /> : 'Loading…'}
    </Box>
  );
};

export default Uuid;
