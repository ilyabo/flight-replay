import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { Box, Grid, Heading, Text, VStack } from '@chakra-ui/react';
import examples from '../examples.json';
import screenshot from '../public/screenshot-sm.jpg';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Flight Replay</title>
        <meta name="description" content="Flight Replay" />
      </Head>

      <Box maxW="10xl" margin="auto" padding={10}>
        <VStack spacing={10}>
          <Heading size="lg" textTransform="uppercase">
            Flight Replay
          </Heading>
          <Box>
            Demo app developed by <Link href="https://ilya.boyandin.me/">Ilya Boyandin</Link> using{' '}
            <Link href="https://deck.gl/">Deck.gl</Link> and{' '}
            <Link href="https://docs.mapbox.com/mapbox-gl-js/">Mapbox GL JS</Link>.
          </Box>
          <Box position="relative" maxWidth="100%" h={[200, 300, 400]} w={[300, 400, 500]}>
            <Image
              src={screenshot}
              layout="fill"
              objectFit="contain"
              blurDataURL={screenshot.blurDataURL}
              placeholder="blur"
              quality={90}
            />
          </Box>
          <VStack spacing={5}>
            <Heading size="md">Example flights</Heading>
            <Grid
              templateColumns="2fr 2fr min-content min-content"
              gap={3}
              alignItems="center"
              cursor="pointer"
              // fontSize="sm"
            >
              {examples.map((d, i) => (
                <Box key={i} display="contents">
                  <a href={`/flight/${d.id}`} style={{ display: 'contents' }}>
                    <Box role="group" display="contents">
                      <Text _groupHover={{ textDecoration: 'underline' }}>{d.pilot}</Text>
                      <Text _groupHover={{ textDecoration: 'underline' }} fontSize="xs">
                        {d.location}
                      </Text>
                      <Text
                        _groupHover={{ textDecoration: 'underline' }}
                        whiteSpace="nowrap"
                        fontSize="xs"
                      >
                        {d.date}
                      </Text>
                    </Box>
                  </a>
                  <Text whiteSpace="nowrap" fontSize="xs">
                    <a href={d.source} target="_blank">
                      [Source]
                    </a>
                  </Text>
                </Box>
              ))}
            </Grid>
          </VStack>
        </VStack>
      </Box>
    </>
  );
};

export default Home;
