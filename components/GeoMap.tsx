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
import { useRouter } from 'next/router';
import DeckGL from '@deck.gl/react';
import { TripsLayer } from '@deck.gl/geo-layers';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import { AmbientLight, DirectionalLight, LightingEffect, MapView, PointLight } from '@deck.gl/core';
import { MovementTrace, TrajPoint } from '../types';
import { FaCog, FaPause, FaPlay } from 'react-icons/fa';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
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
  VStack,
} from '@chakra-ui/react';
import { scaleTime } from 'd3-scale';
import { bisectRight, max, min } from 'd3-array';
import { format } from 'date-fns';
import { interpolateArray } from 'd3-interpolate';

export interface Props {
  data: MovementTrace[];
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
const INITIAL_VIEWPORT = {
  latitude: 46.55529900866382,
  longitude: 7.838572814324716,
  zoom: 11.082359799464955,
  bearing: 88.5452249022164,
  pitch: 0,
  altitude: 1.5,
  maxZoom: 20,
  minZoom: 0,
  maxPitch: 80,
  minPitch: 0,
};

const angleX = 90;
const angleY = 0;
const angleZ = 90;

const GeoMap: FC<Props> = ({ data }) => {
  const { map } = React.useContext(MapContext);
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT);
  const [followMode, setFollowMode] = useState(true);

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
      const getPosition = getPositionGetter(currentTime);
      const position = getPosition(data[0]);
      if (position[0] || position[1]) {
        setViewport({
          ...viewport,
          longitude: position[0],
          latitude: position[1],
          pitch: 30,
          altitude: 10,
          zoom: 13,
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

  const layers = [
    new TripsLayer({
      id: 'trips-layer',
      data: data,
      getPath: (d: MovementTrace) => d.path,
      // deduct start timestamp from each data point to avoid overflow
      getTimestamps: (d: MovementTrace) =>
        d.timestamps.map((t) => t - timeScale.domain()[0].getTime()),
      getColor: (d: MovementTrace) => [253, 128, 93],
      opacity: 1,
      widthMinPixels: 5,
      jointRounded: true,
      // capRounded: true,
      // fadeTrail: false,
      fadeTrail: true,
      trailLength: 200000,
      currentTime: currentTime.getTime() - timeScale.domain()[0].getTime(),
    }),
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

    new ScenegraphLayer({
      id: `scenegraph`,
      data,
      // fetch: fetchGltf,
      // scenegraph: './data/1357 Hang Glider.gltf',
      scenegraph: './data/hang-glider/scene.gltf',
      sizeScale: 3,
      // getPosition: (d: MovementTrace) => d.path[0],
      getPosition: getPositionGetter(currentTime),
      // getOrientation: (d: MovementTrace) => [0, 0, 90],
      getOrientation: ({ timestamps, path }: MovementTrace) => {
        const idx = bisectRight(timestamps, currentTime.getTime());
        if (idx < 1 || idx > path.length - 1) return [angleX - 90, angleY, angleZ];
        // const pitch = idx < path.length - 1 ? getPitch(path[idx], path[idx + 1]) : 0;
        // const yaw = idx < path.length - 1 ? getYaw(path[idx], path[idx + 1]) : 0;
        // // const yaw = runningAverage(path, idx, getYaw);
        // // const pitch = runningAverage(path, idx, getPitch);
        // return [angleX + pitch, angleY + yaw, angleZ];

        const timeOff = getTimeOffset(currentTime, timestamps, idx);
        const angles = interpolateArray(
          [
            angleX + runningAverage(path, idx - 1, getPitch),
            angleY + runningAverage(path, idx - 1, getYaw),
            angleZ,
          ],
          [
            angleX + runningAverage(path, idx, getPitch),
            angleY + runningAverage(path, idx, getYaw),
            angleZ,
          ]
        )(timeOff);
        return angles;
      },

      _lighting: 'pbr',
      getColor: [253, 128, 93],
      updateTriggers: {
        getOrientation: {
          currentTime,
          angleX,
          angleY,
          angleZ,
        },
        getColor: { currentTime },
        getPosition: { currentTime },
      },
    }),
  ];

  const handleChangeFollowMode = (evt: SyntheticEvent) =>
    setFollowMode((evt.target as HTMLInputElement).checked);

  return (
    <VStack width="100%" height="100%">
      <Box width="100%" opacity={0.95} bg="#fff" pb={0} pt={5} px={7} borderRadius={10}>
        <HStack spacing={5}>
          <Button variant="ghost" color="tomato" onClick={handleTogglePlaying}>
            {playing ? <FaPause /> : <FaPlay />}
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
              <Box color="tomato" position="relative" bottom={5} whiteSpace="nowrap" fontSize={10}>
                {/*<VStack textAlign="center" spacing={0}>*/}
                {/*  <span>{format(currentTime, 'HH:mm:ss')}</span>*/}
                {/*  <span>{format(currentTime, 'yyyy-MM-dd')}</span>*/}
                {/*</VStack>*/}
                <span>{format(currentTime, 'HH:mm:ss')}</span>
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
                <Box color="tomato" position="relative" left={6} whiteSpace="nowrap" fontSize={10}>
                  <span>{animationSpeed}x</span>
                </Box>
              </SliderThumb>
            </Slider>
          </Box>
          <Box pl={2}>
            <Popover
              // initialFocusRef={initialFocusRef}
              placement="bottom-end"
              closeOnBlur={true}
            >
              <PopoverTrigger>
                <Button color="tomato" variant="ghost" title="Settings…">
                  <FaCog />
                </Button>
              </PopoverTrigger>
              <Portal>
                <PopoverContent>
                  {/*<PopoverHeader fontWeight="bold" fontSize="sm">*/}
                  {/*  Settings*/}
                  {/*</PopoverHeader>*/}
                  <PopoverArrow />
                  <PopoverCloseButton />
                  <PopoverBody px={6} py={4}>
                    {/*<Grid templateColumns="min-content 1fr" gap={2} alignItems="center">*/}
                    {/*  <Switch size="sm" />*/}
                    {/*  <Text>Follow mode</Text>*/}
                    {/*</Grid>*/}
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
                  </PopoverBody>
                </PopoverContent>
              </Portal>
            </Popover>
          </Box>
        </HStack>
      </Box>
      <Box position="relative" width="100%" height="100%">
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
          <StaticMap mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN} mapStyle={MAPBOX_STYLE} />
          {/*<ScaleControl maxWidth={100} unit="metric" style={scaleControlStyle} />*/}
        </DeckGL>
      </Box>
    </VStack>
  );
};

const GeoMapWithMapContext: FC<Props> = (props) => {
  const { locale } = useRouter();
  return (
    // @ts-ignore
    <MapContext.Provider>
      <GeoMap
        // make sure we fully re-render when locale changes
        key={locale}
        {...props}
      />
    </MapContext.Provider>
  );
};

export default GeoMapWithMapContext;

function getYaw(prevPoint: [number, number, number], nextPoint: [number, number, number]) {
  const dx = nextPoint[0] - prevPoint[0];
  const dy = nextPoint[1] - prevPoint[1];
  return radiansToDegrees(Math.atan2(dy, dx));
}

function getPitch(prevPoint: [number, number, number], nextPoint: [number, number, number]) {
  // https://stackoverflow.com/questions/18184848/calculate-pitch-and-yaw-between-two-unknown-points
  const dx = nextPoint[0] - prevPoint[0];
  const dy = nextPoint[1] - prevPoint[1];
  const dz = nextPoint[2] - prevPoint[2];
  return radiansToDegrees(Math.atan2(Math.sqrt(dz * dz + dx * dx), dy) + Math.PI);
}

function radiansToDegrees(x: number) {
  let rv = (x * 180) / Math.PI;
  return rv;
}

function runningAverage(
  arr: TrajPoint[],
  idx: number,
  f: (p1: [number, number, number], p2: [number, number, number]) => number,
  steps = 10
) {
  let sum = 0,
    cnt = 0;
  for (let i = 1; i < steps; i++) {
    const prevIdx = idx + 1 - i;
    const nextIdx = idx + 1;
    if (0 <= prevIdx && prevIdx < arr.length && 0 <= nextIdx && nextIdx < arr.length) {
      sum += f(arr[prevIdx], arr[nextIdx]);
    }
    cnt++;
  }
  return sum / cnt;
}

function getTimeOffset(currentTime: Date, timestamps: number[], idx: number) {
  return (currentTime.getTime() - timestamps[idx - 1]) / (timestamps[idx] - timestamps[idx - 1]);
}

function getPositionGetter(currentTime: Date) {
  return ({ timestamps, path }: MovementTrace) => {
    const idx = bisectRight(timestamps, currentTime.getTime());
    if (idx < 1 || idx > path.length - 1) {
      // TODO: better way to hide the objects
      return [0, 0, -10000];
    }
    // return path[idx];
    return interpolateArray(path[idx - 1], path[idx])(getTimeOffset(currentTime, timestamps, idx));
  };
}
