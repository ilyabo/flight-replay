import React, { FC, useEffect, useMemo, useState } from 'react';
import ReactMapGL, {
  MapContext,
  Marker,
  NavigationControl,
  ScaleControl,
  StaticMap,
} from 'react-map-gl';
// import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouter } from 'next/router';
import IGCParser from 'igc-parser';
import DeckGL from '@deck.gl/react';
import { LineLayer, ScatterplotLayer } from '@deck.gl/layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import { MapView } from '@deck.gl/core';
import { MovementTrace, TrajPoint } from '../types';
import { SliderFilledTrack, SliderThumb, SliderTrack, Box, Slider, VStack } from '@chakra-ui/react';
import { scaleTime } from 'd3-scale';
import { max, min } from 'd3-array';
import { format } from 'date-fns';

export interface Props {
  data: MovementTrace[];
}

export const MIN_ZOOM = 0;
export const MAX_ZOOM = 18;

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const MAPBOX_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE;
const INITIAL_VIEWPORT = {
  latitude: 46.49711872308324,
  longitude: 7.911217525691257,
  zoom: 11.202341726765956,
  bearing: 158.20868644067795,
  pitch: 69.40550159456775,
  altitude: 1.5,
  maxZoom: 20,
  minZoom: 0,
  maxPitch: 80,
  minPitch: 0,
};

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
  const layers = [
    new TripsLayer({
      id: 'trips-layer',
      data: data,
      getPath: (d: MovementTrace) => d.path,
      // deduct start timestamp from each data point to avoid overflow
      getTimestamps: (d: MovementTrace) =>
        d.timestamps.map((t) => t - timeScale.domain()[0].getTime()),
      getColor: (d: TrajPoint[], i: number) => [253, 128, 93],
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
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="tomato" />
          </SliderTrack>
          <SliderThumb boxSize={6}>
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
