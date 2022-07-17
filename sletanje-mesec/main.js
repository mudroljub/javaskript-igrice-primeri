/* eslint-disable curly */

let scene
let lander
let platform
let message = ''
let fuel = 200

function Lander() {
  tLander = new Sprite(scene, 'lander.png', 50, 50)
  tLander.setSpeed(0)
  tLander.falling = true
  tLander.imgDefault = 'lander.png'
  tLander.imgUp = 'landerUp.png'
  tLander.imgLeft = 'landerLeft.png'
  tLander.imgRight = 'landerRight.png'

  tLander.checkGravity = function() {
    if (this.falling)
      this.addVector(180, .1)
    // end if
  }

  tLander.proveriTipke = function() {
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

  tLander.showStats = function() {
    output = 'MSG: ' + message + '<br />'
    output += 'Fuel: ' + fuel
    stats.innerHTML = output
  }

  tLander.checkLanding = function() {
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
  return tLander
} // end Lander constructor

function Platform() {
  tPlatform = new Sprite(scene, 'platform.png', 50, 10)
  tPlatform.setSpeed(0)
  x = Math.random() * scene.width
  tPlatform.setPosition(x, 550)
  return tPlatform
}

function init() {
  scene = new Scene()
  scene.setBG('black')
  lander = new Lander()
  platform = new Platform()
  stats = document.getElementById('stats')
  scene.start()
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

init()