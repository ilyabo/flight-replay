import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import FlightMap from '../components/FlightMap';
import { useEffect, useState } from 'react';
import fetchIgc from '../lib/fetchIgc';
import { MovementTrace } from '../types';
import { Box, Heading, VStack } from '@chakra-ui/react';
import examples from '../examples.json';
import screenshot from '../public/screenshot-sm.jpg';

const Home: NextPage = () => {
  // const [data, setData] = useState<MovementTrace[]>();
  // useEffect(() => {
  //   (async () => {
  //     setData(
  //       await Promise.all(
  //         [
  //           // './data/2020-07-31_11.04_Grindelwald.igc',
  //           // './data/IGC9iAfDM.igc',
  //           // './data/2020-07-31-XCT-OLE-01.igc',
  //           './data/2020-07-31-XTR-5E023E5C6A4C-01.igc',
  //         ].map(fetchIgc)
  //       )
  //     );
  //   })();
  // }, []);

  return (
    <>
      <Head>
        <title>Flight Replay</title>
        <meta name="description" content="Flight Replay" />
      </Head>

      <Box maxW="7xl" margin="auto" padding={10}>
        <VStack spacing={10}>
          <Heading size="xl">Flight Replay</Heading>
          <Box position="relative" maxWidth="100%" h={[200, 300, 400]} w={[300, 400, 500]}>
            <Image
              src={screenshot}
              layout="fill"
              objectFit="contain"
              // width={2184} height={1754}
            />
          </Box>
          <VStack spacing={5}>
            <Heading size="md">Example flights</Heading>
            <ul>
              {examples.map((d, i) => (
                <li key={i}>
                  <Link href={`/flight/${d.id}`}>{`${d.pilot}, ${d.location}, ${d.date}`}</Link>
                </li>
              ))}
            </ul>
          </VStack>
        </VStack>
      </Box>
    </>
  );
};

export default Home;
