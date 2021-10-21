import React, { FC, useEffect, useMemo, useState } from 'react';
import { MapContext, StaticMap } from 'react-map-gl';
// import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouter } from 'next/router';
import DeckGL from '@deck.gl/react';
import { TripsLayer } from '@deck.gl/geo-layers';
import { ScenegraphLayer } from '@deck.gl/mesh-layers';
import { MapView, LightingEffect } from '@deck.gl/core';
import { MovementTrace, TrajPoint } from '../types';
import { Box, Slider, SliderFilledTrack, SliderThumb, SliderTrack, VStack } from '@chakra-ui/react';
import { scaleTime } from 'd3-scale';
import { bisectRight, max, min } from 'd3-array';
import { format } from 'date-fns';
import { AmbientLight, PointLight, DirectionalLight } from '@deck.gl/core';

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

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const MAPBOX_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE;
const INITIAL_VIEWPORT = {
  latitude: 46.619538195143576,
  longitude: 7.917705406762233,
  zoom: 10.325604071743175,
  bearing: 6.888974902216397,
  pitch: 53.263484661216,
  altitude: 1.5,
  maxZoom: 20,
  minZoom: 0,
  maxPitch: 80,
  minPitch: 0,
};

const angleX = 0;
const angleY = 0;
const angleZ = 90;
const NAV_CONTROLS_STYLE = {
  right: 10,
  top: 10,
};

const scaleControlStyle = {
  left: 10,
  bottom: 35,
};

const GeoMap: FC<Props> = ({ data }) => {
  const { map } = React.useContext(MapContext);
  const timeScale = useMemo(() => {
    return scaleTime()
      .domain([
        new Date(min(data, (d) => d.timestamps[0]) || 0),
        new Date(max(data, (d) => d.timestamps[d.timestamps.length - 1]) || 0),
      ])
      .range([0, 100]);
  }, [data]);
  const [currentTime, setCurrentTime] = useState(timeScale.domain()[0]);
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

  const [viewport, setViewport] = useState(INITIAL_VIEWPORT);
  console.log(viewport);
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
      getPosition: ({ timestamps, path }: MovementTrace) => {
        const idx = bisectRight(timestamps, currentTime.getTime());
        if (idx < 1 || idx > path.length - 1) {
          // TODO: better way to hide the objects
          return [0, 0, -10000];
        }
        return path[idx];
      },
      // getOrientation: (d: MovementTrace) => [0, 0, 90],
      getOrientation: ({ timestamps, path }: MovementTrace) => {
        const idx = bisectRight(timestamps, currentTime.getTime());
        const yaw = idx < path.length - 1 ? getYaw(path[idx], path[idx + 1]) : 0;
        const pitch = idx < path.length - 1 ? getPitch(path[idx], path[idx + 1]) + 90 : 0;
        // const pitch = 0;
        return [angleX + pitch, angleY + yaw, angleZ];
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

  // return (
  //   <ReactMapGL
  //     mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
  //     mapStyle={MAPBOX_STYLE}
  //     {...viewport}
  //     width={'100%'}
  //     height={'100%'}
  //     onViewportChange={(viewport: any) => setViewport(viewport)}
  //     // onInteractionStateChange={onMapInteraction}
  //     // interactiveLayerIds={interactiveLayers}
  //     dragRotate={true}
  //     touchRotate={true}
  //     minZoom={MIN_ZOOM}
  //     maxZoom={MAX_ZOOM}
  //     clickRadius={10}
  //   >
  //     <DeckGL layers={layers} />
  //     <NavigationControl style={NAV_CONTROLS_STYLE} showCompass={false} />
  //     <ScaleControl maxWidth={100} unit="metric" style={scaleControlStyle} />
  //   </ReactMapGL>
  // );

  const handleMoveTimeSlider = (val: number) => {
    setCurrentTime(timeScale.invert(val));
  };
  return (
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
      <Box position="absolute" bottom={10} bg="#fff" left={20} right={20} pt={1} pb={8} px={50}>
        <Slider
          value={timeScale(currentTime)}
          min={0}
          max={100}
          step={0.1}
          onChange={handleMoveTimeSlider}
        >
          <SliderTrack bg="tomato">
            <SliderFilledTrack bg="tomato" />
          </SliderTrack>
          <SliderThumb boxSize={4} bg="tomato">
            <Box color="tomato" position="relative" top={7} whiteSpace="nowrap" fontSize={10}>
              <VStack textAlign="center" spacing={0}>
                <span>{format(currentTime, 'HH:mm:ss')}</span>
                <span>{format(currentTime, 'yyyy-MM-dd')}</span>
              </VStack>
            </Box>
          </SliderThumb>
        </Slider>
      </Box>
    </DeckGL>
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
  return (x * 180) / Math.PI;
}
