// mozda prepraviti u luk i strelu
let ctx
let platno
const svipredmeti = []
let ponavljanje
const pracka_x = 150
const pracka_y = 200
const djule_poluprec = 10
const poluprec_na2 = djule_poluprec * djule_poluprec
let zateze = false
let horizontalBrzina
let vertikalBrzina1
let vertikalBrzina2
const gravitacija = 2  // otprilike, videti kako se ponaša
const gusan = new Image()
gusan.src = 'gusan.png'
const perje = new Image()
perje.src = 'perje.gif'

function Pracka(djx, djy, p1x, p1y, p2x, p2y, p3x, p3y, stylestring) {
  this.djx = djx
  this.djy = djy
  this.p1x = p1x
  this.p1y = p1y
  this.p2x = p2x
  this.p2y = p2y
  this.p3x = p3x
  this.p3y = p3y
  this.strokeStyle = stylestring
  this.crta = function() {
	  ctx.strokeStyle = this.strokeStyle
	  ctx.lineWidth = 4
	  ctx.beginPath()
	  ctx.moveTo(this.djx, this.djy)
	  ctx.lineTo(this.p1x, this.p1y)
	  ctx.moveTo(this.djx, this.djy)
	  ctx.lineTo(this.p2x, this.p2y)
	  ctx.moveTo(this.p1x, this.p1y)
	  ctx.lineTo(this.p2x, this.p2y)
	  ctx.lineTo(this.p3x, this.p3y)
	  ctx.stroke()
  }
  this.zatezePracku = function(dx, dy) {
	  this.djx += dx
	  this.djy += dy
	  this.p1x += dx
	  this.p1y += dy
	  this.p2x += dx
	  this.p2y += dy
	  this.p3x += dx
	  this.p3y += dy
  }
}

const pracka = new Pracka(pracka_x, pracka_y, pracka_x + 80, pracka_y - 10, pracka_x + 80,
					    pracka_y + 10, pracka_x + 70, pracka_y + 180, 'rgb(120,20,10)')

function Djule(px, py, rad, stylestring) {
  this.px = px
  this.py = py
  this.rad = rad
  this.crta = function() {
	  ctx.fillStyle = this.fillstyle
	  ctx.beginPath()
	  ctx.arc(this.px, this.py, this.rad, 0, Math.PI * 2, true)
	  ctx.fill()
  }
  this.zatezePracku = function(dx, dy) {
	  this.px += dx
	  this.py += dy
  }
  this.fillstyle = stylestring
}

const djule = new Djule(pracka_x, pracka_y, djule_poluprec, 'rgb(250,0,0)')

function Kvadrat(px, py, swidth, sheight, stylestring) {
  this.px = px
  this.py = py
  this.swidth = swidth
  this.sheight = sheight
  this.fillstyle = stylestring
  this.crta = function() {
	  ctx.fillStyle = this.fillstyle
	  ctx.fillRect(this.px, this.py, this.swidth, this.sheight)
  }
  this.zatezePracku = function(dx, dy) {
	  this.px += dx
	  this.py += dy
  }
}

function Slika(px, py, swidth, sheight, imga) {
  this.px = px
  this.py = py
  this.img = imga
  this.swidth = swidth
  this.sheight = sheight
  this.crta = function() {
	  ctx.drawImage(this.img, this.px, this.py, this.swidth, this.sheight)
  }
}

const meta = new Slika(700, 210, 209, 179, gusan)
const tlo = new Kvadrat(0, 370, 1200, 30, 'rgb(10,250,0)')

svipredmeti.push(meta)
svipredmeti.push(tlo)

svipredmeti.push(pracka)
svipredmeti.push(djule)

function traziDjule(ev) {
  let mx
  let my
  if (ev.layerX ||  ev.layerX == 0) { // Firefox, Chrome
   			mx = ev.layerX
    		my = ev.layerY
  		} else if (ev.offsetX || ev.offsetX == 0) { // Opera,
    		mx = ev.offsetX
    		my = ev.offsetY
  		}
  if (razmak_na2(mx, my, djule.px, djule.py) < poluprec_na2) {
    zateze = true
    crtaPlatno()
  }
}
// use square of distance to lesson computation
function razmak_na2(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2)
}
// for dragging of ball and modification of pracka
function zatezePracku(ev) {
  let mx
  let my
  if (zateze) {
    if (ev.layerX ||  ev.layerX == 0) { // Firefox
   			mx = ev.layerX
    		my = ev.layerY
  		} else if (ev.offsetX || ev.offsetX == 0) { // Opera
    		mx = ev.offsetX
    		my = ev.offsetY
  		}
    djule.px = mx
    djule.py = my
    pracka.djx = mx
    pracka.djy = my
    crtaPlatno()
  }
}

function puca() {
// at mouse up, if ball and pracka have been dragged, set up for ball to travel
// in ballistic arc.
  if (zateze) {
    zateze = false
    // want initial velocity to increase with length, make it the square for convenience
    // the 700 is arbitrary. It makes a nice arc!
    const duzinacevi = razmak_na2(pracka.djx, pracka.djy, pracka.p1x, pracka.p1y) / 700
    // use angle based on line interval djx,djy to p1x,p1y, the upper arm of sling
    const ugaoradijani = -Math.atan2(pracka.p1y - pracka.djy, pracka.p1x - pracka.djx)
    horizontalBrzina =  duzinacevi * Math.cos(ugaoradijani)
    vertikalBrzina1 = - duzinacevi * Math.sin(ugaoradijani)
    crtaPlatno()
    ponavljanje = setInterval(djuleLeti, 100)
  }
}

function crtaPlatno() {
// crtaPlatno erases the whole canvas and then draws svipredmeti in svipredmeti array
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  let i
  for (i = 0;i < svipredmeti.length;i++)
    svipredmeti[i].crta()
}

function djuleLeti() {
// this creates the motion of the ball from the slingshot to either the meta or the tlo
  const dx = horizontalBrzina
  vertikalBrzina2 = vertikalBrzina1 + gravitacija
  const dy = (vertikalBrzina1 + vertikalBrzina2) * .5
  vertikalBrzina1 = vertikalBrzina2
  djule.zatezePracku(dx, dy)
  // check for hitting meta
  const djx = djule.px
  const djy = djule.py
  // proverava pogodak i smanjuje granice mete
  if ((djx >= meta.px + 40) && (djx <= (meta.px + meta.swidth - 40)) &&
		(djy >= meta.py + 40) && (djy <= (meta.py + meta.sheight - 40)))
  // menja sliku u perje
    meta.img = perje

  // check for getting beyond tlo level
  if (djy >= tlo.py)
    clearInterval(ponavljanje)

  crtaPlatno()
}

function init() {
  ctx = document.getElementById('canvas').getContext('2d')
  platno = document.getElementById('canvas')
  platno.addEventListener('mousedown', traziDjule, false)
  platno.addEventListener('mousemove', zatezePracku, false)
  platno.addEventListener('mouseup', puca, false)
  crtaPlatno()
}

window.onload = init
