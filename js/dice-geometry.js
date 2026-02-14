import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Die colors
const DIE_COLORS = {
  d4:  { base: '#c0392b', text: '#fff' },
  d6:  { base: '#2980b9', text: '#fff' },
  d8:  { base: '#27ae60', text: '#fff' },
  d10: { base: '#8e44ad', text: '#fff' },
  d12: { base: '#d35400', text: '#fff' },
  d20: { base: '#c49b1a', text: '#fff' },
};

// Scale factor per die type
const DIE_SCALE = {
  d4: 1.0,
  d6: 0.8,
  d8: 0.9,
  d10: 0.85,
  d12: 0.85,
  d20: 0.9,
};

export function getDieColor(type) {
  return DIE_COLORS[type]?.base || '#888';
}

// --- Texture generation ---

function createCanvasTexture(text, bgColor, textColor, size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = textColor;
  ctx.font = `bold ${size * 0.45}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDieMaterials(type, faceCount) {
  const { base, text } = DIE_COLORS[type];
  const materials = [];
  for (let i = 0; i < faceCount; i++) {
    const num = i + 1;
    const tex = createCanvasTexture(String(num), base, text);
    materials.push(new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.5,
      metalness: 0.1,
    }));
  }
  return materials;
}

function createSingleMaterial(type) {
  const { base } = DIE_COLORS[type];
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(base),
    roughness: 0.5,
    metalness: 0.1,
  });
}

// --- Face-normal tables for value reading ---
// After settling, we transform these normals to world space and dot with (0,1,0).
// The face whose world-normal has the highest dot product is the "up" face.

// --- ConvexPolyhedron helper ---

function createConvexPolyhedron(geometry) {
  const pos = geometry.getAttribute('position');
  const idx = geometry.getIndex();

  const vertices = [];
  const vertMap = new Map();
  const uniqueVerts = [];

  // Deduplicate vertices
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    if (!vertMap.has(key)) {
      vertMap.set(key, uniqueVerts.length);
      uniqueVerts.push(new CANNON.Vec3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }
    vertices.push(vertMap.get(key));
  }

  const faces = [];
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      faces.push([vertices[idx.getX(i)], vertices[idx.getX(i + 1)], vertices[idx.getX(i + 2)]]);
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      faces.push([vertices[i], vertices[i + 1], vertices[i + 2]]);
    }
  }

  return new CANNON.ConvexPolyhedron({ vertices: uniqueVerts, faces });
}

// --- Geometry builders ---

function buildD4() {
  const radius = 1.0 * DIE_SCALE.d4;
  const geometry = new THREE.TetrahedronGeometry(radius);
  geometry.computeVertexNormals();

  // For a d4, the "result" is the face pointing DOWN (bottom face), which is
  // opposite to the standard approach. Some d4s show the number on the bottom
  // face, others show it at the top vertex. We'll use the bottom face approach:
  // the face with the LOWEST dot product with up is the result.

  // Compute face normals
  const faceNormals = computeFaceNormals(geometry);

  const shape = createConvexPolyhedron(geometry);

  // For d4, we assign numbers to faces. With TetrahedronGeometry detail=0, 4 faces.
  // We'll use a single material with per-face number textures via vertex UVs
  const material = createSingleMaterial('d4');

  // Paint numbers on the faces using a different approach: apply texture atlas
  const materials = createDieMaterials('d4', 4);
  assignFaceGroups(geometry, 4);

  return {
    geometry,
    materials,
    shape,
    faceNormals,
    scale: DIE_SCALE.d4,
    invertValue: true, // d4: bottom face = value
  };
}

function buildD6() {
  const size = 0.8 * DIE_SCALE.d6;
  const geometry = new THREE.BoxGeometry(size * 2, size * 2, size * 2);

  const faceNormals = [
    new THREE.Vector3(1, 0, 0),   // face 0 (right)
    new THREE.Vector3(-1, 0, 0),  // face 1 (left)
    new THREE.Vector3(0, 1, 0),   // face 2 (top)
    new THREE.Vector3(0, -1, 0),  // face 3 (bottom)
    new THREE.Vector3(0, 0, 1),   // face 4 (front)
    new THREE.Vector3(0, 0, -1),  // face 5 (back)
  ];

  // Standard d6: opposite faces sum to 7
  // BoxGeometry groups: 0=right, 1=left, 2=top, 3=bottom, 4=front, 5=back
  // We map: group 0→1, 1→6, 2→2, 3→5, 4→3, 5→4
  const faceValues = [1, 6, 2, 5, 3, 4];

  const { base, text } = DIE_COLORS.d6;
  const materials = faceValues.map(v =>
    new THREE.MeshStandardMaterial({
      map: createCanvasTexture(String(v), base, text),
      roughness: 0.5,
      metalness: 0.1,
    })
  );

  const shape = new CANNON.Box(new CANNON.Vec3(size, size, size));

  return {
    geometry,
    materials,
    shape,
    faceNormals,
    faceValues,
    scale: 1,
    invertValue: false,
  };
}

function buildD8() {
  const radius = 1.0 * DIE_SCALE.d8;
  const geometry = new THREE.OctahedronGeometry(radius);
  geometry.computeVertexNormals();

  const faceNormals = computeFaceNormals(geometry);
  const shape = createConvexPolyhedron(geometry);

  const materials = createDieMaterials('d8', 8);
  assignFaceGroups(geometry, 8);

  return {
    geometry,
    materials,
    shape,
    faceNormals,
    scale: DIE_SCALE.d8,
    invertValue: false,
  };
}

function buildD10() {
  const radius = 0.9 * DIE_SCALE.d10;
  const d10Geometry = createD10Geometry(radius);
  d10Geometry.computeVertexNormals();

  const faceNormals = computeFaceNormals(d10Geometry);
  const shape = createConvexPolyhedron(d10Geometry);

  // d10 has faces labeled 0-9
  const d10Materials = [];
  const { base, text: textColor } = DIE_COLORS.d10;
  for (let i = 0; i < 10; i++) {
    d10Materials.push(new THREE.MeshStandardMaterial({
      map: createCanvasTexture(String(i), base, textColor),
      roughness: 0.5,
      metalness: 0.1,
    }));
  }
  return {
    geometry: d10Geometry,
    materials: d10Materials,
    shape,
    faceNormals,
    scale: DIE_SCALE.d10,
    invertValue: false,
    valueOffset: 0, // faces labeled 0-9
  };
}

function createD10Geometry(radius) {
  // Pentagonal trapezohedron
  const t = (Math.PI * 2) / 5;

  const topApex = new THREE.Vector3(0, radius, 0);
  const bottomApex = new THREE.Vector3(0, -radius, 0);

  const upperRing = [];
  const lowerRing = [];

  for (let i = 0; i < 5; i++) {
    upperRing.push(new THREE.Vector3(
      Math.cos(t * i) * radius * 0.85,
      radius * 0.3,
      Math.sin(t * i) * radius * 0.85
    ));
    lowerRing.push(new THREE.Vector3(
      Math.cos(t * i + t / 2) * radius * 0.85,
      -radius * 0.3,
      Math.sin(t * i + t / 2) * radius * 0.85
    ));
  }

  const positions = [];
  const groups = [];
  let triIndex = 0;

  // 10 kite faces
  for (let i = 0; i < 5; i++) {
    const next = (i + 1) % 5;

    // Upper kite: topApex - upperRing[i] - lowerRing[i] - upperRing[next]
    pushTriangle(positions, topApex, upperRing[i], lowerRing[i]);
    groups.push({ start: triIndex * 3, count: 3, materialIndex: i * 2 });
    triIndex++;

    pushTriangle(positions, topApex, lowerRing[i], upperRing[next]);
    groups.push({ start: triIndex * 3, count: 3, materialIndex: i * 2 });
    triIndex++;

    // Lower kite: bottomApex - lowerRing[i] - upperRing[i] - lowerRing[prev]
    const prev = (i + 4) % 5;
    pushTriangle(positions, bottomApex, upperRing[i], lowerRing[prev]);
    groups.push({ start: triIndex * 3, count: 3, materialIndex: i * 2 + 1 });
    triIndex++;

    pushTriangle(positions, bottomApex, lowerRing[i], upperRing[i]);
    groups.push({ start: triIndex * 3, count: 3, materialIndex: i * 2 + 1 });
    triIndex++;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  // Merge triangles per face into material groups
  geo.clearGroups();
  // Each kite has 2 triangles. Group them by face.
  for (let face = 0; face < 10; face++) {
    const startTri = face * 2;
    geo.addGroup(startTri * 3, 6, face);
  }

  // Generate UVs
  const uvs = [];
  for (let i = 0; i < triIndex; i++) {
    uvs.push(0.5, 1, 0, 0, 1, 0);
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  return geo;
}

function pushTriangle(arr, a, b, c) {
  arr.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
}

function buildD12() {
  const radius = 1.0 * DIE_SCALE.d12;
  const geometry = new THREE.DodecahedronGeometry(radius);
  geometry.computeVertexNormals();

  const faceNormals = computeFaceNormals(geometry);
  const shape = createConvexPolyhedron(geometry);

  const materials = createDieMaterials('d12', 12);
  assignFaceGroups(geometry, 12);

  return {
    geometry,
    materials,
    shape,
    faceNormals,
    scale: DIE_SCALE.d12,
    invertValue: false,
  };
}

function buildD20() {
  const radius = 1.0 * DIE_SCALE.d20;
  const geometry = new THREE.IcosahedronGeometry(radius);
  geometry.computeVertexNormals();

  const faceNormals = computeFaceNormals(geometry);
  const shape = createConvexPolyhedron(geometry);

  const materials = createDieMaterials('d20', 20);
  assignFaceGroups(geometry, 20);

  return {
    geometry,
    materials,
    shape,
    faceNormals,
    scale: DIE_SCALE.d20,
    invertValue: false,
  };
}

// --- Helpers ---

function computeFaceNormals(geometry) {
  const normals = [];
  const pos = geometry.getAttribute('position');
  const idx = geometry.getIndex();

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  const triCount = idx ? idx.count / 3 : pos.count / 3;

  for (let i = 0; i < triCount; i++) {
    let i0, i1, i2;
    if (idx) {
      i0 = idx.getX(i * 3);
      i1 = idx.getX(i * 3 + 1);
      i2 = idx.getX(i * 3 + 2);
    } else {
      i0 = i * 3;
      i1 = i * 3 + 1;
      i2 = i * 3 + 2;
    }

    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);

    cb.subVectors(c, b);
    ab.subVectors(a, b);
    cb.cross(ab).normalize();

    normals.push(cb.clone());
  }

  return normals;
}

function assignFaceGroups(geometry, faceCount) {
  // Group triangles by their face normal direction
  const normals = computeFaceNormals(geometry);
  const pos = geometry.getAttribute('position');
  const idx = geometry.getIndex();
  const triCount = idx ? idx.count / 3 : pos.count / 3;

  // If it already has groups (like d10), skip
  if (geometry.groups.length > 0) return;

  // Cluster triangles by normal direction
  const used = new Array(triCount).fill(false);
  const faceGroups = [];

  for (let i = 0; i < triCount; i++) {
    if (used[i]) continue;

    const group = [i];
    used[i] = true;

    for (let j = i + 1; j < triCount; j++) {
      if (used[j]) continue;
      if (normals[i].dot(normals[j]) > 0.999) {
        group.push(j);
        used[j] = true;
      }
    }

    faceGroups.push(group);
  }

  // Sort by first triangle index to maintain consistent ordering.
  faceGroups.sort((a, b) => a[0] - b[0]);

  // Rebuild geometry as non-indexed with contiguous face groups + per-face UVs.
  // Handles both indexed and non-indexed input (PolyhedronGeometry is non-indexed).
  const newPositions = [];
  const newUvs = [];
  const groupDefs = [];

  for (let fi = 0; fi < faceGroups.length; fi++) {
    const matIndex = fi % faceCount;
    const startVert = newPositions.length / 3;

    for (const triIdx of faceGroups[fi]) {
      let i0, i1, i2;
      if (idx) {
        i0 = idx.getX(triIdx * 3);
        i1 = idx.getX(triIdx * 3 + 1);
        i2 = idx.getX(triIdx * 3 + 2);
      } else {
        i0 = triIdx * 3;
        i1 = triIdx * 3 + 1;
        i2 = triIdx * 3 + 2;
      }

      newPositions.push(
        pos.getX(i0), pos.getY(i0), pos.getZ(i0),
        pos.getX(i1), pos.getY(i1), pos.getZ(i1),
        pos.getX(i2), pos.getY(i2), pos.getZ(i2)
      );
      newUvs.push(0.5, 1, 0, 0, 1, 0);
    }

    const count = (newPositions.length / 3) - startVert;
    groupDefs.push({ start: startVert, count, materialIndex: matIndex });
  }

  geometry.deleteAttribute('position');
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  geometry.deleteAttribute('uv');
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
  geometry.setIndex(null);
  geometry.clearGroups();

  for (const g of groupDefs) {
    geometry.addGroup(g.start, g.count, g.materialIndex);
  }

  geometry.computeVertexNormals();
}

// --- Public API ---

const builders = {
  d4: buildD4,
  d6: buildD6,
  d8: buildD8,
  d10: buildD10,
  d12: buildD12,
  d20: buildD20,
};

const cache = {};

export function getDieData(type) {
  if (!cache[type]) {
    const builder = builders[type];
    if (!builder) throw new Error(`Unknown die type: ${type}`);
    cache[type] = builder();
  }
  // Return a fresh geometry clone so each mesh has its own buffer data
  const data = cache[type];
  return {
    ...data,
    geometry: data.geometry.clone(),
  };
}

export function readFaceValue(type, quaternion) {
  const data = getDieData(type);
  const { faceNormals, faceValues, invertValue, valueOffset } = data;

  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

  let bestDot = invertValue ? Infinity : -Infinity;
  let bestFace = 0;

  // For grouped faces, we use group normals
  const groupNormals = getGroupNormals(data);

  for (let i = 0; i < groupNormals.length; i++) {
    const worldNormal = groupNormals[i].clone().applyQuaternion(q);
    const dot = worldNormal.dot(up);

    if (invertValue) {
      // d4: bottom face = lowest dot
      if (dot < bestDot) {
        bestDot = dot;
        bestFace = i;
      }
    } else {
      if (dot > bestDot) {
        bestDot = dot;
        bestFace = i;
      }
    }
  }

  if (faceValues) {
    return faceValues[bestFace];
  }

  if (valueOffset !== undefined) {
    return bestFace + valueOffset;
  }

  return bestFace + 1;
}

function getGroupNormals(data) {
  const { geometry, faceNormals } = data;

  if (geometry.groups.length > 0) {
    const normals = [];
    const pos = geometry.getAttribute('position');
    const idx = geometry.getIndex();

    for (const group of geometry.groups) {
      let i0, i1, i2;
      if (idx) {
        i0 = idx.getX(group.start);
        i1 = idx.getX(group.start + 1);
        i2 = idx.getX(group.start + 2);
      } else {
        i0 = group.start;
        i1 = group.start + 1;
        i2 = group.start + 2;
      }

      const a = new THREE.Vector3().fromBufferAttribute(pos, i0);
      const b = new THREE.Vector3().fromBufferAttribute(pos, i1);
      const c = new THREE.Vector3().fromBufferAttribute(pos, i2);

      const cb = new THREE.Vector3().subVectors(c, b);
      const ab = new THREE.Vector3().subVectors(a, b);
      cb.cross(ab).normalize();
      normals.push(cb);
    }
    return normals;
  }

  return faceNormals;
}
