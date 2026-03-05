import * as THREE from 'three'
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let scene, camera, renderer
let model = null
let mixer = null

const clock = new THREE.Clock()

const FORCE_GOLD_MATERIAL = false

init()
renderer.setAnimationLoop(render)

function init() {
  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    40
  )

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.xr.enabled = true

  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.physicallyCorrectLights = true

  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1

  renderer.setClearColor(0x000000, 0)

  document.body.appendChild(renderer.domElement)

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2)
  hemi.position.set(0, 1, 0)
  scene.add(hemi)

  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(2.5, 3.5, 2.5)
  scene.add(key)

  const fill = new THREE.DirectionalLight(0xffffff, 0.8)
  fill.position.set(-2, 2, -2)
  scene.add(fill)

  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: [] })
  )

  const loader = new GLTFLoader()
  const modelUrl = `${import.meta.env.BASE_URL}models/scene.gltf`

  loader.load(
    modelUrl,
    (gltf) => {
      model = gltf.scene

      const bbox = new THREE.Box3().setFromObject(model)
      const center = bbox.getCenter(new THREE.Vector3())
      model.position.sub(center)

      model.scale.setScalar(0.06)

      model.position.set(0, -0.5, -2)

      if (FORCE_GOLD_MATERIAL) {
        const gold = new THREE.MeshStandardMaterial({
          color: 0xffd700,
          metalness: 1,
          roughness: 0.15,
        })

        model.traverse((obj) => {
          if (obj.isMesh) {
            obj.material = gold
            obj.material.needsUpdate = true
          }
        })
      } else {
        model.traverse((obj) => {
          if (obj.isMesh && obj.material) {
            if (obj.material.metalness === undefined) obj.material.metalness = 0.0
            if (obj.material.roughness === undefined) obj.material.roughness = 1.0
            obj.material.needsUpdate = true
          }
        })
      }

      scene.add(model)

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model)
        const action = mixer.clipAction(gltf.animations[0])
        action.play()
      }

      console.log('Model added to scene')
    },
    undefined,
    (err) => console.error('GLTF load error:', err)
  )

  window.addEventListener('resize', onResize)
}

function render() {
  const dt = clock.getDelta()

  if (mixer) {
    mixer.update(dt)
  } else if (model) {
    model.rotation.y += dt * 0.6
  }

  renderer.render(scene, camera)
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}