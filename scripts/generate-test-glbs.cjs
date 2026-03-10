/**
 * Generate minimal valid GLB files for testing furniture placement.
 * Creates cube, cylinder, and sphere primitives.
 * Run: node scripts/generate-test-glbs.cjs
 */
const fs = require('fs')
const path = require('path')

const outputDir = path.join(__dirname, '..', 'public', 'test-glbs')

function createGlb(gltfJson, binBuffer) {
  const jsonStr = JSON.stringify(gltfJson)
  // Pad JSON to 4-byte boundary
  const jsonPadded = jsonStr + ' '.repeat((4 - (jsonStr.length % 4)) % 4)
  const jsonBuf = Buffer.from(jsonPadded, 'utf8')

  // Pad binary to 4-byte boundary
  const binPad = (4 - (binBuffer.length % 4)) % 4
  const binBuf = Buffer.concat([binBuffer, Buffer.alloc(binPad)])

  // GLB header: magic(4) + version(4) + length(4) = 12
  // JSON chunk: length(4) + type(4) + data
  // BIN chunk: length(4) + type(4) + data
  const totalLength = 12 + 8 + jsonBuf.length + 8 + binBuf.length

  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546C67, 0) // glTF magic
  header.writeUInt32LE(2, 4)          // version 2
  header.writeUInt32LE(totalLength, 8)

  const jsonChunkHeader = Buffer.alloc(8)
  jsonChunkHeader.writeUInt32LE(jsonBuf.length, 0)
  jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4) // JSON

  const binChunkHeader = Buffer.alloc(8)
  binChunkHeader.writeUInt32LE(binBuf.length, 0)
  binChunkHeader.writeUInt32LE(0x004E4942, 4) // BIN

  return Buffer.concat([header, jsonChunkHeader, jsonBuf, binChunkHeader, binBuf])
}

function generateCube() {
  // Unit cube: 8 vertices, 12 triangles (36 indices)
  const positions = new Float32Array([
    -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5, // front
    -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,  0.5,-0.5,-0.5, // back
  ])
  const indices = new Uint16Array([
    0,1,2, 0,2,3, // front
    4,5,6, 4,6,7, // back
    3,2,6, 3,6,5, // top
    0,7,1, 0,4,7, // bottom
    0,3,5, 0,5,4, // left
    1,7,6, 1,6,2, // right
  ])

  const posBuf = Buffer.from(positions.buffer)
  const idxBuf = Buffer.from(indices.buffer)
  const binBuffer = Buffer.concat([idxBuf, posBuf])

  const gltf = {
    asset: { version: '2.0', generator: 'spazeo-test' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 1 }, indices: 0 }] }],
    accessors: [
      { bufferView: 0, componentType: 5123, count: 36, type: 'SCALAR', max: [7], min: [0] },
      { bufferView: 1, componentType: 5126, count: 8, type: 'VEC3', max: [0.5,0.5,0.5], min: [-0.5,-0.5,-0.5] },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: idxBuf.length, target: 34963 },
      { buffer: 0, byteOffset: idxBuf.length, byteLength: posBuf.length, target: 34962 },
    ],
    buffers: [{ byteLength: binBuffer.length }],
  }

  return createGlb(gltf, binBuffer)
}

function generateCylinder() {
  const segments = 12
  const positions = []
  const indices = []

  // Top + bottom center
  positions.push(0, 0.5, 0)  // 0: top center
  positions.push(0, -0.5, 0) // 1: bottom center

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const x = Math.cos(angle) * 0.5
    const z = Math.sin(angle) * 0.5
    positions.push(x, 0.5, z)  // top ring: 2 + i
    positions.push(x, -0.5, z) // bottom ring: 2 + segments + i
  }

  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments
    const topI = 2 + i, topN = 2 + next
    const botI = 2 + segments + i, botN = 2 + segments + next
    // Top face
    indices.push(0, topI, topN)
    // Bottom face
    indices.push(1, botN, botI)
    // Side quads
    indices.push(topI, botI, botN)
    indices.push(topI, botN, topN)
  }

  const posArr = new Float32Array(positions)
  const idxArr = new Uint16Array(indices)

  const posBuf = Buffer.from(posArr.buffer)
  const idxBuf = Buffer.from(idxArr.buffer)
  const binBuffer = Buffer.concat([idxBuf, posBuf])

  const vertCount = 2 + segments * 2
  const maxX = 0.5, maxY = 0.5, maxZ = 0.5

  const gltf = {
    asset: { version: '2.0', generator: 'spazeo-test' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 1 }, indices: 0 }] }],
    accessors: [
      { bufferView: 0, componentType: 5123, count: idxArr.length, type: 'SCALAR', max: [vertCount - 1], min: [0] },
      { bufferView: 1, componentType: 5126, count: vertCount, type: 'VEC3', max: [maxX, maxY, maxZ], min: [-maxX, -maxY, -maxZ] },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: idxBuf.length, target: 34963 },
      { buffer: 0, byteOffset: idxBuf.length, byteLength: posBuf.length, target: 34962 },
    ],
    buffers: [{ byteLength: binBuffer.length }],
  }

  return createGlb(gltf, binBuffer)
}

function generateSphere() {
  const rings = 8, segments = 12
  const positions = []
  const indices = []

  for (let r = 0; r <= rings; r++) {
    const phi = (r / rings) * Math.PI
    for (let s = 0; s <= segments; s++) {
      const theta = (s / segments) * Math.PI * 2
      const x = Math.sin(phi) * Math.cos(theta) * 0.5
      const y = Math.cos(phi) * 0.5
      const z = Math.sin(phi) * Math.sin(theta) * 0.5
      positions.push(x, y, z)
    }
  }

  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * (segments + 1) + s
      const b = a + segments + 1
      indices.push(a, b, a + 1)
      indices.push(b, b + 1, a + 1)
    }
  }

  const posArr = new Float32Array(positions)
  const idxArr = new Uint16Array(indices)

  const posBuf = Buffer.from(posArr.buffer)
  const idxBuf = Buffer.from(idxArr.buffer)
  const binBuffer = Buffer.concat([idxBuf, posBuf])

  const vertCount = (rings + 1) * (segments + 1)

  const gltf = {
    asset: { version: '2.0', generator: 'spazeo-test' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 1 }, indices: 0 }] }],
    accessors: [
      { bufferView: 0, componentType: 5123, count: idxArr.length, type: 'SCALAR', max: [vertCount - 1], min: [0] },
      { bufferView: 1, componentType: 5126, count: vertCount, type: 'VEC3', max: [0.5, 0.5, 0.5], min: [-0.5, -0.5, -0.5] },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: idxBuf.length, target: 34963 },
      { buffer: 0, byteOffset: idxBuf.length, byteLength: posBuf.length, target: 34962 },
    ],
    buffers: [{ byteLength: binBuffer.length }],
  }

  return createGlb(gltf, binBuffer)
}

// Generate all three
fs.writeFileSync(path.join(outputDir, 'cube.glb'), generateCube())
fs.writeFileSync(path.join(outputDir, 'cylinder.glb'), generateCylinder())
fs.writeFileSync(path.join(outputDir, 'sphere.glb'), generateSphere())

console.log('Generated test GLBs:')
for (const f of ['cube.glb', 'cylinder.glb', 'sphere.glb']) {
  const stat = fs.statSync(path.join(outputDir, f))
  console.log(`  ${f}: ${stat.size} bytes`)
}
