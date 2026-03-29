import {
  BUFFER_STATIC,
  type Camera,
  DITHER_NONE,
  type GSplat,
  // @ts-ignore
  type GSplatCompressed,
  type GSplatInstance,
  // @ts-ignore
  type GSplatSogs,
  type GraphNode,
  Mat4,
  type Material,
  Mesh,
  MeshInstance,
  PIXELFORMAT_R32U,
  SEMANTIC_ATTR13,
  TYPE_UINT32,
  type Texture,
  Vec3,
  VertexBuffer,
  VertexFormat,
} from 'playcanvas';
import { AnimGSplatSorter } from './AnimGSplatSorter.ts';

/**
 * - The options.
 */
type SplatMaterialOptions = {
  /**
   * - Custom vertex shader, see SPLAT MANY example.
   */
  vertex?: string;
  /**
   * - Custom fragment shader, see SPLAT MANY example.
   */
  fragment?: string;
  /**
   * - List of shader defines.
   */
  defines?: string[];
  /**
   * - Custom shader chunks.
   */
  chunks?: {
    [x: string]: string;
  };
  /**
   * - Opacity dithering enum.
   */
  dither?: string;
};

const mat = new Mat4();
const cameraPosition = new Vec3();
const cameraDirection = new Vec3();
const viewport = [0, 0];

export class AnimGSplatInstance {
  splat: GSplat | GSplatCompressed | GSplatSogs;
  mesh: Mesh;
  meshInstance: MeshInstance;
  material: Material;
  orderTexture: Texture;
  options = {};
  sorter: AnimGSplatSorter | null = null;
  lastCameraPosition = new Vec3();
  lastCameraDirection = new Vec3();

  /**
   * List of cameras this instance is visible for. Updated every frame by the renderer.
   */
  cameras: Camera[] = [];

  /**
   * @param {GSplat} splat - The splat instance.
   * @param {SplatMaterialOptions} options - The options.
   */
  constructor(splat: GSplat, maxNumSplats: number, options: SplatMaterialOptions = {}) {
    this.splat = splat;

    // clone options object
    // biome-ignore lint:
    options = Object.assign(this.options, options);

    const device = splat.device;

    // create the order texture
    this.orderTexture = this.splat.createTexture(
      'splatOrder',
      PIXELFORMAT_R32U,
      this.splat.evalTextureSize(this.splat.numSplats),
    );

    // material
    this.material = this.splat.createMaterial(options);
    this.material.setParameter('splatOrder', this.orderTexture);
    this.material.setParameter('alphaClip', 0.3);

    // number of quads to combine into a single instance. this is to increase occupancy
    // in the vertex shader.
    const splatInstanceSize = 128;
    const numSplatInstances = Math.ceil(maxNumSplats / splatInstanceSize);

    // specify the base splat index per instance
    const indexData = new Uint32Array(numSplatInstances);
    for (let i = 0; i < numSplatInstances; ++i) {
      indexData[i] = i * splatInstanceSize;
    }

    const vertexFormat = new VertexFormat(device, [
      {
        semantic: SEMANTIC_ATTR13,
        components: 1,
        type: TYPE_UINT32,
        asInt: true,
      },
    ]);

    const indicesVB = new VertexBuffer(device, vertexFormat, numSplatInstances, {
      usage: BUFFER_STATIC,
      data: indexData.buffer,
    });

    // build the instance mesh
    const meshPositions = new Float32Array(12 * splatInstanceSize);
    const meshIndices = new Uint32Array(6 * splatInstanceSize);
    for (let i = 0; i < splatInstanceSize; ++i) {
      meshPositions.set([-1, -1, i, 1, -1, i, 1, 1, i, -1, 1, i], i * 12);

      const b = i * 4;
      meshIndices.set([0 + b, 1 + b, 2 + b, 0 + b, 2 + b, 3 + b], i * 6);
    }

    const mesh = new Mesh(device);
    mesh.setPositions(meshPositions, 3);
    mesh.setIndices(meshIndices);
    mesh.update();

    this.mesh = mesh;
    this.mesh.aabb.copy(splat.aabb);

    this.meshInstance = new MeshInstance(this.mesh, this.material);
    this.meshInstance.setInstancing(indicesVB, true);
    this.meshInstance.gsplatInstance = this as unknown as GSplatInstance;

    // only start rendering the splat after we've received the splat order data
    this.meshInstance.instancingCount = 0;

    // clone centers to allow multiple instances of sorter
    const centers = splat.centers.slice();

    // create sorter
    if (!options.dither || options.dither === DITHER_NONE) {
      this.sorter = new AnimGSplatSorter();
      this.sorter.init(this.orderTexture, centers);
      this.sorter.on('updated', (count) => {
        // limit splat render count to exclude those behind the camera
        this.meshInstance.instancingCount = Math.ceil(count / splatInstanceSize);

        // update splat count on the material
        this.material.setParameter('numSplats', count);
      });
    }
  }

  destroy() {
    this.material?.destroy();
    this.meshInstance?.destroy();
    this.sorter?.destroy();
  }

  clone() {
    return new AnimGSplatInstance(this.splat, this.options);
  }

  createMaterial(options: any) {
    this.material = this.splat.createMaterial(options);
    this.material.setParameter('splatOrder', this.orderTexture);
    this.material.setParameter('alphaClip', 0.3);
    if (this.meshInstance) {
      this.meshInstance.material = this.material;
    }
  }

  updateViewport(cameraNode: any) {
    const camera = cameraNode?.camera;
    const renderTarget = camera?.renderTarget;
    const { width, height } = renderTarget ?? this.splat.device;

    viewport[0] = width;
    viewport[1] = height;

    // adjust viewport for stereoscopic VR sessions
    const xr = camera?.camera?.xr;
    if (xr?.active && xr.views.list.length === 2) {
      viewport[0] *= 0.5;
    }

    this.material.setParameter('viewport', viewport);
  }

  /**
   * Sorts the GS vertices based on the given camera.
   * @param {GraphNode} cameraNode - The camera node used for sorting.
   */
  sort(cameraNode: GraphNode) {
    if (this.sorter) {
      const cameraMat = cameraNode.getWorldTransform();
      cameraMat.getTranslation(cameraPosition);
      cameraMat.getZ(cameraDirection);

      const modelMat = this.meshInstance.node.getWorldTransform();
      const invModelMat = mat.invert(modelMat);
      invModelMat.transformPoint(cameraPosition, cameraPosition);
      invModelMat.transformVector(cameraDirection, cameraDirection);

      // sort if the camera has changed
      if (
        !cameraPosition.equalsApprox(this.lastCameraPosition) ||
        !cameraDirection.equalsApprox(this.lastCameraDirection)
      ) {
        this.lastCameraPosition.copy(cameraPosition);
        this.lastCameraDirection.copy(cameraDirection);
        this.sorter.setCamera(cameraPosition, cameraDirection);
      }
    }

    this.updateViewport(cameraNode);
  }

  update() {
    if (this.cameras.length > 0) {
      // sort by the first camera it's visible for
      const camera = this.cameras[0];
      this.sort(camera._node);

      // we get new list of cameras each frame
      this.cameras.length = 0;
    }
  }

  updateGSplat(splat: GSplat) {
    this.splat = splat;

    // create the order texture
    this.orderTexture?.destroy();
    this.orderTexture = this.splat.createTexture(
      'splatOrder',
      PIXELFORMAT_R32U,
      this.splat.evalTextureSize(this.splat.numSplats),
    );

    // material
    this.material?.destroy();
    this.material = this.splat.createMaterial({});
    this.material.setParameter('splatOrder', this.orderTexture);
    this.material.setParameter('alphaClip', 0.3);
    this.meshInstance.material = this.material;

    this.mesh.aabb.copy(splat.aabb);

    // only start rendering the splat after we've received the splat order data
    this.meshInstance.instancingCount = 0;

    // clone centers to allow multiple instances of sorter
    const centers = splat.centers.slice();

    // update sorter
    this.sorter?.init(this.orderTexture, centers);
  }
}