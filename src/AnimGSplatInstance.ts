import {
  BoundingBox,
  FloatPacking,
  GSplatContainer,
  GSplatFormat,
  PIXELFORMAT_RGBA16F,
  PIXELFORMAT_RGBA32F,
  type GraphicsDevice,
  type GSplatComponent,
  Vec3,
} from 'playcanvas';

export type ProceduralGaussianFrame = {
  count: number;
  centers: Float32Array;   // xyz * count
  scales: Float32Array;    // xyz * count
  rotations: Float32Array; // xyzw * count
  colors: Float32Array;    // rgba * count, 0..1
};

const tmpCenter = new Vec3();
const tmpHalfExtents = new Vec3();

function createProceduralFormat(device: GraphicsDevice) {
  return new GSplatFormat(
    device,
    [
      { name: 'dataCenter', format: PIXELFORMAT_RGBA32F },
      { name: 'dataScale', format: PIXELFORMAT_RGBA16F },
      { name: 'dataRotation', format: PIXELFORMAT_RGBA16F },
      { name: 'dataColor', format: PIXELFORMAT_RGBA16F },
    ],
    {
      readGLSL: `
vec4 _centerData;
vec4 _scaleData;
vec4 _rotationData;
vec4 _colorData;

vec3 getCenter() {
    _centerData = loadDataCenter();
    _scaleData = loadDataScale();
    _rotationData = loadDataRotation();
    _colorData = loadDataColor();
    return _centerData.xyz;
}

vec4 getColor() {
    return _colorData;
}

vec3 getScale() {
    return max(_scaleData.xyz, vec3(1e-4));
}

vec4 getRotation() {
    return normalize(_rotationData);
}
`,
      readWGSL: `
var<private> centerData: vec4f;
var<private> scaleData: vec4f;
var<private> rotationData: vec4f;
var<private> colorData: vec4f;

fn getCenter() -> vec3f {
    centerData = loadDataCenter();
    scaleData = loadDataScale();
    rotationData = loadDataRotation();
    colorData = loadDataColor();
    return centerData.xyz;
}

fn getColor() -> vec4f {
    return colorData;
}

fn getScale() -> vec3f {
    return max(scaleData.xyz, vec3f(1e-4));
}

fn getRotation() -> vec4f {
    return normalize(rotationData);
}
`,
    }
  );
}

function nlerpQuat(
  out: Float32Array,
  outOffset: number,
  a: Float32Array,
  aOffset: number,
  b: Float32Array,
  bOffset: number,
  t: number
) {
  let bx = b[bOffset + 0];
  let by = b[bOffset + 1];
  let bz = b[bOffset + 2];
  let bw = b[bOffset + 3];

  const ax = a[aOffset + 0];
  const ay = a[aOffset + 1];
  const az = a[aOffset + 2];
  const aw = a[aOffset + 3];

  const dot = ax * bx + ay * by + az * bz + aw * bw;
  if (dot < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }

  let x = ax + (bx - ax) * t;
  let y = ay + (by - ay) * t;
  let z = az + (bz - az) * t;
  let w = aw + (bw - aw) * t;

  const len = Math.hypot(x, y, z, w) || 1;
  x /= len;
  y /= len;
  z /= len;
  w /= len;

  out[outOffset + 0] = x;
  out[outOffset + 1] = y;
  out[outOffset + 2] = z;
  out[outOffset + 3] = w;
}

export class AnimGSplatInstance {
  private component: GSplatComponent;
  private device: GraphicsDevice;
  private container: GSplatContainer | null = null;
  private capacity = 0;

  private centersBuffer = new Float32Array(0);
  private scalesBuffer = new Float32Array(0);
  private rotationsBuffer = new Float32Array(0);
  private colorsBuffer = new Float32Array(0);

  blendFrom: ProceduralGaussianFrame | null = null;
  blendTo: ProceduralGaussianFrame | null = null;
  blendFactor = 0;

  constructor(component: GSplatComponent, device: GraphicsDevice) {
    this.component = component;
    this.device = device;
  }

  private ensureContainer(capacity: number) {
    if (this.container && this.capacity === capacity) {
      return;
    }

    const format = createProceduralFormat(this.device);
    this.container = new GSplatContainer(this.device, capacity, format);
    this.capacity = capacity;

    this.centersBuffer = new Float32Array(capacity * 3);
    this.scalesBuffer = new Float32Array(capacity * 3);
    this.rotationsBuffer = new Float32Array(capacity * 4);
    this.colorsBuffer = new Float32Array(capacity * 4);

    this.component.unified = true;
    this.component.resource = this.container as any;
  }

  private validateFrame(frame: ProceduralGaussianFrame) {
    const { count, centers, scales, rotations, colors } = frame;
    if (centers.length < count * 3) {
      throw new Error('centers length is smaller than count * 3');
    }
    if (scales.length < count * 3) {
      throw new Error('scales length is smaller than count * 3');
    }
    if (rotations.length < count * 4) {
      throw new Error('rotations length is smaller than count * 4');
    }
    if (colors.length < count * 4) {
      throw new Error('colors length is smaller than count * 4');
    }
  }

  setBlendFrames(from: ProceduralGaussianFrame, to: ProceduralGaussianFrame) {
    this.validateFrame(from);
    this.validateFrame(to);

    if (from.count !== to.count) {
      throw new Error(`Frame count mismatch: ${from.count} vs ${to.count}`);
    }

    this.blendFrom = from;
    this.blendTo = to;

    this.ensureContainer(from.count);
    this.setBlendFactor(this.blendFactor);
  }

  setBlendFactor(t: number) {
    if (!this.container || !this.blendFrom || !this.blendTo) {
      this.blendFactor = t;
      return;
    }

    const factor = Math.max(0, Math.min(1, t));
    this.blendFactor = factor;

    const { count } = this.blendFrom;
    const centersTex = this.container.getTexture('dataCenter');
    const scalesTex = this.container.getTexture('dataScale');
    const rotationsTex = this.container.getTexture('dataRotation');
    const colorsTex = this.container.getTexture('dataColor');

    const centersData = centersTex.lock() as Float32Array;
    const scalesData = scalesTex.lock() as Uint16Array;
    const rotationsData = rotationsTex.lock() as Uint16Array;
    const colorsData = colorsTex.lock() as Uint16Array;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < count; i++) {
      const c3 = i * 3;
      const c4 = i * 4;

      const x = this.blendFrom.centers[c3 + 0] + (this.blendTo.centers[c3 + 0] - this.blendFrom.centers[c3 + 0]) * factor;
      const y = this.blendFrom.centers[c3 + 1] + (this.blendTo.centers[c3 + 1] - this.blendFrom.centers[c3 + 1]) * factor;
      const z = this.blendFrom.centers[c3 + 2] + (this.blendTo.centers[c3 + 2] - this.blendFrom.centers[c3 + 2]) * factor;

      const sx = this.blendFrom.scales[c3 + 0] + (this.blendTo.scales[c3 + 0] - this.blendFrom.scales[c3 + 0]) * factor;
      const sy = this.blendFrom.scales[c3 + 1] + (this.blendTo.scales[c3 + 1] - this.blendFrom.scales[c3 + 1]) * factor;
      const sz = this.blendFrom.scales[c3 + 2] + (this.blendTo.scales[c3 + 2] - this.blendFrom.scales[c3 + 2]) * factor;

      const r = this.blendFrom.colors[c4 + 0] + (this.blendTo.colors[c4 + 0] - this.blendFrom.colors[c4 + 0]) * factor;
      const g = this.blendFrom.colors[c4 + 1] + (this.blendTo.colors[c4 + 1] - this.blendFrom.colors[c4 + 1]) * factor;
      const b = this.blendFrom.colors[c4 + 2] + (this.blendTo.colors[c4 + 2] - this.blendFrom.colors[c4 + 2]) * factor;
      const a = this.blendFrom.colors[c4 + 3] + (this.blendTo.colors[c4 + 3] - this.blendFrom.colors[c4 + 3]) * factor;

      this.centersBuffer[c3 + 0] = x;
      this.centersBuffer[c3 + 1] = y;
      this.centersBuffer[c3 + 2] = z;

      this.scalesBuffer[c3 + 0] = sx;
      this.scalesBuffer[c3 + 1] = sy;
      this.scalesBuffer[c3 + 2] = sz;

      this.colorsBuffer[c4 + 0] = r;
      this.colorsBuffer[c4 + 1] = g;
      this.colorsBuffer[c4 + 2] = b;
      this.colorsBuffer[c4 + 3] = a;

      nlerpQuat(this.rotationsBuffer, c4, this.blendFrom.rotations, c4, this.blendTo.rotations, c4, factor);

      centersData[c4 + 0] = x;
      centersData[c4 + 1] = y;
      centersData[c4 + 2] = z;
      centersData[c4 + 3] = 1;

      scalesData[c4 + 0] = FloatPacking.float2Half(Math.max(sx, 1e-4));
      scalesData[c4 + 1] = FloatPacking.float2Half(Math.max(sy, 1e-4));
      scalesData[c4 + 2] = FloatPacking.float2Half(Math.max(sz, 1e-4));
      scalesData[c4 + 3] = FloatPacking.float2Half(1);

      rotationsData[c4 + 0] = FloatPacking.float2Half(this.rotationsBuffer[c4 + 0]);
      rotationsData[c4 + 1] = FloatPacking.float2Half(this.rotationsBuffer[c4 + 1]);
      rotationsData[c4 + 2] = FloatPacking.float2Half(this.rotationsBuffer[c4 + 2]);
      rotationsData[c4 + 3] = FloatPacking.float2Half(this.rotationsBuffer[c4 + 3]);

      colorsData[c4 + 0] = FloatPacking.float2Half(Math.max(0, Math.min(1, r)));
      colorsData[c4 + 1] = FloatPacking.float2Half(Math.max(0, Math.min(1, g)));
      colorsData[c4 + 2] = FloatPacking.float2Half(Math.max(0, Math.min(1, b)));
      colorsData[c4 + 3] = FloatPacking.float2Half(Math.max(0, Math.min(1, a)));

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }

    centersTex.unlock();
    scalesTex.unlock();
    rotationsTex.unlock();
    colorsTex.unlock();

    const cx = (minX + maxX) * 0.5;
    const cy = (minY + maxY) * 0.5;
    const cz = (minZ + maxZ) * 0.5;
    const hx = Math.max((maxX - minX) * 0.5, 1e-4);
    const hy = Math.max((maxY - minY) * 0.5, 1e-4);
    const hz = Math.max((maxZ - minZ) * 0.5, 1e-4);

    tmpCenter.set(cx, cy, cz);
    tmpHalfExtents.set(hx, hy, hz);
    this.container.aabb = new BoundingBox(tmpCenter.clone(), tmpHalfExtents.clone());
    this.container.centers.set(this.centersBuffer.subarray(0, count * 3));
    this.container.update(count, true);
  }

  updateGSplat() {
    // Procedural container mode only; loaded gsplat switching is intentionally unsupported here.
  }

  destroy() {
    this.blendFrom = null;
    this.blendTo = null;
    this.container = null;
  }
}
