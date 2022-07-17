/* global Sprite, Scene, keysDown */
/* eslint-disable curly */

let message = ''
let fuel = 200

const scene = new Scene()
scene.setBG('black')
const lander = new Lander()
const platform = new Platform()
const stats = document.getElementById('stats')
scene.start()

function Lander() {
  const lander = new Sprite(scene, 'lander.png', 50, 50)
  lander.setSpeed(0)
  lander.falling = true
  lander.imgDefault = 'lander.png'
  lander.imgUp = 'landerUp.png'
  lander.imgLeft = 'landerLeft.png'
  lander.imgRight = 'landerRight.png'

  lander.checkGravity = function() {
    if (this.falling)
      this.addVector(180, .1)
  }

  lander.proveriTipke = function() {
    this.setImage(this.imgDefault)
    if (keysDown[K_S]) {
      this.setImage(this.imgUp)
      this.addVector(0, .3)
      this.falling = true
      fuel--
    }

    if (keysDown[K_A]) {
      this.setImage(this.imgLeft)
      this.addVector(90, .1)
      fuel -= 0.5
    }

    if (keysDown[K_D]) {
      this.setImage(this.imgRight)
      this.addVector(270, .1)
      fuel -= 0.5
    }
  }

  lander.showStats = function() {
    let output = 'MSG: ' + message + '<br />'
    output += 'Fuel: ' + fuel
    stats.innerHTML = output
  }

  lander.checkLanding = function() {
    if (this.falling) {
      if (this.y > 525) {
        if (this.x < platform.x + 10) {
          if (this.x > platform.x - 10) {
            if (this.dx < .2) {
              if (this.dx > -.2) {
                if (this.dy < 2) {
                  this.setSpeed(0)
                  this.falling = false
                  message = 'Nice Landing!'
                }
              }
            }
          } // end 'x too big' if
        } // end 'x too small' if
      } // end 'y not big enough' if
    } // end 'are we falling?' if
  }
  return lander
}

function Platform() {
  const platform = new Sprite(scene, 'platform.png', 50, 10)
  platform.setSpeed(0)
  const x = Math.random() * scene.width
  platform.setPosition(x, 550)
  return platform
}

// eslint-disable-next-line no-unused-vars
function update() {
  scene.clear()
  lander.checkGravity()
  if (fuel > 0)
    lander.proveriTipke()
  else {
    fuel = 0
    lander.setImage(lander.imgDefault)
  }
  lander.showStats()
  lander.checkLanding()

  lander.update()
  platform.update()
}
