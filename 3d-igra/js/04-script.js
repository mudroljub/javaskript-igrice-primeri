import { map, itemTypes, mapItems, enemyTypes, mapEnemies } from '/js/map.js'
import { $, dc } from '/js/helpers.js'
import { player } from '/js/player.js'
import { miniMapScale, screenWidth, screenHeight, showOverlay, stripWidth, numRays, viewDist, twoPI, numTextures, wallTextures, useSingleTexture } from '/js/config.js'

const screenStrips = []
let mapWidth = 0
let mapHeight = 0
let overlay
let fps = 0
let overlayText = ''

function init() {

  mapWidth = map[0].length
  mapHeight = map.length

  bindKeys()

  initScreen()

  initSprites()

  initEnemies()

  drawMiniMap()

  gameCycle()
  renderCycle()
}

const enemies = []

function initEnemies() {
  const screen = $('screen')

  for (let i = 0; i < mapEnemies.length; i++) {
    const enemy = mapEnemies[i]
    const type = enemyTypes[enemy.type]
    const img = dc('img')
    img.src = type.img
    img.style.display = 'none'
    img.style.position = 'absolute'

    enemy.state = 0
    enemy.rot = 0
    enemy.rotDeg = 0
    enemy.dir = 0
    enemy.speed = 0
    enemy.moveSpeed = type.moveSpeed
    enemy.rotSpeed = type.rotSpeed
    enemy.totalStates = type.totalStates

    enemy.oldStyles = {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      clip: '',
      display: 'none',
      zIndex: 0
    }

    enemy.img = img
    enemies.push(enemy)

    screen.appendChild(img)
  }
}

let spriteMap
let visibleSprites = []
let oldVisibleSprites = []

function initSprites() {
  spriteMap = []
  for (let y = 0; y < map.length; y++)
    spriteMap[y] = []

  const screen = $('screen')

  for (let i = 0; i < mapItems.length; i++) {
    const sprite = mapItems[i]
    const itemType = itemTypes[sprite.type]
    const img = dc('img')
    img.src = itemType.img
    img.style.display = 'none'
    img.style.position = 'absolute'

    sprite.visible = false
    sprite.block = itemType.block
    sprite.img = img

    spriteMap[sprite.y][sprite.x] = sprite
    screen.appendChild(img)
  }

}

let lastGameCycleTime = 0
const gameCycleDelay = 1000 / 30 // aim for 30 fps for game logic

function gameCycle() {
  const now = new Date().getTime()

  // time since last game logic
  const timeDelta = now - lastGameCycleTime

  move(player, timeDelta)

  ai(timeDelta)

  let cycleDelay = gameCycleDelay

  // the timer will likely not run that fast due to the rendering cycle hogging the cpu
  // so figure out how much time was lost since last cycle

  if (timeDelta > cycleDelay)
    cycleDelay = Math.max(1, cycleDelay - (timeDelta - cycleDelay))

  setTimeout(gameCycle, cycleDelay)

  lastGameCycleTime = now
}

function ai(timeDelta) {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i]

    const dx = player.x - enemy.x
    const dy = player.y - enemy.y

    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 4) {
      const angle = Math.atan2(dy, dx)

      enemy.rotDeg = angle * 180 / Math.PI
      enemy.rot = angle
      enemy.speed = 1

      const walkCycleTime = 1000
      const numWalkSprites = 4

      enemy.state = Math.floor((new Date() % walkCycleTime) / (walkCycleTime / numWalkSprites)) + 1

    } else {
      enemy.state = 0
      enemy.speed = 0
    }

    move(enemies[i], timeDelta)
  }
}

let lastRenderCycleTime = 0

function renderCycle() {

  updateMiniMap()

  clearSprites()

  castRays()

  renderSprites()

  renderEnemies()

  // time since last rendering
  const now = new Date().getTime()
  const timeDelta = now - lastRenderCycleTime
  let cycleDelay = 1000 / 30
  if (timeDelta > cycleDelay)
    cycleDelay = Math.max(1, cycleDelay - (timeDelta - cycleDelay))

  lastRenderCycleTime = now
  setTimeout(renderCycle, cycleDelay)

  fps = 1000 / timeDelta
  if (showOverlay)
    updateOverlay()

}

function clearSprites() {
  // clear the visible sprites array but keep a copy in oldVisibleSprites for later.
  // also mark all the sprites as not visible so they can be added to visibleSprites again during raycasting.
  oldVisibleSprites = []
  for (let i = 0; i < visibleSprites.length; i++) {
    const sprite = visibleSprites[i]
    oldVisibleSprites[i] = sprite
    sprite.visible = false
  }
  visibleSprites = []
}

function renderSprites() {

  for (var i = 0; i < visibleSprites.length; i++) {
    var sprite = visibleSprites[i]
    const {img} = sprite
    img.style.display = 'block'

    // translate position to viewer space
    const dx = sprite.x + 0.5 - player.x
    const dy = sprite.y + 0.5 - player.y

    // distance to sprite
    const dist = Math.sqrt(dx * dx + dy * dy)

    // sprite angle relative to viewing angle
    const spriteAngle = Math.atan2(dy, dx) - player.rot

    // size of the sprite
    const size = viewDist / (Math.cos(spriteAngle) * dist)

    if (size <= 0) continue

    // x-position on screen
    const x = Math.tan(spriteAngle) * viewDist

    img.style.left = (screenWidth / 2 + x - size / 2) + 'px'

    // y is constant since we keep all sprites at the same height and vertical position
    img.style.top = ((screenHeight - size) / 2) + 'px'

    img.style.width = size + 'px'
    img.style.height = size + 'px'

    const dbx = sprite.x - player.x
    const dby = sprite.y - player.y
    const blockDist = dbx * dbx + dby * dby
    img.style.zIndex = -Math.floor(blockDist * 1000)
  }

  // hide the sprites that are no longer visible
  for (var i = 0; i < oldVisibleSprites.length; i++) {
    var sprite = oldVisibleSprites[i]
    if (visibleSprites.indexOf(sprite) < 0) {
      sprite.visible = false
      sprite.img.style.display = 'none'
    }
  }

}

function renderEnemies() {

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i]
    const {img} = enemy

    const dx = enemy.x - player.x
    const dy = enemy.y - player.y

    let angle = Math.atan2(dy, dx) - player.rot

    if (angle < -Math.PI) angle += 2 * Math.PI
    if (angle >= Math.PI) angle -= 2 * Math.PI

    // is enemy in front of player? Maybe use the FOV value instead.
    if (angle > -Math.PI * 0.5 && angle < Math.PI * 0.5) {
      const distSquared = dx * dx + dy * dy
      const dist = Math.sqrt(distSquared)
      const size = viewDist / (Math.cos(angle) * dist)

      if (size <= 0) continue

      const x = Math.tan(angle) * viewDist

      const {style} = img
      const {oldStyles} = enemy

      // height is equal to the sprite size
      if (size != oldStyles.height) {
        style.height = size + 'px'
        oldStyles.height = size
      }

      // width is equal to the sprite size times the total number of states
      const styleWidth = size * enemy.totalStates
      if (styleWidth != oldStyles.width) {
        style.width = styleWidth + 'px'
        oldStyles.width = styleWidth
      }

      // top position is halfway down the screen, minus half the sprite height
      const styleTop = ((screenHeight - size) / 2)
      if (styleTop != oldStyles.top) {
        style.top = styleTop + 'px'
        oldStyles.top = styleTop
      }

      // place at x position, adjusted for sprite size and the current sprite state
      const styleLeft = (screenWidth / 2 + x - size / 2 - size * enemy.state)
      if (styleLeft != oldStyles.left) {
        style.left = styleLeft + 'px'
        oldStyles.left = styleLeft
      }

      const styleZIndex = -(distSquared * 1000) >> 0
      if (styleZIndex != oldStyles.zIndex) {
        style.zIndex = styleZIndex
        oldStyles.zIndex = styleZIndex
      }

      var styleDisplay = 'block'
      if (styleDisplay != oldStyles.display) {
        style.display = styleDisplay
        oldStyles.display = styleDisplay
      }

      const styleClip = 'rect(0, ' + (size * (enemy.state + 1)) + ', ' + size + ', ' + (size * (enemy.state)) + ')'
      if (styleClip != oldStyles.clip) {
        style.clip = styleClip
        oldStyles.clip = styleClip
      }
    } else {
      var styleDisplay = 'none'
      if (styleDisplay != enemy.oldStyles.display) {
        img.style.display = styleDisplay
        enemy.oldStyles.display = styleDisplay
      }
    }
  }
}

function updateOverlay() {
  overlay.innerHTML = 'FPS: ' + fps.toFixed(1) + '<br/>' + overlayText
  overlayText = ''
}

function initScreen() {

  const screen = $('screen')

  for (let i = 0; i < screenWidth; i += stripWidth) {
    const strip = dc('img')
    strip.style.position = 'absolute'
    strip.style.height = '0px'
    strip.style.left = strip.style.top = '0px'

    if (useSingleTexture)
      strip.src = (window.opera ? 'sprites/walls_19color.png' : 'sprites/walls.png')

    strip.oldStyles = {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      clip: '',
      src: ''
    }

    screenStrips.push(strip)
    screen.appendChild(strip)
  }

  // overlay div for adding text like fps count, etc.
  overlay = dc('div')
  overlay.id = 'overlay'
  overlay.style.display = showOverlay ? 'block' : 'none'
  screen.appendChild(overlay)

}

// bind keyboard events to game functions (movement, etc)
function bindKeys() {

  document.onkeydown = function(e) {
    e = e || window.event

    switch (e.keyCode) { // which key was pressed?

      case 38: // up, move player forward, ie. increase speed
        player.speed = 1
        break

      case 40: // down, move player backward, set negative speed
        player.speed = -1
        break

      case 37: // left, rotate player left
        player.dir = -1
        break

      case 39: // right, rotate player right
        player.dir = 1
        break
    }
  }

  document.onkeyup = function(e) {
    e = e || window.event

    switch (e.keyCode) {
      case 38:
      case 40:
        player.speed = 0 // stop the player movement when up/down key is released
        break
      case 37:
      case 39:
        player.dir = 0
        break
    }
  }
}

function castRays() {
  let stripIdx = 0

  for (let i = 0; i < numRays; i++) {
    // where on the screen does ray go through?
    const rayScreenPos = (-numRays / 2 + i) * stripWidth

    // the distance from the viewer to the point on the screen, simply Pythagoras.
    const rayViewDist = Math.sqrt(rayScreenPos * rayScreenPos + viewDist * viewDist)

    // the angle of the ray, relative to the viewing direction.
    // right triangle: a = sin(A) * c
    const rayAngle = Math.asin(rayScreenPos / rayViewDist)

    castSingleRay(
      player.rot + rayAngle, // add the players viewing direction to get the angle in world space
      stripIdx++
    )
  }
}

function castSingleRay(rayAngle, stripIdx) {

  // first make sure the angle is between 0 and 360 degrees
  rayAngle %= twoPI
  if (rayAngle < 0) rayAngle += twoPI

  // moving right/left? up/down? Determined by which quadrant the angle is in.
  const right = (rayAngle > twoPI * 0.75 || rayAngle < twoPI * 0.25)
  const up = (rayAngle < 0 || rayAngle > Math.PI)

  let wallType = 0

  // only do these once
  const angleSin = Math.sin(rayAngle)
  const angleCos = Math.cos(rayAngle)

  let dist = 0 // the distance to the block we hit
  let xHit = 0 // the x and y coord of where the ray hit the block
  let yHit = 0
  let xWallHit = 0
  let yWallHit = 0

  let textureX // the x-coord on the texture of the block, ie. what part of the texture are we going to render
  var wallX // the (x,y) map coords of the block
  var wallY

  let wallIsShaded = false

  let wallIsHorizontal = false

  // first check against the vertical map/wall lines
  // we do this by moving to the right or left edge of the block we're standing in
  // and then moving in 1 map unit steps horizontally. The amount we have to move vertically
  // is determined by the slope of the ray, which is simply defined as sin(angle) / cos(angle).

  var slope = angleSin / angleCos // the slope of the straight line made by the ray
  const dXVer = right ? 1 : -1 // we move either 1 map unit to the left or right
  const dYVer = dXVer * slope // how much to move up or down

  var x = right ? Math.ceil(player.x) : Math.floor(player.x) // starting horizontal position, at one of the edges of the current map block
  var y = player.y + (x - player.x) * slope // starting vertical position. We add the small horizontal step we just made, multiplied by the slope.

  while (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
    var wallX = (x + (right ? 0 : -1)) >> 0
    var wallY = (y) >> 0

    if (spriteMap[wallY][wallX] && !spriteMap[wallY][wallX].visible) {
      spriteMap[wallY][wallX].visible = true
      visibleSprites.push(spriteMap[wallY][wallX])
    }

    // is this point inside a wall block?
    if (map[wallY][wallX] > 0) {

      var distX = x - player.x
      var distY = y - player.y
      dist = distX * distX + distY * distY // the distance from the player to this point, squared.

      wallType = map[wallY][wallX] // we'll remember the type of wall we hit for later
      textureX = y % 1 // where exactly are we on the wall? textureX is the x coordinate on the texture that we'll use later when texturing the wall.
      if (!right) textureX = 1 - textureX // if we're looking to the left side of the map, the texture should be reversed

      xHit = x // save the coordinates of the hit. We only really use these to draw the rays on minimap.
      yHit = y
      xWallHit = wallX
      yWallHit = wallY

      // make horizontal walls shaded
      wallIsShaded = true

      wallIsHorizontal = true

      break
    }
    x += dXVer
    y += dYVer
  }

  // now check against horizontal lines. It's basically the same, just "turned around".
  // the only difference here is that once we hit a map block,
  // we check if there we also found one in the earlier, vertical run. We'll know that if dist != 0.
  // If so, we only register this hit if this distance is smaller.

  var slope = angleCos / angleSin
  const dYHor = up ? -1 : 1
  const dXHor = dYHor * slope
  var y = up ? Math.floor(player.y) : Math.ceil(player.y)
  var x = player.x + (y - player.y) * slope

  while (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) {
    var wallY = (y + (up ? -1 : 0)) >> 0
    var wallX = (x) >> 0

    if (spriteMap[wallY][wallX] && !spriteMap[wallY][wallX].visible) {
      spriteMap[wallY][wallX].visible = true
      visibleSprites.push(spriteMap[wallY][wallX])
    }

    if (map[wallY][wallX] > 0) {
      var distX = x - player.x
      var distY = y - player.y
      const blockDist = distX * distX + distY * distY
      if (!dist || blockDist < dist) {
        dist = blockDist
        xHit = x
        yHit = y
        xWallHit = wallX
        yWallHit = wallY

        wallType = map[wallY][wallX]
        textureX = x % 1
        if (up) textureX = 1 - textureX

        wallIsShaded = false
      }
      break
    }
    x += dXHor
    y += dYHor
  }

  if (dist) {
    // drawRay(xHit, yHit);

    const strip = screenStrips[stripIdx]

    dist = Math.sqrt(dist)

    // use perpendicular distance to adjust for fish eye
    // distorted_dist = correct_dist / cos(relative_angle_of_ray)
    dist *= Math.cos(player.rot - rayAngle)

    // now calc the position, height and width of the wall strip

    // "real" wall height in the game world is 1 unit, the distance from the player to the screen is viewDist,
    // thus the height on the screen is equal to wall_height_real * viewDist / dist

    const height = Math.round(viewDist / dist)

    // width is the same, but we have to stretch the texture to a factor of stripWidth to make it fill the strip correctly
    const width = height * stripWidth

    // top placement is easy since everything is centered on the x-axis, so we simply move
    // it half way down the screen and then half the wall height back up.
    const top = Math.round((screenHeight - height) / 2)

    let imgTop = 0

    const {style} = strip
    const {oldStyles} = strip

    var styleHeight
    if (useSingleTexture) {
      // then adjust the top placement according to which wall texture we need
      imgTop = (height * (wallType - 1)) >> 0
      var styleHeight = (height * numTextures) >> 0
    } else {
      const styleSrc = wallTextures[wallType - 1]
      if (oldStyles.src != styleSrc) {
        strip.src = styleSrc
        oldStyles.src = styleSrc
      }
      var styleHeight = height
    }

    if (oldStyles.height != styleHeight) {
      style.height = styleHeight + 'px'
      oldStyles.height = styleHeight
    }

    let texX = Math.round(textureX * width)
    if (texX > width - stripWidth)
      texX = width - stripWidth
    texX += (wallIsShaded ? width : 0)

    const styleWidth = (width * 2) >> 0
    if (oldStyles.width != styleWidth) {
      style.width = styleWidth + 'px'
      oldStyles.width = styleWidth
    }

    const styleTop = top - imgTop
    if (oldStyles.top != styleTop) {
      style.top = styleTop + 'px'
      oldStyles.top = styleTop
    }

    const styleLeft = stripIdx * stripWidth - texX
    if (oldStyles.left != styleLeft) {
      style.left = styleLeft + 'px'
      oldStyles.left = styleLeft
    }

    const styleClip = 'rect(' + imgTop + ', ' + (texX + stripWidth) + ', ' + (imgTop + height) + ', ' + texX + ')'
    if (oldStyles.clip != styleClip) {
      style.clip = styleClip
      oldStyles.clip = styleClip
    }

    const dwx = xWallHit - player.x
    const dwy = yWallHit - player.y
    const wallDist = dwx * dwx + dwy * dwy
    const styleZIndex = -(wallDist * 1000) >> 0
    if (styleZIndex != oldStyles.zIndex) {
      strip.style.zIndex = styleZIndex
      oldStyles.zIndex = styleZIndex
    }

  }

}

function drawRay(rayX, rayY) {
  const miniMapObjects = $('minimapobjects')
  const objectCtx = miniMapObjects.getContext('2d')

  objectCtx.strokeStyle = 'rgba(0,100,0,0.3)'
  objectCtx.lineWidth = 0.5
  objectCtx.beginPath()
  objectCtx.moveTo(player.x * miniMapScale, player.y * miniMapScale)
  objectCtx.lineTo(
    rayX * miniMapScale,
    rayY * miniMapScale
  )
  objectCtx.closePath()
  objectCtx.stroke()
}

function move(entity, timeDelta) {
  // time timeDelta has passed since we moved last time. We should have moved after time gameCycleDelay,
  // so calculate how much we should multiply our movement to ensure game speed is constant

  const mul = timeDelta / gameCycleDelay

  const moveStep = mul * entity.speed * entity.moveSpeed // entity will move this far along the current direction vector

  entity.rotDeg += mul * entity.dir * entity.rotSpeed // add rotation if entity is rotating (entity.dir != 0)
  entity.rotDeg %= 360

  if (entity.rotDeg < -180) entity.rotDeg += 360
  if (entity.rotDeg >= 180) entity.rotDeg -= 360

  const snap = (entity.rotDeg + 360) % 90
  if (snap < 2 || snap > 88)
    entity.rotDeg = Math.round(entity.rotDeg / 90) * 90

  entity.rot = entity.rotDeg * Math.PI / 180

  const newX = entity.x + Math.cos(entity.rot) * moveStep // calculate new entity position with simple trigonometry
  const newY = entity.y + Math.sin(entity.rot) * moveStep

  const pos = checkCollision(entity.x, entity.y, newX, newY, 0.35)

  entity.x = pos.x // set new position
  entity.y = pos.y
}

function checkCollision(fromX, fromY, toX, toY, radius) {
  const pos = {
    x: fromX,
    y: fromY
  }

  if (toY < 0 || toY >= mapHeight || toX < 0 || toX >= mapWidth)
    return pos

  const blockX = Math.floor(toX)
  const blockY = Math.floor(toY)

  if (isBlocking(blockX, blockY))
    return pos

  pos.x = toX
  pos.y = toY

  const blockTop = isBlocking(blockX, blockY - 1)
  const blockBottom = isBlocking(blockX, blockY + 1)
  const blockLeft = isBlocking(blockX - 1, blockY)
  const blockRight = isBlocking(blockX + 1, blockY)

  if (blockTop != 0 && toY - blockY < radius)
    toY = pos.y = blockY + radius

  if (blockBottom != 0 && blockY + 1 - toY < radius)
    toY = pos.y = blockY + 1 - radius

  if (blockLeft != 0 && toX - blockX < radius)
    toX = pos.x = blockX + radius

  if (blockRight != 0 && blockX + 1 - toX < radius)
    toX = pos.x = blockX + 1 - radius

  // is tile to the top-left a wall
  if (isBlocking(blockX - 1, blockY - 1) != 0 && !(blockTop != 0 && blockLeft != 0)) {
    var dx = toX - blockX
    var dy = toY - blockY
    if (dx * dx + dy * dy < radius * radius)
      if (dx * dx > dy * dy)
        toX = pos.x = blockX + radius
      else
        toY = pos.y = blockY + radius

  }
  // is tile to the top-right a wall
  if (isBlocking(blockX + 1, blockY - 1) != 0 && !(blockTop != 0 && blockRight != 0)) {
    var dx = toX - (blockX + 1)
    var dy = toY - blockY
    if (dx * dx + dy * dy < radius * radius)
      if (dx * dx > dy * dy)
        toX = pos.x = blockX + 1 - radius
      else
        toY = pos.y = blockY + radius

  }
  // is tile to the bottom-left a wall
  if (isBlocking(blockX - 1, blockY + 1) != 0 && !(blockBottom != 0 && blockBottom != 0)) {
    var dx = toX - blockX
    var dy = toY - (blockY + 1)
    if (dx * dx + dy * dy < radius * radius)
      if (dx * dx > dy * dy)
        toX = pos.x = blockX + radius
      else
        toY = pos.y = blockY + 1 - radius

  }
  // is tile to the bottom-right a wall
  if (isBlocking(blockX + 1, blockY + 1) != 0 && !(blockBottom != 0 && blockRight != 0)) {
    var dx = toX - (blockX + 1)
    var dy = toY - (blockY + 1)
    if (dx * dx + dy * dy < radius * radius)
      if (dx * dx > dy * dy)
        toX = pos.x = blockX + 1 - radius
      else
        toY = pos.y = blockY + 1 - radius

  }

  return pos
}

function isBlocking(x, y) {

  // first make sure that we cannot move outside the boundaries of the level
  if (y < 0 || y >= mapHeight || x < 0 || x >= mapWidth)
    return true

  const ix = Math.floor(x)
  const iy = Math.floor(y)

  // return true if the map block is not 0, ie. if there is a blocking wall.
  if (map[iy][ix] != 0)
    return true

  if (spriteMap[iy][ix] && spriteMap[iy][ix].block)
    return true

  return false
}

function updateMiniMap() {

  const miniMap = $('minimap')
  const miniMapObjects = $('minimapobjects')

  const objectCtx = miniMapObjects.getContext('2d')
  miniMapObjects.width = miniMapObjects.width

  objectCtx.fillStyle = 'red'
  objectCtx.fillRect( // draw a dot at the current player position
    player.x * miniMapScale - 2,
    player.y * miniMapScale - 2,
    4, 4
  )

  objectCtx.strokeStyle = 'red'
  objectCtx.beginPath()
  objectCtx.moveTo(player.x * miniMapScale, player.y * miniMapScale)
  objectCtx.lineTo(
    (player.x + Math.cos(player.rot) * 4) * miniMapScale,
    (player.y + Math.sin(player.rot) * 4) * miniMapScale
  )
  objectCtx.closePath()
  objectCtx.stroke()

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i]

    objectCtx.fillStyle = 'blue'
    objectCtx.fillRect( // draw a dot at the enemy position
      enemy.x * miniMapScale - 2,
      enemy.y * miniMapScale - 2,
      4, 4
    )
  }
}

function drawMiniMap() {

  // draw the topdown view minimap

  const miniMap = $('minimap') // the actual map
  const miniMapCtr = $('minimapcontainer') // the container div element
  const miniMapObjects = $('minimapobjects') // the canvas used for drawing the objects on the map (player character, etc)

  miniMap.width = mapWidth * miniMapScale // resize the internal canvas dimensions
  miniMap.height = mapHeight * miniMapScale // of both the map canvas and the object canvas
  miniMapObjects.width = miniMap.width
  miniMapObjects.height = miniMap.height

  const w = (mapWidth * miniMapScale) + 'px' // minimap CSS dimensions
  const h = (mapHeight * miniMapScale) + 'px'
  miniMap.style.width = miniMapObjects.style.width = miniMapCtr.style.width = w
  miniMap.style.height = miniMapObjects.style.height = miniMapCtr.style.height = h

  const ctx = miniMap.getContext('2d')

  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, miniMap.width, miniMap.height)

  // loop through all blocks on the map
  for (let y = 0; y < mapHeight; y++)
    for (let x = 0; x < mapWidth; x++) {

      const wall = map[y][x]

      if (wall > 0) { // if there is a wall block at this (x,y) ...
        ctx.fillStyle = 'rgb(200,200,200)'
        ctx.fillRect( // ... then draw a block on the minimap
          x * miniMapScale,
          y * miniMapScale,
          miniMapScale, miniMapScale
        )
      }

      if (spriteMap[y][x]) {
        ctx.fillStyle = 'rgb(100,200,100)'
        ctx.fillRect(
          x * miniMapScale + miniMapScale * 0.25,
          y * miniMapScale + miniMapScale * 0.25,
          miniMapScale * 0.5, miniMapScale * 0.5
        )
      }
    }

  updateMiniMap()
}

setTimeout(init, 1)
