export const miniMapScale = 8
export const screenWidth = 320
export const screenHeight = 200
export const showOverlay = true
export const stripWidth = 2
export const fov = 60 * Math.PI / 180
export const numRays = Math.ceil(screenWidth / stripWidth)
export const viewDist = (screenWidth / 2) / Math.tan((fov / 2))
export const twoPI = Math.PI * 2
export const numTextures = 4
export const wallTextures = [
  'sprites/walls_1.png',
  'sprites/walls_2.png',
  'sprites/walls_3.png',
  'sprites/walls_4.png'
]
// enable this to use a single image file containing all wall textures. This performs better in Firefox. Opera likes smaller images.
export const useSingleTexture = true
