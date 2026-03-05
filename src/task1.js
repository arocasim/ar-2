import * as THREE from 'three'
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js'

let camera, scene, renderer
let box, tetra, ico

const basePos = {
  box: new THREE.Vector3(-0.35, 0.0, -1.0),
  tetra: new THREE.Vector3(0.0, 0.0, -1.15),
  ico: new THREE.Vector3(0.35, 0.0, -1.0),
}

init()
animate()

function init() {
  const container = document.createElement('div')
  document.body.appendChild(container)

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  )

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.xr.enabled = true

  container.appendChild(renderer.domElement)

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0)
  hemi.position.set(0, 1, 0)
  scene.add(hemi)

  const dir = new THREE.DirectionalLight(0xffffff, 0.8)
  dir.position.set(1, 2, 1)
  scene.add(dir)

  const ambient = new THREE.AmbientLight(0xffffff, 0.25)
  scene.add(ambient)

  box = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0xff4d4d,
      roughness: 0.35,
      metalness: 0.2,
    })
  )
  box.position.copy(basePos.box)
  scene.add(box)

  tetra = new THREE.Mesh(
    new THREE.TetrahedronGeometry(0.14),
    new THREE.MeshStandardMaterial({
      color: 0x4dff88,
      roughness: 0.25,
      metalness: 0.1,
    })
  )
  tetra.position.copy(basePos.tetra)
  scene.add(tetra)

  ico = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.14),
    new THREE.MeshStandardMaterial({
      color: 0x4da3ff,
      roughness: 0.15,
      metalness: 0.35,
    })
  )
  ico.position.copy(basePos.ico)
  scene.add(ico)

  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: [] })
  )

  window.addEventListener('resize', onWindowResize)
}

function animate() {
  renderer.setAnimationLoop(render)
}

function render() {
  const t = performance.now() * 0.001
  animateObjects(t)

  renderer.render(scene, camera)
}

function animateObjects(t) {
  box.rotation.y += 0.01
  box.rotation.x += 0.005
  box.scale.setScalar(1 + 0.03 * Math.sin(t))
  box.position.copy(basePos.box)

  tetra.rotation.y += 0.012
  tetra.rotation.x += 0.006
  tetra.position.set(
    basePos.tetra.x,
    basePos.tetra.y + 0.04 * Math.sin(t),
    basePos.tetra.z
  )

  ico.rotation.y += 0.011
  ico.rotation.x += 0.004
  ico.scale.setScalar(1 + 0.03 * Math.sin(t))
  ico.position.set(basePos.ico.x, basePos.ico.y + 0.03, basePos.ico.z)
  ico.material.color.setHSL(0.58 + 0.05 * Math.sin(t), 0.7, 0.55)
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}