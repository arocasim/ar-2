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

  window.addEventListener('resize', onResize)

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
}

function loadModel() {
  const loader = new GLTFLoader()
  const modelUrl = `${import.meta.env.BASE_URL}models/task4/scene_plant.gltf`

  loader.load(
    modelUrl,
    (gltf) => {
      modelTemplate = gltf.scene

      modelTemplate.traverse((obj) => {
        if (obj.isMesh && obj.material) {
          obj.material.metalness = obj.material.metalness ?? 0.0
          obj.material.roughness = obj.material.roughness ?? 1.0
          obj.material.needsUpdate = true
        }
      })

      const box = new THREE.Box3().setFromObject(modelTemplate)
      const center = box.getCenter(new THREE.Vector3())
      modelTemplate.position.sub(center)

      modelTemplate.scale.set(0.1, 0.1, 0.1)
    },
    undefined,
    (e) => console.error('GLTF load error:', e)
  )
}

function onSelect() {
  if (!reticle || !reticle.visible || !modelTemplate) return

  const model = modelTemplate.clone(true)

  model.position.setFromMatrixPosition(reticle.matrix)
  model.quaternion.setFromRotationMatrix(reticle.matrix)

  scene.add(model)
}

function render(timestamp, frame) {
  if (frame) {
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