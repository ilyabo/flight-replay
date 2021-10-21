import type { NextPage } from 'next';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import GeoMap from '../components/GeoMap';
import { useEffect, useState } from 'react';
import fetchIgc from '../lib/fetchIgc';
import { MovementTrace } from '../types';

const Home: NextPage = () => {
  const [data, setData] = useState<MovementTrace[]>();
  useEffect(() => {
    (async () => {
      setData(
        await Promise.all(
          [
            './data/2020-07-31-XCT-OLE-01.igc',
            './data/2020-07-31-XTR-5E023E5C6A4C-01.igc',
            './data/2020-07-31_11.04_Grindelwald.igc',
            './data/IGC9iAfDM.igc',
          ].map(fetchIgc)
        )
      );
    })();
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {data && <GeoMap data={data} />}
    </div>
  );
};

export default Home;
