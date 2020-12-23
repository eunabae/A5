import React from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import {AmbientLight, PointLight, DirectionalLight, LightingEffect} from '@deck.gl/core';
import {HexagonLayer,GridLayer,ScreenGridLayer} from '@deck.gl/aggregation-layers';
import DeckGL from '@deck.gl/react';
import {readString} from "react-papaparse";
import {isWebGL2} from '@luma.gl/core';

// Set your mapbox token here
const MAPBOX_TOKEN = process.env.MapboxAccessToken; // eslint-disable-line

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});

const pointLight1 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-0.144528, 49.739968, 80000]
});

const pointLight2 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-3.807751, 54.104682, 8000]
});

const directionalLight = new DirectionalLight({
  color: [255, 255, 255],
  intensity: 1.0,
  direction: [-3, -9, -1]
});
const lightingEffect = new LightingEffect({ambientLight, pointLight1, pointLight2,directionalLight});

const material = {
  ambient: 0.8,
  diffuse: 0.6,
  shininess: 70,
  specularColor: [51, 51, 51]
};

const INITIAL_VIEW_STATE = {
  longitude: 126.9779,
  latitude: 37.5663,
  zoom: 10,
  minZoom: 1,
  maxZoom: 15,
  pitch: 40.5,
  bearing: -27
};

// 더 많은 세팅: https://colorbrewer2.org
// set "Number of data classes" to 6
export const bus_colorRange = [
  [254,229,217],
  [252,187,161],
  [252,146,114],
  [251,106,74],
  [222,45,38],
  [165,15,21]
];

export const bicycle_colorRange = [
  [239,243,255],
  [198,219,239],
  [158,202,225],
  [107,174,214],
  [49,130,189],
  [8,81,156]
];

export const market_colorRange = [
  [158,154,200],
  [117,107,177],
  [84,39,143]
];

function getTooltip({object}) {
  if (!object) {
    return null;
  }

  // console.log(object);
  const lat = object.position[1];
  const lng = object.position[0];
  const count = object.points.length;

  return ({
    html:`\
    <div><b>violet : traditional_market_area</div>
    <div>blue : bicycle_rent</div>
    <div>red : bus stop</b></div>
    <div>latitude: ${Number.isFinite(lat) ? lat.toFixed(6) : ''}</div>
    <div>longitude: ${Number.isFinite(lng) ? lng.toFixed(6) : ''}</div>
    <div>transport count : ${count}</div>
    `
    ,
    style: {
      backgroundColor: '#FFFFFF',
      color: '#000000',
      fontSize: '15px',
      padding: '10px',
      margin: '10px'
    }
  });
}

const ICON_MAPPING = {
  marker: {x: 0, y: 0, width: 128, height: 128, mask: true}
};

/* eslint-disable react/no-deprecated */
export default function App({
  data1,
  data2,
  data3,
  mapStyle = 'mapbox://styles/mapbox/outdoors-v11',
  radius = 1000,  
  lowerPercentile = 0,
  upperPercentile = 100,
  coverage = 0.3,
  cellSize = 3000,
  gpuAggregation = true,
  aggregation = 'SUM',
  disableGPUAggregation,
}) {

  const layers = [
    // reference: https://deck.gl/docs/api-reference/aggregation-layers/hexagon-layer
    
    new GridLayer({
      id: 'grid_market',
      colorRange : market_colorRange,
      data:data3,
      coverage:0.8,
      opacity: 1,
      getPosition: d => d,
      cellSize,
      gpuAggregation,
      aggregation,
      upperPercentile,
      lowerPercentile,
    }),

    new HexagonLayer({
      id: 'bus_stop',
      colorRange :bus_colorRange,
      data:data1,
      coverage,
      elevationRange: [0, 50],
      elevationScale: data1 && data1.length ? 50 : 0,
      extruded: true,
      opacity:1,
      getPosition: d => d,
      pickable: true,
      radius,
      autoHighlight: true,
      highlightColor: [225, 0, 0, 100],
      upperPercentile,
      lowerPercentile,
      material,
      transitions: {
        elevationScale: 50
      }
    }),

    new HexagonLayer({
      id: 'bicycle',
      colorRange :bicycle_colorRange,
      data:data2,
      coverage,
      elevationRange: [0, 100],
      elevationScale: data2 && data2.length ? 50 : 0,
      extruded: true,
      opacity:1,
      getPosition: d => d,
      pickable: true,
      radius,
      autoHighlight: true,
      highlightColor: [0, 0, 255, 100],
      upperPercentile,
      lowerPercentile,
      material,
      transitions: {
        elevationScale: 50
      }
    }),
  ];

  const onInitialized = gl => {
    if (!isWebGL2(gl)) {
      console.warn('GPU aggregation is not supported'); // eslint-disable-line
      if (disableGPUAggregation) {
        disableGPUAggregation();
      }
    }
  };

  return (
    <DeckGL
      layers={layers}
      effects={[lightingEffect]}
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      getTooltip={getTooltip}
      onWebGLInitialized={onInitialized}
    >
      <StaticMap
        reuseMaps
        mapStyle={mapStyle}
        preventStyleDiffing={true}
        mapboxApiAccessToken={MAPBOX_TOKEN}
      />
    </DeckGL>
  );
}

function is_coordinates_valid(lng,lat) {
  return (Number.isFinite(lng) 
    && Number.isFinite(lat) 
    && lat >= -90 
    && lat <= 90);
}

export function renderToDOM(container) {
  
  Promise.all([
    fetch("bicycle_rent_Seoul.csv").then(response => response.text()),
    fetch("bus_stop_Seoul.json").then(response => response.json()),
    fetch("traditional_market_Seoul.json").then(response => response.json()),
  ])
  .then(function(value) {
    
      const result = readString(value[0]);

      const data1 =result.data
          // d[5] = longitude(경도), d[4] = latitude(위도)
        .map(d => [Number(d[5]), Number(d[4])])
        // 위도&경도 유효성 검사
        .filter(d =>  
          Number.isFinite(d[0]) 
          && Number.isFinite(d[1]) 
          && d[1] >= -90 
          && d[1] <= 90);

    const data2 = value[1].DATA
        .map(d => [Number(d.xcode), Number(d.ycode)])
        .filter(d =>  
          Number.isFinite(d[0]) 
          && Number.isFinite(d[1]) 
          && d[1] >= -90 
          && d[1] <= 90);

    const data3 = value[2].DATA
       .map(d => [Number(d.lng), Number(d.lat)])
       .filter(d =>  
         Number.isFinite(d[0]) 
          && Number.isFinite(d[1]) 
          && d[1] >= -90 
          && d[1] <= 90);
      
      render(<App data1={data1} data2={data2} data3={data3} />, container);
  });
  
}
