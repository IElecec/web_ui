import { EventHandler, TEXTURELOCK_READ, type Texture, type Vec3 } from 'playcanvas';

class SortWorker {
  order: Uint32Array | null;
  centers: Float32Array;
  chunks: Float32Array;
  mapping: Uint32Array | null;
  cameraPosition: Vec3;
  cameraDirection: Vec3;

  forceUpdate = false;

  lastCameraPosition = { x: 0, y: 0, z: 0 };
  lastCameraDirection = { x: 0, y: 0, z: 0 };

  boundMin = { x: 0, y: 0, z: 0 };
  boundMax = { x: 0, y: 0, z: 0 };
  distances: Uint32Array;
  countBuffer: Uint32Array;

  // could be increased, but this seems a good compromise between stability and performance
  numBins = 32;
  binCount = new Array(this.numBins).fill(0);
  binBase = new Array(this.numBins).fill(0);
  binDivider = new Array(this.numBins).fill(0);

  binarySearch(m: number, n: number, compare_fn: { (i: number): number; (arg0: number): number }) {
    while (m <= n) {
      const k = (n + m) >> 1;
      const cmp = compare_fn(k);
      if (cmp > 0) {
        m = k + 1;
      } else if (cmp < 0) {
        n = k - 1;
      } else {
        return k;
      }
    }
    return ~m;
  }

  update() {
    if (!this.order || !this.centers || this.centers.length === 0 || !this.cameraPosition || !this.cameraDirection)
      return;

    const px = this.cameraPosition.x;
    const py = this.cameraPosition.y;
    const pz = this.cameraPosition.z;
    const dx = this.cameraDirection.x;
    const dy = this.cameraDirection.y;
    const dz = this.cameraDirection.z;

    const epsilon = 0.001;

    if (
      !this.forceUpdate &&
      Math.abs(px - this.lastCameraPosition.x) < epsilon &&
      Math.abs(py - this.lastCameraPosition.y) < epsilon &&
      Math.abs(pz - this.lastCameraPosition.z) < epsilon &&
      Math.abs(dx - this.lastCameraDirection.x) < epsilon &&
      Math.abs(dy - this.lastCameraDirection.y) < epsilon &&
      Math.abs(dz - this.lastCameraDirection.z) < epsilon
    ) {
      return;
    }

    this.forceUpdate = false;

    this.lastCameraPosition.x = px;
    this.lastCameraPosition.y = py;
    this.lastCameraPosition.z = pz;
    this.lastCameraDirection.x = dx;
    this.lastCameraDirection.y = dy;
    this.lastCameraDirection.z = dz;

    // calc min/max distance using bound
    let minDist = Number.MAX_VALUE;
    let maxDist = Number.MIN_VALUE;
    for (let i = 0; i < 8; ++i) {
      const x = i & 1 ? this.boundMin.x : this.boundMax.x;
      const y = i & 2 ? this.boundMin.y : this.boundMax.y;
      const z = i & 4 ? this.boundMin.z : this.boundMax.z;
      const d = x * dx + y * dy + z * dz;
      if (i === 0) {
        minDist = maxDist = d;
      } else {
        minDist = Math.min(minDist, d);
        maxDist = Math.max(maxDist, d);
      }
    }

    const numVertices = this.centers.length / 3;

    // calculate number of bits needed to store sorting result
    const compareBits = Math.max(10, Math.min(20, Math.round(Math.log2(numVertices / 4))));
    const bucketCount = 2 ** compareBits + 1;

    // create distance buffer
    if (this.distances?.length !== numVertices) {
      this.distances = new Uint32Array(numVertices);
    }

    if (!this.countBuffer || this.countBuffer.length !== bucketCount) {
      this.countBuffer = new Uint32Array(bucketCount);
    } else {
      this.countBuffer.fill(0);
    }

    const range = maxDist - minDist;

    if (range < 1e-6) {
      // all points are at the same distance
      for (let i = 0; i < numVertices; ++i) {
        this.distances[i] = 0;
        this.countBuffer[0]++;
      }
    } else {
      // use chunks to calculate rough histogram of splats per distance
      const numChunks = this.chunks.length / 4;

      this.binCount.fill(0);
      for (let i = 0; i < numChunks; ++i) {
        const x = this.chunks[i * 4 + 0];
        const y = this.chunks[i * 4 + 1];
        const z = this.chunks[i * 4 + 2];
        const r = this.chunks[i * 4 + 3];
        const d = x * dx + y * dy + z * dz - minDist;

        const binMin = Math.max(0, Math.floor(((d - r) * this.numBins) / range));
        const binMax = Math.min(this.numBins, Math.ceil(((d + r) * this.numBins) / range));

        for (let j = binMin; j < binMax; ++j) {
          this.binCount[j]++;
        }
      }

      // count total number of histogram bin entries
      const binTotal = this.binCount.reduce((a, b) => a + b, 0);

      // calculate per-bin base and divider
      for (let i = 0; i < this.numBins; ++i) {
        this.binDivider[i] = ((this.binCount[i] / binTotal) * bucketCount) >>> 0;
      }
      for (let i = 0; i < this.numBins; ++i) {
        this.binBase[i] = i === 0 ? 0 : this.binBase[i - 1] + this.binDivider[i - 1];
      }

      // generate per vertex distance key using histogram to distribute bits
      const binRange = range / this.numBins;
      let ii = 0;
      for (let i = 0; i < numVertices; ++i) {
        const x = this.centers[ii++];
        const y = this.centers[ii++];
        const z = this.centers[ii++];
        const d = (x * dx + y * dy + z * dz - minDist) / binRange;
        const bin = d >>> 0;
        const sortKey = (this.binBase[bin] + this.binDivider[bin] * (d - bin)) >>> 0;

        this.distances[i] = sortKey;

        // count occurrences of each distance
        this.countBuffer[sortKey]++;
      }
    }

    // Change countBuffer[i] so that it contains actual position of this digit in outputArray
    for (let i = 1; i < bucketCount; i++) {
      this.countBuffer[i] += this.countBuffer[i - 1];
    }

    // Build the output array
    for (let i = 0; i < numVertices; i++) {
      const distance = this.distances[i];
      const destIndex = --this.countBuffer[distance];
      this.order[destIndex] = i;
    }

    // Find splat with distance 0 to limit rendering behind the camera
    const cameraDist = px * dx + py * dy + pz * dz;
    const dist = (i: number) => {
      if (!this.order) throw new Error();
      let o = this.order[i] * 3;
      return this.centers[o++] * dx + this.centers[o++] * dy + this.centers[o] * dz - cameraDist;
    };
    const findZero = () => {
      const result = this.binarySearch(0, numVertices - 1, (i) => -dist(i));
      return Math.min(numVertices, Math.abs(result));
    };

    const count = dist(numVertices - 1) >= 0 ? findZero() : numVertices;

    // apply mapping
    if (this.mapping) {
      for (let i = 0; i < numVertices; ++i) {
        this.order[i] = this.mapping[this.order[i]];
      }
    }

    return {
      order: this.order.buffer,
      count,
    };
  }

  onMessage(data: any) {
    if (data.order) {
      this.order = new Uint32Array(data.order);
    }
    if (data.centers) {
      this.centers = new Float32Array(data.centers);
      this.forceUpdate = true;

      if (data.chunks) {
        const chunksSrc = new Float32Array(data.chunks);
        // reuse chunks memory, but we only need 4 floats per chunk
        this.chunks = new Float32Array(data.chunks, 0, (chunksSrc.length * 4) / 6);

        this.boundMin.x = chunksSrc[0];
        this.boundMin.y = chunksSrc[1];
        this.boundMin.z = chunksSrc[2];
        this.boundMax.x = chunksSrc[3];
        this.boundMax.y = chunksSrc[4];
        this.boundMax.z = chunksSrc[5];

        // convert chunk min/max to center/radius
        for (let i = 0; i < chunksSrc.length / 6; ++i) {
          const mx = chunksSrc[i * 6 + 0];
          const my = chunksSrc[i * 6 + 1];
          const mz = chunksSrc[i * 6 + 2];
          const Mx = chunksSrc[i * 6 + 3];
          const My = chunksSrc[i * 6 + 4];
          const Mz = chunksSrc[i * 6 + 5];

          this.chunks[i * 4 + 0] = (mx + Mx) * 0.5;
          this.chunks[i * 4 + 1] = (my + My) * 0.5;
          this.chunks[i * 4 + 2] = (mz + Mz) * 0.5;
          this.chunks[i * 4 + 3] = Math.sqrt((Mx - mx) ** 2 + (My - my) ** 2 + (Mz - mz) ** 2) * 0.5;

          if (mx < this.boundMin.x) this.boundMin.x = mx;
          if (my < this.boundMin.y) this.boundMin.y = my;
          if (mz < this.boundMin.z) this.boundMin.z = mz;
          if (Mx > this.boundMax.x) this.boundMax.x = Mx;
          if (My > this.boundMax.y) this.boundMax.y = My;
          if (Mz > this.boundMax.z) this.boundMax.z = Mz;
        }
      } else {
        // chunk bounds weren't provided, so calculate them from the centers
        const numVertices = this.centers.length / 3;
        const numChunks = Math.ceil(numVertices / 256);

        // allocate storage for one bounding sphere per 256-vertex chunk
        this.chunks = new Float32Array(numChunks * 4);

        this.boundMin.x = this.boundMin.y = this.boundMin.z = Number.POSITIVE_INFINITY;
        this.boundMax.x = this.boundMax.y = this.boundMax.z = Number.NEGATIVE_INFINITY;

        // calculate bounds
        let mx: number;
        let my: number;
        let mz: number;
        let Mx: number;
        let My: number;
        let Mz: number;
        for (let c = 0; c < numChunks; ++c) {
          mx = my = mz = Number.POSITIVE_INFINITY;
          Mx = My = Mz = Number.NEGATIVE_INFINITY;

          const start = c * 256;
          const end = Math.min(numVertices, (c + 1) * 256);
          for (let i = start; i < end; ++i) {
            const x = this.centers[i * 3 + 0];
            const y = this.centers[i * 3 + 1];
            const z = this.centers[i * 3 + 2];

            const validX = Number.isFinite(x);
            const validY = Number.isFinite(y);
            const validZ = Number.isFinite(z);

            if (!validX) this.centers[i * 3 + 0] = 0;
            if (!validY) this.centers[i * 3 + 1] = 0;
            if (!validZ) this.centers[i * 3 + 2] = 0;
            if (!validX || !validY || !validZ) {
              continue;
            }

            if (x < mx) mx = x;
            else if (x > Mx) Mx = x;
            if (y < my) my = y;
            else if (y > My) My = y;
            if (z < mz) mz = z;
            else if (z > Mz) Mz = z;

            if (x < this.boundMin.x) this.boundMin.x = x;
            else if (x > this.boundMax.x) this.boundMax.x = x;
            if (y < this.boundMin.y) this.boundMin.y = y;
            else if (y > this.boundMax.y) this.boundMax.y = y;
            if (z < this.boundMin.z) this.boundMin.z = z;
            else if (z > this.boundMax.z) this.boundMax.z = z;
          }

          // calculate chunk center and radius from bound min/max
          this.chunks[c * 4 + 0] = (mx + Mx) * 0.5;
          this.chunks[c * 4 + 1] = (my + My) * 0.5;
          this.chunks[c * 4 + 2] = (mz + Mz) * 0.5;
          this.chunks[c * 4 + 3] = Math.sqrt((Mx - mx) ** 2 + (My - my) ** 2 + (Mz - mz) ** 2) * 0.5;
        }
      }
    }
    // biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
    if (data.hasOwnProperty('mapping')) {
      this.mapping = data.mapping ? new Uint32Array(data.mapping) : null;
      this.forceUpdate = true;
    }
    if (data.cameraPosition) this.cameraPosition = data.cameraPosition;
    if (data.cameraDirection) this.cameraDirection = data.cameraDirection;

    return this.update();
  }
}

export class AnimGSplatSorter extends EventHandler {
  worker: SortWorker | null;
  orderTexture: Texture;
  centers: Float32Array;

  constructor() {
    super();

    this.worker = new SortWorker();
  }

  destroy() {
    this.worker = null;
  }

  onSorted(data: {
    order: ArrayBufferLike;
    count: number;
  }) {
    const newOrder = data.order;
    const oldOrder = this.orderTexture._levels[0].buffer;

    // send vertex storage to worker to start the next frame
    this.worker?.onMessage({ order: oldOrder });

    // write the new order data to gpu texture memory
    this.orderTexture._levels[0] = new Uint32Array(newOrder);
    this.orderTexture.upload();

    // set new data directly on texture
    this.fire('updated', data.count);
  }

  init(orderTexture: Texture, centers: Float32Array) {
    this.orderTexture = orderTexture;
    this.centers = centers.slice();

    // get the texture's storage buffer and make a copy
    const orderBuffer = this.orderTexture
      .lock({
        mode: TEXTURELOCK_READ,
      })
      .slice();
    this.orderTexture.unlock();

    // initialize order data
    for (let i = 0; i < orderBuffer.length; ++i) {
      orderBuffer[i] = i;
    }

    const obj = {
      order: orderBuffer.buffer,
      centers: centers.buffer,
    };

    // send the initial buffer to worker
    const data = this.worker?.onMessage(obj);
    if (data) this.onSorted(data);
  }

  setCamera(pos: Vec3, dir: Vec3) {
    const data = this.worker?.onMessage({
      cameraPosition: { x: pos.x, y: pos.y, z: pos.z },
      cameraDirection: { x: dir.x, y: dir.y, z: dir.z },
    });
    if (data) this.onSorted(data);
  }
}
