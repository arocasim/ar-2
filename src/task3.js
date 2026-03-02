import * as THREE from 'three'
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js'

let scene, camera, renderer
let reticle
let hitTestSource = null
let hitTestSourceRequested = false
let referenceSpace = null
let controller

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

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2)
  scene.add(hemi)

  const dir = new THREE.DirectionalLight(0xffffff, 1.0)
  dir.position.set(1, 2, 1)
  scene.add(dir)

  if (!('xr' in navigator)) {
    setupDemoMode()
    window.addEventListener('resize', onResize)
    return
  }

  navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
    if (!supported) {
      setupDemoMode()
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
  })

  window.addEventListener('resize', onResize)
}

function setupDemoMode() {
  const btn = document.createElement('button')
  btn.textContent = 'Place cone (demo)'
  btn.style.position = 'fixed'
  btn.style.left = '12px'
  btn.style.top = '12px'
  btn.style.zIndex = '9999'
  btn.style.padding = '10px 12px'
  btn.style.fontSize = '16px'
  document.body.appendChild(btn)

  btn.addEventListener('click', placeDemoCone)
  window.addEventListener('pointerdown', placeDemoCone)
}

function placeDemoCone() {
  const geo = new THREE.ConeGeometry(0.15, 0.3, 32)
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff8844,
    roughness: 0.7,
    metalness: 0.0,
  })
  const cone = new THREE.Mesh(geo, mat)
  cone.position.set(0, 0, -1)
  scene.add(cone)
}

function onSelect() {
  if (!reticle || !reticle.visible) return

  const geo = new THREE.ConeGeometry(0.08, 0.18, 32)
  const mat = new THREE.MeshStandardMaterial({
    color: 0xff8844,
    roughness: 0.7,
    metalness: 0.0,
  })
  const cone = new THREE.Mesh(geo, mat)

  cone.position.setFromMatrixPosition(reticle.matrix)
  cone.quaternion.setFromRotationMatrix(reticle.matrix)

  scene.add(cone)
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