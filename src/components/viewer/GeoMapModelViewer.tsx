'use client'

import { useEffect, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import * as THREE from 'three'
import { GLTFLoader, MeshoptDecoder } from 'three-stdlib'
import type * as MaplibreGLType from 'maplibre-gl'
import { MasterPlanDraw } from './MasterPlanDraw'

export interface GeoMapModelViewerProps {
  modelUrl: string
  /** [lng, lat] — real-world origin the model sits on */
  origin: [number, number]
  /** Model altitude above ground, meters */
  altitude?: number
  /** Model rotation [x, y, z] radians */
  rotation?: [number, number, number]
  className?: string
  /** Enables the master-plan point/polygon draw toolbar */
  enableDrawing?: boolean
  initialMasterPlanGeoJson?: string | null
  onSaveMasterPlan?: (geoJson: string) => Promise<void>
}

// Live satellite imagery — Esri World Imagery, free & no API key required
// (Google's satellite tiles require the Google Maps SDK and can't be fetched
// as generic XYZ tiles under their terms of service).
const MAP_STYLE: MaplibreGLType.StyleSpecification = {
  version: 8,
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
}

// Stable module-level default — an inline array literal as a default param
// re-allocates every render, which breaks referential equality in the effect
// dependency array below and tears down/recreates the whole map on every render.
const DEFAULT_ROTATION: [number, number, number] = [Math.PI / 2, 0, 0]

let cssInjected = false
function injectMaplibreCss() {
  if (cssInjected) return
  cssInjected = true
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = '/lib/maplibre-gl/maplibre-gl.css'
  document.head.appendChild(link)
}

export function GeoMapModelViewer({
  modelUrl,
  origin,
  altitude = 0,
  rotation = DEFAULT_ROTATION,
  className,
  enableDrawing = false,
  initialMasterPlanGeoJson,
  onSaveMasterPlan,
}: GeoMapModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const drawRootRef = useRef<Root | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false
    let map: MaplibreGLType.Map | null = null
    let drawContainer: HTMLDivElement | null = null

    injectMaplibreCss()

    // Loaded as a real browser ESM import from /public — NOT bundled by Turbopack.
    // maplibre-gl spawns Web Workers via `new Worker(new URL(..., import.meta.url))`
    // internally; Turbopack's module rewriting silently breaks that URL resolution
    // (same class of issue as spark.js in this codebase), leaving the worker dead
    // and vector tile parsing permanently stuck. Bypassing the bundler entirely fixes it.
    // @ts-expect-error - runtime-only ESM served from /public, not resolvable by TS module resolution
    import(/* webpackIgnore: true */ '/lib/maplibre-gl/maplibre-gl.mjs').then((maplibregl: typeof MaplibreGLType) => {
      if (cancelled || !containerRef.current) return

      map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: origin,
        zoom: 17,
        pitch: 60,
        bearing: -20,
        canvasContextAttributes: { antialias: true },
      })
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')

      new maplibregl.Marker({ color: '#D4A017' }).setLngLat(origin).addTo(map)

      const modelAsMercator = maplibregl.MercatorCoordinate.fromLngLat(origin, altitude)
      const scale = modelAsMercator.meterInMercatorCoordinateUnits()

      const modelTransform = {
        translateX: modelAsMercator.x,
        translateY: modelAsMercator.y,
        translateZ: modelAsMercator.z,
        rotateX: rotation[0],
        rotateY: rotation[1],
        rotateZ: rotation[2],
        scale,
      }

      let camera: THREE.Camera
      let scene: THREE.Scene
      let renderer: THREE.WebGLRenderer
      let layerRemoved = false

      const customLayer: MaplibreGLType.CustomLayerInterface = {
        id: 'building-3d-model',
        type: 'custom',
        renderingMode: '3d',
        onAdd(_map, gl) {
          camera = new THREE.Camera()
          scene = new THREE.Scene()

          const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.2)
          dirLight1.position.set(0, -70, 100).normalize()
          scene.add(dirLight1)
          const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.7)
          dirLight2.position.set(0, 70, 100).normalize()
          scene.add(dirLight2)
          scene.add(new THREE.AmbientLight(0xffffff, 0.4))

          const gltfLoader = new GLTFLoader()
          gltfLoader.setMeshoptDecoder(
            typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder
          )
          gltfLoader.load(
            modelUrl,
            (gltf) => {
              if (layerRemoved) return
              // Center the model over its own footprint and drop it to ground
              // level — its glTF-local origin isn't at the footprint centroid,
              // so without this it renders offset from the map origin.
              const box = new THREE.Box3().setFromObject(gltf.scene)
              const center = new THREE.Vector3()
              box.getCenter(center)
              gltf.scene.position.set(-center.x, -box.min.y, -center.z)

              scene.add(gltf.scene)
              map?.triggerRepaint()
            },
            undefined,
            (err) => console.error('[GeoMapModelViewer] model load error', err)
          )

          renderer = new THREE.WebGLRenderer({
            canvas: _map.getCanvas(),
            context: gl,
            antialias: true,
          })
          renderer.autoClear = false
        },
        onRemove() {
          layerRemoved = true
          scene?.traverse((obj) => {
            const mesh = obj as THREE.Mesh
            if (!mesh.isMesh) return
            mesh.geometry?.dispose()
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            mats.forEach((mat) => {
              if (!mat) return
              Object.values(mat).forEach((v) => {
                if (v instanceof THREE.Texture) v.dispose()
              })
              mat.dispose()
            })
          })
          scene?.clear()
          // Shares MapLibre's GL context — dispose internals only, never forceContextLoss.
          renderer?.dispose()
        },
        render(gl, options) {
          const matrix = options.defaultProjectionData.mainMatrix

          const rotX = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(1, 0, 0),
            modelTransform.rotateX
          )
          const rotY = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 1, 0),
            modelTransform.rotateY
          )
          const rotZ = new THREE.Matrix4().makeRotationAxis(
            new THREE.Vector3(0, 0, 1),
            modelTransform.rotateZ
          )

          const m = new THREE.Matrix4().fromArray(matrix)
          const l = new THREE.Matrix4()
            .makeTranslation(
              modelTransform.translateX,
              modelTransform.translateY,
              modelTransform.translateZ
            )
            .scale(new THREE.Vector3(modelTransform.scale, -modelTransform.scale, modelTransform.scale))
            .multiply(rotX)
            .multiply(rotY)
            .multiply(rotZ)

          camera.projectionMatrix = m.multiply(l)
          renderer.resetState()
          renderer.render(scene, camera)
        },
      }

      map.on('load', () => {
        map?.addLayer(customLayer)

        if (enableDrawing && map && containerRef.current) {
          drawContainer = document.createElement('div')
          containerRef.current.appendChild(drawContainer)
          const root = createRoot(drawContainer)
          drawRootRef.current = root
          root.render(
            <MasterPlanDraw
              map={map}
              initialGeoJson={initialMasterPlanGeoJson}
              onSave={onSaveMasterPlan ?? (async () => {})}
            />
          )
        }
      })
    }).catch((err) => {
      console.error('Failed to load maplibre-gl', err)
    })

    return () => {
      cancelled = true
      drawRootRef.current?.unmount()
      drawRootRef.current = null
      drawContainer?.remove()
      drawContainer = null
      map?.remove()
    }
    // Depend on values, not array identity — callers build `origin` inline, which
    // otherwise tears down and recreates the whole map on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, origin[0], origin[1], altitude, rotation[0], rotation[1], rotation[2], enableDrawing])

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }} />
}
