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
          <Heading size="xl">Flight Replay</Heading>
          <Box position="relative" maxWidth="100%" h={[200, 300, 400]} w={[300, 400, 500]}>
            <Image src={screenshot} layout="fill" objectFit="contain" />
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
                  <Link href={`/flight/${d.id}`}>
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
                  </Link>
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
