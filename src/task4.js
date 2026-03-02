import * as THREE from 'three'
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let scene, camera, renderer
let reticle
let hitTestSource = null
let hitTestSourceRequested = false
let referenceSpace = null
let controller

let modelTemplate = null
let demoCount = 0

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

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.6)
  hemi.position.set(0, 1, 0)
  scene.add(hemi)

  const key = new THREE.DirectionalLight(0xffffff, 1.2)
  key.position.set(2, 3, 2)
  scene.add(key)

  const fill = new THREE.DirectionalLight(0xffffff, 0.7)
  fill.position.set(-2, 2, -2)
  scene.add(fill)

  if (!('xr' in navigator)) {
    setupDemoMode()
    loadModel()
    window.addEventListener('resize', onResize)
    return
  }

  navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
    if (!supported) {
      setupDemoMode()
      loadModel()
      return
    }

    document.body.appendChild(
      ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] })
    )

    const ringGeo = new THREE.RingGeometry(0.06, 0.08, 32).rotateX(-Math.PI / 2)
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    reticle = new THREE.Mesh(ringGeo, ringMat)
    reticle.matrixAutoUpdate = false
    reticle.visible = false
    scene.add(reticle)

    controller = renderer.xr.getController(0)
    controller.addEventListener('select', onSelect)
    scene.add(controller)

    loadModel()
  })

  window.addEventListener('resize', onResize)
}

function loadModel() {
  const loader = new GLTFLoader()
  const modelUrl = `${import.meta.env.BASE_URL}models/scene_plant.gltf`

  loader.load(
    modelUrl,
    (gltf) => {
      modelTemplate = gltf.scene

      modelTemplate.traverse((obj) => {
        if (obj.isMesh) {
          if (obj.material) {
            obj.material.metalness = obj.material.metalness ?? 0.0
            obj.material.roughness = obj.material.roughness ?? 1.0
            obj.material.needsUpdate = true
          }
          obj.castShadow = true
          obj.receiveShadow = true
        }
      })

      const box = new THREE.Box3().setFromObject(modelTemplate)
      const center = box.getCenter(new THREE.Vector3())
      modelTemplate.position.sub(center)

      modelTemplate.scale.set(0.25, 0.25, 0.25)
    },
    undefined,
    (e) => console.error('GLTF load error:', e)
  )
}

function setupDemoMode() {
  const btn = document.createElement('button')
  btn.textContent = 'Place model (demo)'
  btn.style.position = 'fixed'
  btn.style.left = '12px'
  btn.style.top = '12px'
  btn.style.zIndex = '9999'
  btn.style.padding = '10px 12px'
  btn.style.fontSize = '16px'
  btn.style.background = '#ffffff'
  btn.style.border = '1px solid #ccc'
  btn.style.borderRadius = '6px'
  btn.style.cursor = 'pointer'
  document.body.appendChild(btn)

  btn.addEventListener('click', placeDemoModel)
}

function placeDemoModel() {
  if (!modelTemplate) return

  demoCount++

  const model = modelTemplate.clone(true)

  const step = 0.4
  const col = (demoCount - 1) % 4
  const row = Math.floor((demoCount - 1) / 4)

  model.position.set(col * step - 0.6, row * step - 0.3, -1)
  model.rotation.y = demoCount * 0.4

  scene.add(model)
}

function onSelect() {
  if (!reticle.visible || !modelTemplate) return

  const model = modelTemplate.clone(true)

  model.position.setFromMatrixPosition(reticle.matrix)
  model.quaternion.setFromRotationMatrix(reticle.matrix)

  scene.add(model)
}

function render(timestamp, frame) {
  if (frame && reticle) {
    const session = renderer.xr.getSession()

    if (!hitTestSourceRequested) {
      session.requestReferenceSpace('viewer').then((viewerSpace) => {
        session.requestHitTestSource({ space: viewerSpace }).then((source) => {
          hitTestSource = source
        })
      })

      session.requestReferenceSpace('local').then((refSpace) => {
        referenceSpace = refSpace
      })

      session.addEventListener('end', () => {
        hitTestSourceRequested = false
        hitTestSource = null
        referenceSpace = null
      })

      hitTestSourceRequested = true
    }

    if (hitTestSource && referenceSpace) {
      const hitTestResults = frame.getHitTestResults(hitTestSource)

      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0]
        const pose = hit.getPose(referenceSpace)
        reticle.visible = true
        reticle.matrix.fromArray(pose.transform.matrix)
      } else {
        reticle.visible = false
      }
    }
  }

  renderer.render(scene, camera)
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}