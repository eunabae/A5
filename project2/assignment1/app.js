import React, {useState} from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import DeckGL from '@deck.gl/react';
import {GeoJsonLayer, PolygonLayer, FeatureLayer} from '@deck.gl/layers';
import {LightingEffect, AmbientLight, _SunLight as SunLight} from '@deck.gl/core';
//import {scaleThreshold} from 'd3-scale';
import {scaleSequential} from 'd3-scale';
//import {interpolateRainbow} from 'd3-scale-chromatic';
import {interpolateRdPu} from 'd3-scale-chromatic';
import {readString} from "react-papaparse";

// "MapboxAccessToken" 환경변수값
const MAPBOX_TOKEN = process.env.MapboxAccessToken; 

export const COLOR_SCALE = x =>
  // https://github.com/d3/d3-scale-chromatic
    (
      scaleSequential()
      .domain([0, 3])
//    .interpolator(interpolateRainbow)(x)
      .interpolator(interpolateRdPu)
    )(x) // return a string color "rgb(R,G,B)"
    .slice(4,-1)  // extract "R,G,B"
    .split(',') // spline into an array ["R", "G", "B"]
    .map(x => parseInt(x,10));  // convert to [R, G, B]

const INITIAL_VIEW_STATE = {
  // 서울시청 좌표
  latitude: 37.5663,
  longitude: 126.9779,
  zoom: 11,
  maxZoom: 16,
  pitch: 45,
  bearing: 0
};

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});


const dirLight = new SunLight({
  timestamp: Date.UTC(2019, 7, 1, 22),
  color: [255, 255, 255],
  intensity: 1.0,
//  _shadow: true
  _shadow: false
});

function getTooltip({object}) {
  
  return (
    object && {
      html: `\
      <div><b>${object.properties.adm_nm}</b></div>
      <div> 고령자수 : ${object.properties.population.seniors.toLocaleString()} </div>
      <div> 독거노인 수: ${object.properties.alone} </div>
      <div> 복지관 수: ${object.properties.rec} </div>
      <div> 고령자 비율 : ${((parseFloat(object.properties.population.seniors / object.properties.population.total).toFixed(2))*100).toFixed(0)}%</div> 
      <div> 독거노인 비율 : ${((parseFloat(object.properties.alone / object.properties.population.seniors).toFixed(2))*100).toFixed(0)}%</div> 
  ` ,
    style: {
      backgroundColor: '#FFFFFF',
      color: '#000000',
      fontSize: '15px',
      padding: '10px',
      margin: '0px'
    }
    }
  );
}

// const landCover = [[[-123.0, 49.196], [-123.0, 49.324], [-123.306, 49.324], [-123.306, 49.196]]];

export default function App({data = DATA_URL, mapStyle = 'mapbox://styles/mapbox/dark-v10'}) {

  const [effects] = useState(() => {
    const lightingEffect = new LightingEffect({ambientLight, dirLight});
    lightingEffect.shadowColor = [0, 0, 0, 0.5];
    return [lightingEffect];
  });

  const layers = [
    // only needed when using shadows - a plane for shadows to drop on
  
    // new PolygonLayer({
    //   id: 'ground',
    //   data: landCover,
    //   stroked: false,
    //   getPolygon: f => f,
    //   getFillColor: [0, 0, 0]
    // }),
  
    // reference: https://deck.gl/docs/api-reference/layers/geojson-layer

    new GeoJsonLayer({
      id: 'population',
      data,
      opacity: 1,
      stroked: true,
      filled: true,
      extruded: true,
      wireframe: true,
      material:false,
      autoHighlight: true,
      highlightColor: [225, 225, 0, 100],
      getElevation: f => f.properties.alone,
      getFillColor: f => COLOR_SCALE((f.properties.population.seniors/f.properties.population.total)*10),
      getLineColor: [0, 0, 0],
      pickable: true
    }),

    new GeoJsonLayer({
      id: 'rec',
      data,
      opacity: 0.1,
      stroked: false,
      filled: true,
      material:false,
      extruded: true,
      wireframe: false,
      visible:true,
      getElevation: f => f.properties.rec*2000,
      getFillColor: [255, 255, 255],
      // transitions: {
      //   visible: true
      // }
      // onHover: ({object, x, y}) => {console.log(object +"\n" + x+","+y);}
      // onClick: (event) => { console.log(event); return true; }
    })

  ];

  return (
    <DeckGL
      layers={layers}
      effects={effects}
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      getTooltip={getTooltip}
      // onClick={() => { console.log("DeckGL");  }}
      onHover={()=>{console.log("DeckGL");}}
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

export function renderToDOM(container) {

    const DATA_CSV = "senior_population_Seoul.txt";
    const DATA_JSON = 'HangJeongDong_ver20200701.geojson';
    const DATA_CSV2 = "alone_senior_Seoul.txt";
    const DATA_CSV3 = "senior_rec_Seoul.txt";

    // 두 파일을 비동기적으로 읽기
    Promise.all([
      fetch(DATA_CSV).then(response => response.text()),
      fetch(DATA_JSON).then(response => response.json()),
      fetch(DATA_CSV2).then(response => response.text()),
      fetch(DATA_CSV3).then(response => response.text())
    ])
    .then(function(values) {

      // parse the CVS file using papaparse library function
      const result = readString(values[0]); 
      const result2 = readString(values[2]); 
      const result3 = readString(values[3]); 

      // A helper function to parse numbers with thousand separator
      const parseIntComma = s => parseFloat(s.split(",").join(""));

      // Build population dictionary (동이름을 key로 사용)
      let dict_population = {};
      for(const row of result.data) {
          // 두 데이터의 동이름을 같게 하기 위해 인구데이터의 동이름에 포함된 "."를 모두 "·"로 치환
          let key = row[2].replaceAll(".","·"); 

          // row[12]=row[12].replaceAll("-",0);

          dict_population[key] = {
            total:parseIntComma(row[3]),  // 전체인구
            total_m:parseIntComma(row[4]),  // 남성인구
            total_f:parseIntComma(row[5]),  // 여성인구
            seniors:parseIntComma(row[6]) // 65세 이상인구
          }
      }

      // Build alone dictionary (동이름을 key로 사용)
      let dict_alone = {};
      for(const row of result2.data) {
          // 두 데이터의 동이름을 같게 하기 위해 인구데이터의 동이름에 포함된 "."를 모두 "·"로 치환
          let key = row[2].replaceAll(".","·"); 

          dict_alone[key] = parseIntComma(row[3]); // 독거노인 수
      }

      let dict_rec = {};
      for(const row of result3.data) {
          // 두 데이터의 동이름을 같게 하기 위해 인구데이터의 동이름에 포함된 "."를 모두 "·"로 치환
          let key = row[2].replaceAll(".","·"); 

          row[4]=row[4].replaceAll("-",0);

          dict_rec[key] = parseIntComma(row[4]); // 노인복지관
      }

      // 서울특별시 데이터만 필터링
    let filtered_features = values[1].features.filter(f => f.properties.sidonm == "서울특별시");

    // 각 동마다 인구정보를 추가
    filtered_features.forEach( function(f, idx) {
      // 각 동이름에는 "서울특별시"와 "구명"이 포함되어 있으므로 이를 제거
      this[idx].properties.population = 
        dict_population[ f.properties.adm_nm.split(" ")[2] ];

      this[idx].properties.alone =
        dict_alone[ f.properties.adm_nm.split(" ")[2] ];
      
      this[idx].properties.rec =
        dict_rec[ f.properties.adm_nm.split(" ")[2] ];

    }, filtered_features);

    values[1].features = filtered_features;

    console.log(values[1]);

    render(<App data={values[1]} />, container);
    });
}
