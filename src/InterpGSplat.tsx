import {
  BUFFER_STATIC,
  type Camera,
  DITHER_NONE,
  type GSplat,
  // @ts-ignore
  type GSplatCompressed,
  GSplatData,
  type GSplatInstance,
  GSplatResource,
  // @ts-ignore
  type GSplatSogs,
  type GraphNode,
  Mat4,
  type Material,
  Mesh,
  MeshInstance,
  PIXELFORMAT_R32U,
  Quat,
  SEMANTIC_ATTR13,
  TYPE_UINT32,
  type Texture,
  Vec3,
  VertexBuffer,
  VertexFormat,
} from 'playcanvas';

function interpGSplatData(pc: any, aData: GSplatData, bData: GSplatData, t: number): GSplatData {
    if (aData.numSplats !== bData.numSplats) {
        throw new Error('两个 GSplatData 的 numSplats 不一致');
    }

    if (aData.isCompressed || bData.isCompressed) {
        throw new Error('压缩 GSplatData 不适合直接逐属性插值，需先转成可编辑属性');
    }

    t = Math.max(0, Math.min(1, t));

    const out = new GSplatData(structuredClone(aData.elements));
    const n = aData.numSplats;
    const eps = 1e-5;

    const lerp = (x: number, y: number, a: number) => x * (1 - a) + y * a;

    function ensureOutProp(name: string) {
        let outProp = out.getProp(name);
        if (!outProp) {
            outProp = new Float32Array(n);
            out.addProp(name, outProp);
        }
        return outProp;
    }

    // 读取 index 字段
    const aIndex = aData.getProp('index');
    const bIndex = bData.getProp('index');

    if (!aIndex || !bIndex) {
        throw new Error('缺少 index 字段，无法根据 index 还原对应关系');
    }

    // 建立 b 的 index -> 行号映射
    const bIndexToRow = new Map<number, number>();
    for (let j = 0; j < n; j++) {
        bIndexToRow.set(bIndex[j], j);
    }

    // a 的每一行在 b 中对应到哪一行
    const mapAtoB = new Int32Array(n);
    for (let i = 0; i < n; i++) {
        const j = bIndexToRow.get(aIndex[i]);
        if (j === undefined) {
            throw new Error(`在 bData 中找不到 index=${aIndex[i]} 的对应点`);
        }
        mapAtoB[i] = j;
    }

    function interpScalarProp(name: string) {
        const a = aData.getProp(name);
        const b = bData.getProp(name);
        if (!a || !b) return;

        const outProp = ensureOutProp(name);

        for (let i = 0; i < n; i++) {
            const j = mapAtoB[i];
            outProp[i] = lerp(a[i], b[j], t);
        }
    }

    // 1) xyz
    interpScalarProp('x');
    interpScalarProp('y');
    interpScalarProp('z');

    // 2) scaling
    // interpScalarProp('scale_0');
    // interpScalarProp('scale_1');
    // interpScalarProp('scale_2');

    // 3) dc color
    // interpScalarProp('f_dc_0');
    // interpScalarProp('f_dc_1');
    // interpScalarProp('f_dc_2');

    // 4) opacity
    // interpScalarProp('opacity');

    // 5) features_rest / SH
    // for (let k = 0; ; k++) {
    //     const name = `f_rest_${k}`;
    //     const a = aData.getProp(name);
    //     const b = bData.getProp(name);
    //     if (!a || !b) break;
    //
    //     const outProp = ensureOutProp(name);
    //     for (let i = 0; i < n; i++) {
    //         const j = mapAtoB[i];
    //         outProp[i] = lerp(a[i], b[j], t);
    //     }
    // }

    // 6) quaternion slerp
    // const aRot0 = aData.getProp('rot_0');
    // const aRot1 = aData.getProp('rot_1');
    // const aRot2 = aData.getProp('rot_2');
    // const aRot3 = aData.getProp('rot_3');
    //
    // const bRot0 = bData.getProp('rot_0');
    // const bRot1 = bData.getProp('rot_1');
    // const bRot2 = bData.getProp('rot_2');
    // const bRot3 = bData.getProp('rot_3');
    //
    // if (aRot0 && aRot1 && aRot2 && aRot3 && bRot0 && bRot1 && bRot2 && bRot3) {
    //     const oRot0 = ensureOutProp('rot_0');
    //     const oRot1 = ensureOutProp('rot_1');
    //     const oRot2 = ensureOutProp('rot_2');
    //     const oRot3 = ensureOutProp('rot_3');
    //
    //     for (let i = 0; i < n; i++) {
    //         const j = mapAtoB[i];
    //
    //         let ax = aRot0[i];
    //         let ay = aRot1[i];
    //         let az = aRot2[i];
    //         let aw = aRot3[i];
    //
    //         let bx = bRot0[j];
    //         let by = bRot1[j];
    //         let bz = bRot2[j];
    //         let bw = bRot3[j];
    //
    //         let lenA = Math.hypot(ax, ay, az, aw);
    //         if (lenA > eps) {
    //             ax /= lenA; ay /= lenA; az /= lenA; aw /= lenA;
    //         }
    //
    //         let lenB = Math.hypot(bx, by, bz, bw);
    //         if (lenB > eps) {
    //             bx /= lenB; by /= lenB; bz /= lenB; bw /= lenB;
    //         }
    //
    //         let dot = ax * bx + ay * by + az * bz + aw * bw;
    //         if (dot < 0) {
    //             bx = -bx; by = -by; bz = -bz; bw = -bw;
    //             dot = -dot;
    //         }
    //
    //         dot = Math.min(1, Math.max(-1, dot));
    //
    //         const theta0 = Math.acos(dot);
    //         const sinTheta0 = Math.sin(theta0);
    //
    //         let rx: number;
    //         let ry: number;
    //         let rz: number;
    //         let rw: number;
    //
    //         if (sinTheta0 < eps) {
    //             rx = (1 - t) * ax + t * bx;
    //             ry = (1 - t) * ay + t * by;
    //             rz = (1 - t) * az + t * bz;
    //             rw = (1 - t) * aw + t * bw;
    //         } else {
    //             const s0 = Math.sin((1 - t) * theta0) / sinTheta0;
    //             const s1 = Math.sin(t * theta0) / sinTheta0;
    //
    //             rx = s0 * ax + s1 * bx;
    //             ry = s0 * ay + s1 * by;
    //             rz = s0 * az + s1 * bz;
    //             rw = s0 * aw + s1 * bw;
    //         }
    //
    //         const lenR = Math.hypot(rx, ry, rz, rw);
    //         if (lenR > eps) {
    //             rx /= lenR; ry /= lenR; rz /= lenR; rw /= lenR;
    //         }
    //
    //         oRot0[i] = rx;
    //         oRot1[i] = ry;
    //         oRot2[i] = rz;
    //         oRot3[i] = rw;
    //     }
    // }

    return out;
}

// e.g. const gInterp = interpGSplat(pc, gA, gB, 0.5);

export function interpGSplatResource(
    pc: any,
    a: GSplatResource,
    b: GSplatResource,
    t: number
): GSplatResource {
    if (!a || !b) {
        throw new Error('a 和 b 不能为空');
    }

    const aData = a.splatData as GSplatData;
    const bData = b.splatData as GSplatData;

    if (!aData || !bData) {
        throw new Error('无法从 GSplatResource 中获取 splatData');
    }

    const outData = interpGSplatData(pc, aData, bData, t);

    const app = pc?.app ?? pc;

    if (!app) {
        throw new Error('无法获取 AppBase');
    }
    console.log(`Interpolated frame with t=${t.toFixed(2)}`);
    return new GSplatResource(app, outData, []);
}