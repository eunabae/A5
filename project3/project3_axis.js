//project3_axis.js

import { Shader } from "../modules/class_shader.mjs"
import * as mat4 from "../lib/gl-matrix/mat4.js"
import { toRadian } from "../lib/gl-matrix/common.js"

"use strict";

function main() {

  const loc_aPosition = 3;
  const loc_aColor = 7;
  const src_vert =
    `#version 300 es
    layout(location=${loc_aPosition}) in vec4 aPosition;
    layout(location=${loc_aColor}) in vec4 aColor;
    uniform mat4 uMVP;
    out vec4 vColor;
    void main() {
        gl_Position = uMVP * aPosition;
        vColor = aColor;
    }`;

  const src_frag =
    `#version 300 es
    precision mediump float;
    in vec4 vColor;
    out vec4 fColor;
    void main() {
        fColor = vColor;
    }`;


  const canvas = document.getElementById('webgl');
  const gl = canvas.getContext('webgl2');

  const prog = new Shader(gl, src_vert, src_frag, ["uMVP"]);
  gl.useProgram(prog.h_prog);

  const cube = initVertexBuffers({gl, loc_aPosition, loc_aColor});
  const plane = initPlaneVertexBuffers({gl, loc_aPosition, loc_aColor});
  const axes = initAxes({ gl, loc_aPosition, loc_aColor });

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  let MVP = mat4.create();

  document.addEventListener('keydown', onKeyDown, false);
  refresh({gl, prog, cube, axes,plane, MVP});
}

function onKeyDown(event) {
  console.log("get key is : " + event.key);

  // //double key
  // if (event.key == 'ArrowUp' && event.shiftKey) { // up
  //   altitude = altitude + 10;
  // } else if (event.key == 'ArrowDown' && event.shiftKey) { // down
  //   altitude = altitude - 10;
  // } else if (event.key == 'ArrowLeft' && event.shiftKey) { // z-axis
  //   zaxis = zaxis - 0.1;
  // } else if (event.key == 'ArrowRight' && event.shiftKey) { // z-axis
  //   zaxis = zaxis + 0.1;
  // }

  // // one key
  // else if (event.key == 'ArrowLeft') { // rot left
  //   azimuth = azimuth + 0.1;
  // }
  // else if (event.key == 'ArrowRight') { // rot right
  //   azimuth = azimuth - 0.1;
  // }
  // else if (event.key == '=' || event.key == '+') { // zoom in
  //   distance = 0.1 * parseFloat(distance * 10 - 1);
  // }
  // else if (event.key == '-' || event.key == '_') { // zoom out
  //   distance = 0.1 * parseFloat(distance * 10 + 1);
  // }
  // else if (event.key == 'ArrowUp') { // move go
  //   movex = movex + 10;
  // }
  // else if (event.key == 'ArrowDown') { // move back
  //   movex = movex - 10;
  // }
  // else if (event.key == 'a' || event.key == 'A') { // move up
  //   movey = movey + 10;
  // }
  // else if (event.key == 'z' || event.key == 'Z') { // move down
  //   movey = movey - 10;
  // }

  // refresh();

  // if (event.key == ' ') { // make light
  //   // console.log("get key move space");
  //   // make light
  //   console.log("bullet count " + bullet);
  //   if(bullet<9){ // add bullet
  //     bullet++;
  //     console.log("add bullet");
  //     // let bulletNode = new Node();
  //     // bulletNode.localMatrix = m4.translation(0, 0, 1);
  //     // bulletNode.drawInfo = {
  //     //   uniforms: {
  //     //     u_colorOffset: [1, 1, 1, 1],  // gray
  //     //     u_colorMult: [0.1, 0.1, 0.1, 1]
  //     //   },
  //     //   programInfo: programInfo,
  //     //   bufferInfo: cylinderBufferInfo,
  //     //   vertexArray: cylinderVAO,
  //     // };
  //   } 
    
  // }
}

function refresh({gl, prog, cube, axes,plane, MVP}){
  console.log("refresh");

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  // Clear the canvas AND the depth buffer.
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

  mat4.identity(MVP);
  mat4.perspective(MVP, toRadian(60), aspect, 1, 2000); // camera
  mat4.translate(MVP, MVP, [0, 0, -10]);
  mat4.rotate(MVP, MVP, toRadian(30), [1, 0, 0]); // axis show
  mat4.rotate(MVP, MVP, toRadian(-30), [0, 1, 0]); 

  gl.uniformMatrix4fv(prog.loc_uniforms["uMVP"], false, MVP);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.bindVertexArray(plane.vao);
  gl.drawElements(gl.TRIANGLES, plane.n, gl.UNSIGNED_BYTE, 0);
  gl.bindVertexArray(null);

  gl.bindVertexArray(cube.vao);
  gl.drawElements(gl.TRIANGLES, cube.n, gl.UNSIGNED_BYTE, 0);
  gl.bindVertexArray(null);

  gl.bindVertexArray(axes.vao);
  gl.drawArrays(gl.LINES, 0, axes.n);
  gl.bindVertexArray(null);
}

function initAxes({ gl, loc_aPosition, loc_aColor }) {
  const vertices = new Float32Array([
    0, 0, 0, 50, 0, 0,
    100, 0, 0, 50, 0, 0,
    0, 0, 0, 0, 50, 0,
    0, 100, 0, 0, 50, 0,
    0, 0, 0, 0, 0, 50,
    0, 0, 100, 0, 0, 50
  ]);
  let vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer();   // Create a buffer object

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const SZ = vertices.BYTES_PER_ELEMENT;

  gl.vertexAttribPointer(loc_aPosition, 3, gl.FLOAT, false, SZ * 6, 0);
  gl.enableVertexAttribArray(loc_aPosition);

  gl.vertexAttribPointer(loc_aColor, 3, gl.FLOAT, false, SZ * 6, SZ * 3);
  gl.enableVertexAttribArray(loc_aColor);

  gl.bindVertexArray(null);

  return { vao, n: 6 };
}

function initVertexBuffers({gl, loc_aPosition, loc_aColor}) {
  // Create a cube
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3

    const vertices = new Float32Array([   // Vertex coordinates
       1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0,  // v0-v1-v2-v3 front
       1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0,  // v0-v3-v4-v5 right
       1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0,  // v0-v5-v6-v1 up
      -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0,  // v1-v6-v7-v2 left
      -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0,  // v7-v4-v3-v2 down
       1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0   // v4-v7-v6-v5 back
    ]);
    
    const colors = new Float32Array([     // Colors
      0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  // v0-v1-v2-v3 front(blue)
      0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  // v0-v3-v4-v5 right(green)
      1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  // v0-v5-v6-v1 up(red)
      1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  // v1-v6-v7-v2 left
      1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  // v7-v4-v3-v2 down
      0.4, 1.0, 1.0,  0.4, 1.0, 1.0,  0.4, 1.0, 1.0,  0.4, 1.0, 1.0   // v4-v7-v6-v5 back
    ]);
    
    const indices = new Uint8Array([       // Indices of the vertices
       0, 1, 2,   0, 2, 3,    // front
       4, 5, 6,   4, 6, 7,    // right
       8, 9,10,   8,10,11,    // up
      12,13,14,  12,14,15,    // left
      16,17,18,  16,18,19,    // down
      20,21,22,  20,22,23     // back
    ]);

    let vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    // Create a buffer object
    const indexBuffer = gl.createBuffer();
    if (!indexBuffer) 
      return -1;
    
    // Write the vertex coordinates and color to the buffer object
    if (!initArrayBuffer(gl, vertices, 3, gl.FLOAT, loc_aPosition))
      return -1;
    
    if (!initArrayBuffer(gl, colors, 3, gl.FLOAT, loc_aColor))
      return -1;
    
    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    
    gl.bindVertexArray(null);
    
    return {vao, n:indices.length};
}

function initPlaneVertexBuffers({gl, loc_aPosition, loc_aColor}) {
  //    v2----- v1
  //   /        /
  //  v3------v0


    const vertices = new Float32Array([   // Vertex coordinates
       15.0, 0.0, 15.0,   15.0, 0.0,-15.0,  -15.0, 0.0,-15.0,  -15.0, 0.0, 15.0  // v0-v1-v2-v3 up
    ]);
    
    const colors = new Float32Array([     // Colors
      0.5, 0.5, 0.5, 0.5, 0.5, 0.5,0.5, 0.5, 0.5,0.5, 0.5, 0.5  // v0-v1-v2-v3 up(red)
    ]);
    
    const indices = new Uint8Array([       // Indices of the vertices
       0, 1, 2,   0, 2, 3,  // 012 - 023
    ]);

    let vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    // Create a buffer object
    const indexBuffer = gl.createBuffer();
    if (!indexBuffer) 
      return -1;
    
    // Write the vertex coordinates and color to the buffer object
    if (!initArrayBuffer(gl, vertices, 3, gl.FLOAT, loc_aPosition))
      return -1;
    
    if (!initArrayBuffer(gl, colors, 3, gl.FLOAT, loc_aColor))
      return -1;
    
    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    
    gl.bindVertexArray(null);
    
    return {vao, n:indices.length};
}

function initArrayBuffer(gl, data, num, type, loc_attribute) {
    const buffer = gl.createBuffer();   // Create a buffer object
    if (!buffer) {
      console.log('Failed to create the buffer object');
      return false;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    // Assign the buffer object to the attribute variable
    gl.vertexAttribPointer(loc_attribute, num, type, false, 0, 0);
    // Enable the assignment of the buffer object to the attribute variable
    gl.enableVertexAttribArray(loc_attribute);
    
    return true;
}

main();

/*
    let texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + 0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA, 1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,
    new Uint8Array([0,0,255,255]));

  let image = new Image();
  image.src = "https://webgl2fundamentals.org/webgl/resources/f-texture.png";
  image.addEventListener('load',function(){
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
*/

