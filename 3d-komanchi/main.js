// http://simulationcorner.net/index.php?page=comanche

var camera = {
  x: 512, // x position on the map
  y: 800, // y position on the map
  height: 78, // height of the camera
  angle: 0, // direction of the camera
  v: -100 // horizon position (look up and down)
};

var depth = 400;

var heightmap = null; // 1024*1024 byte array with height information
var colormap = null; // 1ß24*1ß24 byte array with color indices
var palette = null; // corresponding colors to the color indices

var context = null; // canvas context
var imagedata = null; // byte array with color data

var bufarray = null; // color data
var buf8 = null; // the same array but with bytes
var buf32 = null; // the same array but with 32-Bit words

var kforward = false;
var kbackward = false;
var kleft = false;
var kright = false;
var kup = false;
var kdown = false;
var klookup = false;
var klookdown = false;

var updaterunning = false;
var kpressed = false;

function UpdateCamera() {
  kpressed = false;
  if (kleft) {
    camera.angle += 0.1;
    kpressed = true;
  }
  if (kright) {
    camera.angle -= 0.1;
    kpressed = true;
  }
  if (kforward) {
    camera.x -= 3 * Math.sin(camera.angle);
    camera.y -= 3 * Math.cos(camera.angle);
    kpressed = true;
  }
  if (kbackward) {
    camera.x += 3 * Math.sin(camera.angle);
    camera.y += 3 * Math.cos(camera.angle);
    kpressed = true;
  }
  if (kup) {
    camera.height += 2;
    kpressed = true;
  }
  if (kdown) {
    camera.height -= 2;
    kpressed = true;
  }
  if (klookup) {
    camera.v += 2;
    kpressed = true;
  }
  if (klookdown) {
    camera.v -= 2;
    kpressed = true;
  }
}

function Update() {
  updaterunning = true;
  UpdateCamera();
  var size = imagedata.width * imagedata.height;
  // fill background with light blue
  var col = 0xFFFFA0A0;
  for (var i = 0; i < buf32.length; i++) buf32[i] = col | 0;

  var sinang = Math.sin(camera.angle);
  var cosang = Math.cos(camera.angle);

  for (var i = 0; i < imagedata.width; i++) {
    // for one column calculate the end position of the ray in relative coordinates
    var x3d = (i - imagedata.width / 2) * 1.5 * 1.5;
    var y3d = -depth * 1.5;

    // rotate this position
    var rotx = cosang * x3d + sinang * y3d;
    var roty = -sinang * x3d + cosang * y3d;

    Raycast(i | 0, camera.x, camera.y, rotx + camera.x, roty + camera.y, y3d / Math.sqrt(x3d * x3d + y3d * y3d));
  }

  // The image rendered, now show it on screen
  // the fast variant
  imagedata.data.set(buf8);

  // the slow variant
  //var buffer = new Uint32Array(imagedata.data.buffer);
  //for (var i = 0; i < size; i++) buffer[i] = buf32[i];
  context.putImageData(imagedata, 0, 0);

  if (!kpressed) {
    updaterunning = false;
    return;
  }
  window.setTimeout(Update, 0); // restart loop, but stay responsive
}

// line: vertical line to compute
// x1, y1: start point on map for ray
// x2, y2: end point on map for ray
// d: correction parameter for the perspective
function Raycast(line, x1, y1, x2, y2, d) {
  var hmap = heightmap; // local variables to increase the speed
  var cmap = colormap;
  var palmap = palette;
  var image = imagedata;
  var dx = x2 - x1;
  var dy = y2 - y1;

  var r = Math.floor(Math.sqrt(dx * dx + dy * dy)) | 0; // distance between start and end point

  // calculate stepsize in x and y direction
  dx = dx / r;
  dy = dy / r;

  // we draw from the front to the back
  var ymin = 256; // used for occlusion
  for (var i = 1; i < r | 0; i++) {
    x1 += dx;
    y1 += dy;

    // Get offset on the map. Consider periodic boundary conditions.
    // Because of the size of the map (power of two), we can use a "logical and" fpr periodicity.
    var mapoffset = ((Math.floor(y1) & 1023) << 10) + (Math.floor(x1) & 1023) | 0;

    // get height and color
    var h = camera.height - hmap[mapoffset | 0];

    // perspective calculation
    var y3 = Math.abs(d) * i;
    var z3 = Math.floor(h / y3 * 100 - camera.v) | 0;

    // Draw vertical line
    if (z3 < 0) z3 = 0;
    if (z3 < imagedata.height - 1) {
      // get offset on screen for the vertical line
      var offset = (((z3 | 0) * image.width) + line) | 0;

      // old VGA mode used a palette for the colors
      var col = palette[cmap[mapoffset | 0] | 0] | 0;

      for (var k = z3 | 0; k < ymin | 0; k++) {
        buf32[offset | 0] = col | 0;
        offset = offset + image.width | 0;
      }
    }
    if (ymin > z3) ymin = z3 | 0;
  }
}

function DetectKeysDown(e) {
  switch (e.keyCode) {
    case 37: // left cursor
    case 65: // a
      kleft = true;
      break;
    case 39: // right cursor
    case 68: // d
      kright = true;
      break;
    case 38: // cursor up
    case 87: // w
      kforward = true;
      break;
    case 40: // cursor down
    case 83: // s
      kbackward = true;
      break;
    case 82: // r
      kup = true;
      break;
    case 70: // f
      kdown = true;
      break;
    case 69: // e
      klookup = true;
      break;
    case 81: //q
      klookdown = true;
      break;
    default:
      return;
  }
  if (!updaterunning) Update();
  return false;
}

function DetectKeysUp(e) {
  switch (e.keyCode) {
    case 37: // left cursor
    case 65: // a
      kleft = false;
      break;

    case 39: // right cursor
    case 68: // d
      kright = false;
      break;
    case 38: // cursor up
    case 87: // w
      kforward = false;
      break;
    case 40: // cursor down
    case 83: // s
      kbackward = false;
      break;
    case 82: // r
      kup = false;
      break;
    case 70: // f
      kdown = false;
      break;
    case 69: // e
      klookup = false;
      break;
    case 81: //q
      klookdown = false;
      break;
    default:
      return;
  }
  return false;
}

function load_binary_resource(url, type) {
  var req = new XMLHttpRequest();
  req.open('GET', url, true);
  req.responseType = "arraybuffer";
  req.onload = function(e) {
    var arrayBuffer = req.response;
    if (arrayBuffer) {
      //alert(url);
      //terrible solution
      if (type == 1) {
        heightmap = new Uint8Array(arrayBuffer);
      }
      if (type == 2) {
        colormap = new Uint8Array(arrayBuffer);
      }
      if (type == 3) {
        palmap = new Uint8Array(arrayBuffer);
        // old VGA mode used a palette for the colors
        for (var i = 0; i < 256; i++) {
          palette[i] = 0xFF000000 | ((palmap[i * 3 + 2]) << 16) | ((palmap[i * 3 + 1]) << 8) | (palmap[i * 3 + 0]);
        }

      }
      if (!updaterunning) Update();
    }
  };
  req.send(null);
}


function LoadMap(index) {
  load_binary_resource('data/map' + index + '.palette', 3);
  load_binary_resource('data/map' + index + '.height', 1);
  load_binary_resource('data/map' + index + '.color', 2);
}


function Init() {
  heightmap = new Uint8Array(1024 * 1024);
  colormap = new Uint8Array(1024 * 1024);
  palette = new Uint32Array(256);

  LoadMap(0);
  var canvas = document.getElementById('testcanvas1');
  if (canvas.getContext) {
    context = canvas.getContext('2d');
    imagedata = context.createImageData(canvas.width, canvas.height);
  }

  bufarray = new ArrayBuffer(imagedata.width * imagedata.height * 4);
  buf8 = new Uint8Array(bufarray);
  buf32 = new Uint32Array(bufarray);

  document.onkeydown = DetectKeysDown;
  document.onkeyup = DetectKeysUp;
  Update();
}
