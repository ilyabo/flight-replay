import { MovementTrace } from '../../types';
import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import FlightMap from '../../components/FlightMap';
import { Box, Flex, Spinner } from '@chakra-ui/react';
import { css, Global } from '@emotion/react';

export interface Props {}

const globalStyles = css`
  body {
    overflow: hidden;
    position: fixed;
    width: 100%;
  }
`;

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
