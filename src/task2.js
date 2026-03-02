import * as THREE from 'three'
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let scene, camera, renderer
let model = null
let mixer = null
const clock = new THREE.Clock()

init()
renderer.setAnimationLoop(render)

function init() {
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
  document.body.appendChild(renderer.domElement)

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.8)
  hemi.position.set(0, 1, 0)
  scene.add(hemi)

  const key = new THREE.DirectionalLight(0xffffff, 1.2)
  key.position.set(2, 3, 2)
  scene.add(key)

  const fill = new THREE.DirectionalLight(0xffffff, 0.7)
  fill.position.set(-2, 2, -2)
  scene.add(fill)

  document.body.appendChild(ARButton.createButton(renderer))

  const loader = new GLTFLoader()
  const modelUrl = `${import.meta.env.BASE_URL}models/scene.gltf`

  loader.load(
    modelUrl,
    (gltf) => {
      model = gltf.scene

      model.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          obj.material.metalness = obj.material.metalness ?? 0.0
          obj.material.roughness = obj.material.roughness ?? 1.0
        }
      })

      const bbox = new THREE.Box3().setFromObject(model)
      const center = bbox.getCenter(new THREE.Vector3())
      model.position.sub(center)

      model.scale.set(0.3, 0.3, 0.3)
      model.position.set(0, -3, -14)
      scene.add(model)

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model)
        mixer.clipAction(gltf.animations[0]).play()
      }
    },
    undefined,
    (err) => console.error(err)
  )

  window.addEventListener('resize', onResize)
}

function render() {
  const dt = clock.getDelta()

  if (mixer) mixer.update(dt)

  if (model && !mixer) {
    model.rotation.y += 0.01
  }

  renderer.render(scene, camera)
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}