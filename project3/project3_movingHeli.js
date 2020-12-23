//project3_movingHeli.js

"use strict";

const vs = `#version 300 es
in vec4 a_position;
in vec4 a_color;
uniform mat4 u_matrix;
out vec4 v_color;
void main() {
  // Multiply the position by the matrix.
  gl_Position = u_matrix * a_position;

  // Pass the color to the fragment shader.
  v_color = a_color;
}
`;

const fs = `#version 300 es
precision highp float;
// Passed in from the vertex shader.
in vec4 v_color;
uniform vec4 u_colorMult;
uniform vec4 u_colorOffset;
out vec4 outColor;
void main() {
   outColor = v_color * u_colorMult + u_colorOffset;
}
`;

const Node = function () {
  this.children = [];
  this.localMatrix = m4.identity();
  this.worldMatrix = m4.identity();
};

Node.prototype.setParent = function (parent) {
  // remove us from our parent
  if (this.parent) {
    const ndx = this.parent.children.indexOf(this);
    if (ndx >= 0) {
      this.parent.children.splice(ndx, 1);
    }
  }

  // Add us to our new parent
  if (parent) {
    parent.children.push(this);
  }
  this.parent = parent;
};

Node.prototype.updateWorldMatrix = function (matrix) {
  if (matrix) {
    // a matrix was passed in so do the math
    m4.multiply(matrix, this.localMatrix, this.worldMatrix);
  } else {
    // no matrix was passed in so just copy.
    m4.copy(this.localMatrix, this.worldMatrix);
  }

  // now process all the children
  const worldMatrix = this.worldMatrix;
  this.children.forEach(function (child) {
    child.updateWorldMatrix(worldMatrix);
  });
};


// Get A WebGL context
/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('webgl');
const gl = canvas.getContext('webgl2');

// Tell the twgl to match position with a_position, n
// normal with a_normal etc..
twgl.setAttributePrefix("a_");

const cubeBufferInfo = flattenedPrimitives.createCubeBufferInfo(gl, 20);
const cubeBufferInfo_tail = flattenedPrimitives.createCubeBufferInfo(gl, 10);
const cylinderBufferInfo = flattenedPrimitives.createCylinderBufferInfo(gl, 2, 40, 6, 6);
const planeBufferInfo = flattenedPrimitives.createPlaneBufferInfo(gl, 100, 100);

// setup GLSL program
const programInfo = twgl.createProgramInfo(gl, [vs, fs]);

const cubeVAO = twgl.createVAOFromBufferInfo(gl, programInfo, cubeBufferInfo);
const cubeVAO_tail = twgl.createVAOFromBufferInfo(gl, programInfo, cubeBufferInfo_tail);
const cylinderVAO = twgl.createVAOFromBufferInfo(gl, programInfo, cylinderBufferInfo);
const planeVAO = twgl.createVAOFromBufferInfo(gl, programInfo, planeBufferInfo);

function degToRad(d) {
  return d * Math.PI / 180;
}


// Let's make all the nodes
let worldNode = new Node();

// let planeNode = new Node();
// planeNode.localMatrix = m4.multiply(m4.zRotation(degToRad(100)), m4.translation(0, 0, 50), m4.translation(0, 0,50));

// planeNode.drawInfo = {
//   uniforms: {
//     u_colorOffset: [0.2, 0.5, 0.8, 1],  
//     u_colorMult:   [0.1, 0.1, 0.1, 1]
//   },
//   programInfo: programInfo,
//   bufferInfo: planeBufferInfo,
//   vertexArray: planeVAO,
// };


let bodyNode = new Node();
bodyNode.localMatrix = m4.translation(0, 0, 0);  // body = center
bodyNode.drawInfo = {
  uniforms: {
    u_colorOffset: [0.6, 0.6, 0, 1], // yellow
    u_colorMult: [0.4, 0.4, 0, 1]
  },
  programInfo: programInfo,
  bufferInfo: cubeBufferInfo,
  vertexArray: cubeVAO,
};

let wingNode = new Node();
wingNode.localMatrix = m4.translation(0, 0, 15);
wingNode.drawInfo = {
  uniforms: {
    u_colorOffset: [0.6, 0.6, 0.6, 1],  // gray
    u_colorMult: [0.1, 0.1, 0.1, 1]
  },
  programInfo: programInfo,
  bufferInfo: cylinderBufferInfo,
  vertexArray: cylinderVAO,
};

let tailgNode = new Node();
tailgNode.localMatrix = m4.translation(-13, 0, 0);
tailgNode.drawInfo = {
  uniforms: {
    u_colorOffset: [0.2, 0.5, 0.8, 1],  // blue-green
    u_colorMult: [0.8, 0.5, 0.2, 1]
  },
  programInfo: programInfo,
  bufferInfo: cubeBufferInfo_tail,
  vertexArray: cubeVAO_tail,
};

// connect the celetial objects
// planeNode.setParent(worldNode);
bodyNode.setParent(worldNode);
wingNode.setParent(bodyNode);
tailgNode.setParent(bodyNode);

const objects = [
  bodyNode,
  wingNode,
  tailgNode,
  // planeNode
];

const objectsToDraw = [
  bodyNode.drawInfo,
  wingNode.drawInfo,
  tailgNode.drawInfo,
  // planeNode.drawInfo
];

let distance = degToRad(60);
let azimuth = degToRad(30);
let altitude = 80;
let zaxis = 0; //-2.3
let movex = 0;
let movey = 0;
let bullet = 0; // bullet <10

function main() {
  refresh();
  requestAnimationFrame(drawScene);
  // Draw the scene.
  function drawScene() {
    twgl.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Clear the canvas AND the depth buffer.
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Compute the projection matrix
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix =
      m4.perspective(distance, aspect, 1, 2000);

    // Compute the camera's matrix using look at.
    let cameraz = m4.zRotation(zaxis);
    cameraz = m4.translate(cameraz, 0, -200, 0);

    const cameraPosition = [
      cameraz[12],
      cameraz[13],
      cameraz[14] + altitude,
    ]; // world up&down

    // const cameraPosition = [0, -200, altitude];
    const target = [0, 0, 0];
    const up = [0, 0, 1];
    const cameraMatrix = m4.lookAt(cameraPosition, target, up);

    // Make a view matrix from the camera matrix.
    const viewMatrix = m4.inverse(cameraMatrix);

    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    gl.useProgram(programInfo.program);

    // update the local matrices for each object.
    m4.multiply(m4.zRotation(0.05), wingNode.localMatrix, wingNode.localMatrix);

    // bulletmove

    // Update all world matrices in the scene graph
    worldNode.updateWorldMatrix();

    // Compute all the matrices for rendering
    objects.forEach(function (object) {
      object.drawInfo.uniforms.u_matrix = m4.multiply(viewProjectionMatrix, object.worldMatrix);
    });

    // ------ Draw the objects --------
    twgl.drawObjectList(gl, objectsToDraw);

    requestAnimationFrame(drawScene);
  }

  document.addEventListener('keydown', onKeyDown, false);
}

function onKeyDown(event) {
  console.log("get key is : " + event.key);

  //double key
  if (event.key == 'ArrowUp' && event.shiftKey) { // up
    altitude = altitude + 10;
  } else if (event.key == 'ArrowDown' && event.shiftKey) { // down
    altitude = altitude - 10;
  } else if (event.key == 'ArrowLeft' && event.shiftKey) { // z-axis
    zaxis = zaxis - 0.1;
  } else if (event.key == 'ArrowRight' && event.shiftKey) { // z-axis
    zaxis = zaxis + 0.1;
  }

  // one key
  else if (event.key == 'ArrowLeft') { // rot left
    azimuth = azimuth + 0.1;
  }
  else if (event.key == 'ArrowRight') { // rot right
    azimuth = azimuth - 0.1;
  }
  else if (event.key == '=' || event.key == '+') { // zoom in
    distance = 0.1 * parseFloat(distance * 10 - 1);
  }
  else if (event.key == '-' || event.key == '_') { // zoom out
    distance = 0.1 * parseFloat(distance * 10 + 1);
  }
  else if (event.key == 'ArrowUp') { // move go
    movex = movex + 10;
  }
  else if (event.key == 'ArrowDown') { // move back
    movex = movex - 10;
  }
  else if (event.key == 'a' || event.key == 'A') { // move up
    movey = movey + 10;
  }
  else if (event.key == 'z' || event.key == 'Z') { // move down
    movey = movey - 10;
  }

  refresh();

  if (event.key == ' ') { // make light
    // console.log("get key move space");
    // make light
    console.log("bullet count " + bullet);
    if(bullet<9){ // add bullet
      bullet++;
      console.log("add bullet");
      // let bulletNode = new Node();
      // bulletNode.localMatrix = m4.translation(0, 0, 1);
      // bulletNode.drawInfo = {
      //   uniforms: {
      //     u_colorOffset: [1, 1, 1, 1],  // gray
      //     u_colorMult: [0.1, 0.1, 0.1, 1]
      //   },
      //   programInfo: programInfo,
      //   bufferInfo: cylinderBufferInfo,
      //   vertexArray: cylinderVAO,
      // };
    } 
    
  }
}
function refresh() {
  twgl.resizeCanvasToDisplaySize(gl.canvas);

  // Tell WebGL how to convert from clip space to pixels
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  // Clear the canvas AND the depth buffer.
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Compute the projection matrix
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const projectionMatrix =
    m4.perspective(distance, aspect, 1, 2000); //distance => zoom

  // Compute the camera's matrix using look at.
  let cameraz = m4.zRotation(zaxis);
  cameraz = m4.translate(cameraz, 0, -200, 0);

  const cameraPosition = [
    cameraz[12],
    cameraz[13],
    cameraz[14] + altitude,
  ]; // world up&down

  const target = [0, 0, 0];
  const up = [0, 0, 1];
  const cameraMatrix = m4.lookAt(cameraPosition, target, up);

  // Make a view matrix from the camera matrix.
  const viewMatrix = m4.inverse(cameraMatrix);

  const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

  gl.useProgram(programInfo.program);
  // update the local matrices for each object.
  m4.multiply(m4.zRotation(0.05), wingNode.localMatrix, wingNode.localMatrix); // wing

  bodyNode.localMatrix = m4.translation(movex, 0, movey); // move
  m4.multiply(m4.zRotation(azimuth), bodyNode.localMatrix, bodyNode.localMatrix); // left&right

  // Update all world matrices in the scene graph
  worldNode.updateWorldMatrix();

  // Compute all the matrices for rendering
  objects.forEach(function (object) {
    object.drawInfo.uniforms.u_matrix = m4.multiply(viewProjectionMatrix, object.worldMatrix);
  });

  // ------ Draw the objects --------
  twgl.drawObjectList(gl, objectsToDraw);

}

main();
