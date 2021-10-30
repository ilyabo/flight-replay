import React, {
  FC,
  SyntheticEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MapContext, StaticMap } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Link from 'next/link';
import { useRouter } from 'next/router';
import DeckGL from '@deck.gl/react';
import { TripsLayer } from '@deck.gl/geo-layers';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import { AmbientLight, DirectionalLight, LightingEffect, MapView, PointLight } from '@deck.gl/core';
import { EnrichedMovementTrace, MovementTrace } from '../types';
import { FaCog, FaPause, FaPlay } from 'react-icons/fa';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Switch,
  Text,
  useTheme,
  VStack,
} from '@chakra-ui/react';
import { scaleTime } from 'd3-scale';
import { max, min } from 'd3-array';
import {
  getIndexFromTimeGetter,
  getOrientationGetter,
  getPositionGetter,
} from '../lib/orientation';
import { utcFormat } from 'd3-time-format';
import isMobile from 'ismobilejs';

const IS_MOBILE = isMobile(globalThis.navigator)?.any;

const formatTimeDiff = utcFormat('%H:%M:%S');
export interface Props {
  data: EnrichedMovementTrace[];
}
// create ambient light source
const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 5.0,
});
// create point light source
const pointLight = new PointLight({
  color: [255, 255, 255],
  intensity: 1.0,
  // use coordinate system as the same as view state
  position: [-125, 50.5, 5000],
});
// create directional light source
const directionalLight = new DirectionalLight({
  color: [255, 255, 255],
  intensity: 10.0,
  direction: [3, -9, -1],
});

const lightingEffect = new LightingEffect({
  ambientLight,
  pointLight,
  directionalLight,
});

// export const MIN_ZOOM = 0;
// export const MAX_ZOOM = 18;

const ANIMATION_SPEEDS = [
  1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
];
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const MAPBOX_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE;
const INITIAL_VIEWPORT: any = {
  // latitude: 46.55529900866382,
  // longitude: 7.838572814324716,
  // zoom: 11.082359799464955,
  bearing: 90,
  pitch: 0,
  altitude: 1.5,
  maxZoom: 20,
  minZoom: 0,
  maxPitch: 80,
  minPitch: 0,
};

const FlightMap: FC<Props> = ({ data }) => {
  const { map } = React.useContext(MapContext);
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT);
  const [showTrail, setShowTrail] = useState(!IS_MOBILE);
  const [fadeTrail, setFadeTrail] = useState(true);
  const [followMode, setFollowMode] = useState(true);
  const [cinematicEffects, setCinematicEffects] = useState(true);
  const [satelliteImagery, setSatelliteImagery] = useState(true);

  const theme = useTheme();
  const timeScale = useMemo(() => {
    return scaleTime()
      .domain([
        new Date(min(data, (d) => d.timestamps[0]) || 0),
        new Date(max(data, (d) => d.timestamps[d.timestamps.length - 1]) || 0),
      ])
      .range([0, 100]);
  }, [data]);
  const [currentTime, setCurrentTime] = useState(timeScale.domain()[0]);
  const [playing, setPlaying] = useState(true);

  // Use useRef for mutable variables that we want to persist
  // without triggering a re-render on their change
  const requestAnimationFrameRef = useRef<number>();
  const previousTimeRef = useRef(0);
  const [animationSpeed, setAnimationSpeed] = useState(50);

  const animate = useCallback(
    (time: number) => {
      if (playing) {
        if (previousTimeRef.current > 0) {
          const deltaTime = time - previousTimeRef.current;
          setCurrentTime((prevTime) => {
            const prevTimeMillis = prevTime.getTime();
            const startTimeMillis = timeScale.domain()[0].getTime();
            const endTimeMillis = timeScale.domain()[1].getTime();
            let nextMillis = prevTimeMillis + deltaTime * animationSpeed;
            if (nextMillis > endTimeMillis) {
              nextMillis = startTimeMillis;
            }
            return new Date(nextMillis);
          });
        }
        requestAnimationFrameRef.current = requestAnimationFrame(animate);
        previousTimeRef.current = time;
      }
    },
    [playing, requestAnimationFrameRef, previousTimeRef, animationSpeed]
  );

  useEffect(() => {
    if (playing) {
      requestAnimationFrameRef.current = requestAnimationFrame(animate);
    } else {
      const animationFrame = requestAnimationFrameRef.current;
      if (animationFrame != null && animationFrame > 0) {
        window.cancelAnimationFrame(animationFrame);
        requestAnimationFrameRef.current = undefined;
      }
    }
    return () => {
      if (requestAnimationFrameRef.current != null) {
        cancelAnimationFrame(requestAnimationFrameRef.current);
      }
    };
  }, [playing, animate]);

  const handleTogglePlaying = () => {
    previousTimeRef.current = 0;
    setPlaying(!playing);
  };
  const handleMoveTimeSlider = (val: number) => {
    setCurrentTime(timeScale.invert(val));
    setPlaying(false);
  };
  const handleChangeAnimationSpeed = (idx: number) => {
    setAnimationSpeed(ANIMATION_SPEEDS[idx]);
  };
  useLayoutEffect(() => {
    if (followMode) {
      const getPosition = getPositionGetter(currentTime, 100);
      // const getOrientation = getOrientationGetter(currentTime, 10000);
      const position = getPosition(data[0]);
      // const orientation = getOrientation(data[0]);
      // console.log(orientation[1]);
      if (position[0] || position[1]) {
        setViewport({
          ...viewport,
          longitude: position[0],
          latitude: position[1],
          pitch: 50 + (cinematicEffects ? Math.sin(currentTime.getTime() / 1000000) * 5 : 0),
          // bearing: 0,
          // bearing: ((currentTime.getTime() / 50000) % 360) - 180,
          bearing: cinematicEffects ? Math.sin(currentTime.getTime() / 2000000) * 180 : 0,
          zoom: 12.5 + (cinematicEffects ? Math.sin(currentTime.getTime() / 1000000) / 2 : 0),
        });
      }
    }
  }, [currentTime, followMode]);

  const addMapData = () => {
    const layers = map.getStyle().layers;
    const firstLabelLayer = layers.find((layer: any) => layer.id.endsWith('-label'));
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
    // add the DEM source as a terrain layer with exaggerated height
    map.setTerrain({
      source: 'mapbox-dem',
      // exaggeration: 1.5
    });

    // add a sky layer that will show when the map is highly pitched
    map.addLayer({
      id: 'sky',
      type: 'sky',
      paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0.0, 0.0],
        'sky-atmosphere-sun-intensity': 15,
      },
    });

    // The 'building' layer in the Mapbox Streets
    // vector tileset contains building height data
    // from OpenStreetMap.
    map.addLayer(
      {
        id: 'add-3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#aaa',

          // Use an 'interpolate' expression to
          // add a smooth transition effect to
          // the buildings as the user zooms in.
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height'],
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height'],
          ],
          'fill-extrusion-opacity': 0.6,
        },
      },
      firstLabelLayer?.id
    );
  };

  useEffect(() => {
    if (map) {
      map.on('load', addMapData);
    }
  }, [map]);

  const layers = [];
  if (showTrail) {
    layers.push(
      new TripsLayer({
        id: 'trips-layer',
        data: data,
        getPath: (d: MovementTrace) => d.path,
        // deduct start timestamp from each data point to avoid overflow
        getTimestamps: (d: MovementTrace) =>
          d.timestamps.map((t) => t - timeScale.domain()[0].getTime()),
        // getColor: (d: MovementTrace) => [253, 128, 93],
        getColor: (d: EnrichedMovementTrace) => d.speedColors,
        opacity: 1,
        widthMinPixels: 5,
        jointRounded: true,
        // capRounded: true,
        // fadeTrail: false,
        fadeTrail,
        trailLength: 200000,
        currentTime: currentTime.getTime() - timeScale.domain()[0].getTime(),
      })
    );
  }

  // new ScatterplotLayer({
  //   id: 'scatterplot-layer',
  //   data: data[0],
  //   // pickable: true,
  //   opacity: 1,
  //   stroked: false,
  //   filled: true,
  //   // lineWidthMinPixels: 1,
  //   getPosition: (d: TrajPoint) => [d.lon, d.lat, d.alt],
  //   getFillColor: [255, 140, 0],
  //   getLineColor: [0, 0, 0],
  //   billboard: true,
  //   getRadius: 2,
  //   radiusScale: 1,
  //   radiusUnits: 'pixels',
  // }),

  layers.push(
    new ScenegraphLayer({
      id: `scenegraph`,
      data,
      // fetch: fetchGltf,
      // scenegraph: './data/1357 Hang Glider.gltf',
      scenegraph: '/data/hang-glider/scene.gltf',
      sizeScale: 3,
      // getPosition: (d: MovementTrace) => d.path[0],
      getPosition: getPositionGetter(currentTime),
      // getOrientation: (d: MovementTrace) => [0, 0, 90],
      getOrientation: getOrientationGetter(currentTime),
      getColor: [253, 128, 93],
      _lighting: 'pbr',
      updateTriggers: {
        getOrientation: {
          currentTime,
        },
        getColor: { currentTime },
        getPosition: { currentTime },
      },
    })
  );

  const handleChangeShowTrail = (evt: SyntheticEvent) => {
    setShowTrail((evt.target as HTMLInputElement).checked);
  };

  const handleChangeFadeTrail = (evt: SyntheticEvent) =>
    setFadeTrail((evt.target as HTMLInputElement).checked);

  const handleChangeFollowMode = (evt: SyntheticEvent) =>
    setFollowMode((evt.target as HTMLInputElement).checked);

  const handleChangeCinematicEffects = (evt: SyntheticEvent) =>
    setCinematicEffects((evt.target as HTMLInputElement).checked);

  const handleChangeSatelliteImagery = (evt: SyntheticEvent) =>
    setSatelliteImagery((evt.target as HTMLInputElement).checked);

  return (
    <>
      <Box>
        <DeckGL
          effects={[lightingEffect]}
          // initialViewState={INITIAL_VIEWPORT}
          // controller={true}
          views={
            new MapView({
              controller: { doubleClickZoom: false, inertia: true, keyboard: false },
            })
          }
          layers={layers}
          viewState={viewport}
          onViewStateChange={({ viewState }: any) => setViewport(viewState)}
        >
          <StaticMap
            mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
            mapStyle={satelliteImagery ? MAPBOX_STYLE : undefined}
          />
          {/*<ScaleControl maxWidth={100} unit="metric" style={scaleControlStyle} />*/}
        </DeckGL>
      </Box>
      <Box
        position="absolute"
        top={1}
        left={1}
        bg={theme.colors.overlayBg}
        color="#fff"
        fontWeight="bold"
        textShadow="0 0 1px #000"
        p={2}
      >
        <Link href="/">
          <Heading fontSize={12} textTransform="uppercase" cursor="pointer">
            FlightReplay
          </Heading>
        </Link>
      </Box>
      <Box
        position="absolute"
        bottom={95}
        left={1}
        bg={theme.colors.overlayBg}
        color="tomato"
        p={2}
        fontSize={10}
        textShadow="0 0 1px #000"
      >
        <Grid templateColumns="min-content 1fr" columnGap={1}>
          <Text fontWeight="bold">Pilot:</Text>
          <div>{data[0].meta?.pilot}</div>
          <Text fontWeight="bold">Date:</Text>
          <div>{data[0].meta?.date}</div>
          <Text fontWeight="bold">Location:</Text>
          <div>{data[0].meta?.location}</div>
        </Grid>
      </Box>
      <Box
        position="absolute"
        top={1}
        right={1}
        // borderRadius={10}
        bg={theme.colors.overlayBg}
        color="tomato"
        p={2}
        textShadow="0 0 1px #000"
      >
        <Grid templateColumns="min-content 60px">
          <Text fontSize="xs" whiteSpace="nowrap" textTransform="uppercase">
            Altitude
          </Text>
          <Text alignSelf="center" justifySelf="end" fontSize="xs">{`${Math.round(
            getPositionGetter(currentTime)(data[0])[2]
          )} m`}</Text>
        </Grid>

        <Box>
          <Text fontSize="xs" whiteSpace="nowrap" textTransform="uppercase">
            Speed
          </Text>
          <Text textAlign="end" fontSize="26" fontWeight="bold">
            {`${Math.round(
              data[0].speedsRunningAverage[getIndexFromTimeGetter(data[0], currentTime)] || 0
            )} km/h`}
          </Text>
        </Box>

        <Grid templateColumns="min-content 60px">
          <Text fontSize="xs" whiteSpace="nowrap" textTransform="uppercase">
            Distance
          </Text>
          <Text alignSelf="center" justifySelf="end" fontSize="xs">
            {`${Math.round(
              data[0].distancesFromStart[getIndexFromTimeGetter(data[0], currentTime)]
            )} km`}
          </Text>
        </Grid>
      </Box>
      <Box
        position="absolute"
        bottom={0}
        left={0}
        width="100vw"
        opacity={0.975}
        bg={theme.colors.overlayBg}
        pb={7}
        pt={3}
        px={5}
        // borderRadius={10}
        // zIndex={100}
      >
        <HStack spacing={5}>
          <Button variant="ghost" size="lg" color="tomato" onClick={handleTogglePlaying}>
            {playing ? <FaPause size={25} /> : <FaPlay size={25} />}
          </Button>
          <Slider
            value={timeScale(currentTime)}
            min={0}
            max={100}
            step={0.02}
            onChange={handleMoveTimeSlider}
            focusThumbOnChange={false}
          >
            <SliderTrack bg="tomato">
              <SliderFilledTrack bg="tomato" />
            </SliderTrack>
            <SliderThumb boxSize={4} bg="tomato">
              <Box
                color="tomato"
                position="relative"
                bottom={5}
                whiteSpace="nowrap"
                fontSize={10}
                textShadow="0 0 1px #000"
              >
                {/*<VStack textAlign="center" spacing={0}>*/}
                {/*  <span>{format(currentTime, 'HH:mm:ss')}</span>*/}
                {/*  <span>{format(currentTime, 'yyyy-MM-dd')}</span>*/}
                {/*</VStack>*/}
                <span>
                  {formatTimeDiff(
                    new Date(currentTime.getTime() - timeScale.domain()[0].getTime())
                  )}
                  {/*{format(*/}
                  {/*  currentTime.getTime() - timeScale.domain()[0].getTime() - 1000 * 60 * 60,*/}
                  {/*  'HH:mm:ss'*/}
                  {/*)}*/}
                </span>
              </Box>
            </SliderThumb>
          </Slider>
          <Box pr={2}>
            <Slider
              color="tomato"
              orientation="vertical"
              min={0}
              max={ANIMATION_SPEEDS.length - 1}
              height={8}
              value={ANIMATION_SPEEDS.indexOf(animationSpeed)}
              onChange={handleChangeAnimationSpeed}
            >
              <SliderTrack bg="tomato">
                <SliderFilledTrack bg="tomato" />
              </SliderTrack>
              <SliderThumb bg="tomato">
                <Box
                  color="tomato"
                  position="relative"
                  left={6}
                  whiteSpace="nowrap"
                  fontSize={10}
                  textShadow="0 0 1px #000"
                >
                  <span>{animationSpeed}x</span>
                </Box>
              </SliderThumb>
            </Slider>
          </Box>
          <Box pl={2}>
            <Popover
              // initialFocusRef={initialFocusRef}
              placement="top-end"
              closeOnBlur={true}
            >
              <PopoverTrigger>
                <Button color="tomato" variant="ghost" title="Settings…">
                  <FaCog />
                </Button>
              </PopoverTrigger>
              <Portal>
                <PopoverContent w={350}>
                  {/*<PopoverHeader fontWeight="bold" fontSize="sm">*/}
                  {/*  Settings*/}
                  {/*</PopoverHeader>*/}
                  <PopoverArrow />
                  <PopoverCloseButton />
                  <PopoverBody px={6} py={4}>
                    <VStack spacing={2}>
                      <HStack w="100%">
                        <FormControl display="flex" alignItems="center">
                          <Switch
                            id="show-trail-switch"
                            size="sm"
                            colorScheme="gray"
                            isChecked={showTrail}
                            onChange={handleChangeShowTrail}
                          />
                          <FormLabel
                            htmlFor="show-trail-switch"
                            ml={2}
                            mb={0}
                            fontSize="xs"
                            cursor="pointer"
                          >
                            Show trail
                          </FormLabel>
                        </FormControl>
                        {showTrail ? (
                          <FormControl display="flex" alignItems="center">
                            <Switch
                              id="fade-trail-switch"
                              size="sm"
                              colorScheme="gray"
                              isChecked={fadeTrail}
                              onChange={handleChangeFadeTrail}
                            />
                            <FormLabel
                              htmlFor="fade-trail-switch"
                              ml={2}
                              mb={0}
                              fontSize="xs"
                              cursor="pointer"
                            >
                              Fade trail
                            </FormLabel>
                          </FormControl>
                        ) : null}
                      </HStack>
                      <HStack w="100%">
                        <FormControl display="flex" alignItems="center">
                          <Switch
                            id="follow-mode-switch"
                            size="sm"
                            colorScheme="gray"
                            isChecked={followMode}
                            onChange={handleChangeFollowMode}
                          />
                          <FormLabel
                            htmlFor="follow-mode-switch"
                            ml={2}
                            mb={0}
                            fontSize="xs"
                            cursor="pointer"
                          >
                            Follow mode
                          </FormLabel>
                        </FormControl>
                        {followMode ? (
                          <FormControl display="flex" alignItems="center">
                            <Switch
                              id="cinematic-effects-switch"
                              size="sm"
                              colorScheme="gray"
                              isChecked={cinematicEffects}
                              onChange={handleChangeCinematicEffects}
                            />
                            <FormLabel
                              htmlFor="cinematic-effects-switch"
                              ml={2}
                              mb={0}
                              fontSize="xs"
                              cursor="pointer"
                              whiteSpace="nowrap"
                            >
                              Cinematic effect
                            </FormLabel>
                          </FormControl>
                        ) : null}
                      </HStack>
                      <FormControl display="flex" alignItems="center">
                        <Switch
                          id="satellite-imagery-switch"
                          size="sm"
                          colorScheme="gray"
                          isChecked={satelliteImagery}
                          onChange={handleChangeSatelliteImagery}
                        />
                        <FormLabel
                          htmlFor="satellite-imagery-switch"
                          ml={2}
                          mb={0}
                          fontSize="xs"
                          cursor="pointer"
                        >
                          Satellite imagery
                        </FormLabel>
                      </FormControl>
                    </VStack>
                  </PopoverBody>
                </PopoverContent>
              </Portal>
            </Popover>
          </Box>
        </HStack>
      </Box>
    </>
  );
};

const FlightMapWithMapContext: FC<Props> = (props) => {
  const { locale } = useRouter();
  return (
    // @ts-ignore
    <MapContext.Provider>
      <FlightMap
        // make sure we fully re-render when locale changes
        key={locale}
        {...props}
      />
    </MapContext.Provider>
  );
};

export default FlightMapWithMapContext;
