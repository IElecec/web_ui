import { useApp, useParent } from '@playcanvas/react/hooks';
import type { GSplatComponent } from 'playcanvas';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimGSplatInstance, type ProceduralGaussianFrame } from './AnimGSplatInstance.ts';

export type AnimGSplatProps = {
  src: string;
  frameStart: number;
  frameLength: number;
  frameCurrent?: number;
  onLoadFrame?: (frame: number) => void;
};

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function shDcToColor(dc: number) {
  const SH_C0 = 0.28209479177387814;
  return clamp01(0.5 + SH_C0 * dc);
}

async function loadPlyFrame(url: string): Promise<ProceduralGaussianFrame> {
  const res = await fetch(url, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to load PLY: ${url} (${res.status})`);
  }

  const buffer = await res.arrayBuffer();
  return parseGaussianPly(buffer);
}

function parseGaussianPly(buffer: ArrayBuffer): ProceduralGaussianFrame {
  const bytes = new Uint8Array(buffer);
  const probeText = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 128 * 1024)));

  let headerLength = 0;
  const endHeaderLF = probeText.indexOf('end_header\n');
  const endHeaderCRLF = probeText.indexOf('end_header\r\n');

  if (endHeaderLF >= 0) {
    headerLength = endHeaderLF + 'end_header\n'.length;
  } else if (endHeaderCRLF >= 0) {
    headerLength = endHeaderCRLF + 'end_header\r\n'.length;
  } else {
    throw new Error('PLY header missing end_header');
  }

  const header = probeText.slice(0, headerLength);
  const lines = header.split(/\r?\n/);

  let vertexCount = 0;
  let format = '';
  let inVertexElement = false;
  const properties: { type: string; name: string }[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts[0] === 'format') {
      format = parts[1];
    } else if (parts[0] === 'element') {
      inVertexElement = parts[1] === 'vertex';
      if (inVertexElement) {
        vertexCount = Number(parts[2]);
      }
    } else if (parts[0] === 'property' && inVertexElement) {
      if (parts[1] === 'list') {
        throw new Error('PLY list properties are not supported for Gaussian vertices');
      }
      properties.push({ type: parts[1], name: parts[2] });
    }
  }

  if (format !== 'binary_little_endian') {
    throw new Error(`Only binary_little_endian PLY is supported, got: ${format}`);
  }

  const typeSize: Record<string, number> = {
    char: 1,
    uchar: 1,
    int8: 1,
    uint8: 1,
    short: 2,
    ushort: 2,
    int16: 2,
    uint16: 2,
    int: 4,
    uint: 4,
    int32: 4,
    uint32: 4,
    float: 4,
    float32: 4,
    double: 8,
    float64: 8,
  };

  const propertyOffsets = new Map<string, { offset: number; type: string }>();
  let rowStride = 0;
  for (const prop of properties) {
    propertyOffsets.set(prop.name, { offset: rowStride, type: prop.type });
    rowStride += typeSize[prop.type];
  }

  const required = [
    'x', 'y', 'z',
    'f_dc_0', 'f_dc_1', 'f_dc_2',
    'opacity',
    'scale_0', 'scale_1', 'scale_2',
    'rot_0', 'rot_1', 'rot_2', 'rot_3',
  ];

  for (const name of required) {
    if (!propertyOffsets.has(name)) {
      throw new Error(`PLY missing property: ${name}`);
    }
  }

  const view = new DataView(buffer, headerLength);

  const readValue = (offset: number, type: string) => {
    switch (type) {
      case 'char':
      case 'int8':
        return view.getInt8(offset);
      case 'uchar':
      case 'uint8':
        return view.getUint8(offset);
      case 'short':
      case 'int16':
        return view.getInt16(offset, true);
      case 'ushort':
      case 'uint16':
        return view.getUint16(offset, true);
      case 'int':
      case 'int32':
        return view.getInt32(offset, true);
      case 'uint':
      case 'uint32':
        return view.getUint32(offset, true);
      case 'float':
      case 'float32':
        return view.getFloat32(offset, true);
      case 'double':
      case 'float64':
        return view.getFloat64(offset, true);
      default:
        throw new Error(`Unsupported PLY property type: ${type}`);
    }
  };

  const centers = new Float32Array(vertexCount * 3);
  const scales = new Float32Array(vertexCount * 3);
  const rotations = new Float32Array(vertexCount * 4);
  const colors = new Float32Array(vertexCount * 4);

  for (let i = 0; i < vertexCount; i++) {
    const rowBase = i * rowStride;
    const get = (name: string) => {
      const meta = propertyOffsets.get(name)!;
      return readValue(rowBase + meta.offset, meta.type);
    };

    const c3 = i * 3;
    const c4 = i * 4;

    centers[c3 + 0] = get('x');
    centers[c3 + 1] = get('y');
    centers[c3 + 2] = get('z');

    scales[c3 + 0] = Math.exp(get('scale_0'));
    scales[c3 + 1] = Math.exp(get('scale_1'));
    scales[c3 + 2] = Math.exp(get('scale_2'));

    let q0 = get('rot_0');
    let q1 = get('rot_1');
    let q2 = get('rot_2');
    let q3 = get('rot_3');
    const qLen = Math.hypot(q0, q1, q2, q3) || 1;
    q0 /= qLen;
    q1 /= qLen;
    q2 /= qLen;
    q3 /= qLen;

    rotations[c4 + 0] = q0;
    rotations[c4 + 1] = q1;
    rotations[c4 + 2] = q2;
    rotations[c4 + 3] = q3;

    colors[c4 + 0] = shDcToColor(get('f_dc_0'));
    colors[c4 + 1] = shDcToColor(get('f_dc_1'));
    colors[c4 + 2] = shDcToColor(get('f_dc_2'));
    colors[c4 + 3] = clamp01(sigmoid(get('opacity')));
  }

  return {
    count: vertexCount,
    centers,
    scales,
    rotations,
    colors,
  };
}

export const AnimGSplat = ({
  src,
  frameStart,
  frameLength,
  frameCurrent = 0,
  onLoadFrame = () => {},
}: AnimGSplatProps) => {
  const app = useApp();
  const parent = useParent();

  const [component, setComponent] = useState<GSplatComponent | null>(null);
  const [frameA, setFrameA] = useState<ProceduralGaussianFrame | null>(null);
  const [frameB, setFrameB] = useState<ProceduralGaussianFrame | null>(null);
  const instanceRef = useRef<AnimGSplatInstance | null>(null);
  const loadingRef = useRef(false);

  const isTwoFrameInterpMode = frameLength === 15;

  const frameUrls = useMemo(() => {
    if (!isTwoFrameInterpMode) return null;
    return [
      `${src}/frame_${frameStart.toString().padStart(4, '0')}.ply`,
      `${src}/frame_${(frameStart + 1).toString().padStart(4, '0')}.ply`,
    ] as const;
  }, [frameStart, isTwoFrameInterpMode, src]);

  const startedRef = useRef(false);

  useEffect(() => {
    setFrameA(null);
    setFrameB(null);
    onLoadFrame(0);

    if (!isTwoFrameInterpMode || !frameUrls) return;
    if (startedRef.current) return;

    let cancelled = false;
    startedRef.current = true;

    (async () => {
      try {
        const a = await loadPlyFrame(frameUrls[0]);
        if (cancelled) return;
        setFrameA(a);
        onLoadFrame(1);

        // 给浏览器一点喘息空间
        await new Promise((r) => setTimeout(r, 0));

        const b = await loadPlyFrame(frameUrls[1]);
        if (cancelled) return;
        setFrameB(b);
        onLoadFrame(2);
      } catch (err) {
        console.error('Failed to load PLY frames', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [frameUrls, isTwoFrameInterpMode, onLoadFrame]);

  useLayoutEffect(() => {
    let gsplatComponent = parent.findComponent('gsplat') as GSplatComponent | null;

    if (!gsplatComponent) {
      gsplatComponent = parent.addComponent('gsplat', {
        unified: true,
      }) as GSplatComponent;
    } else {
      gsplatComponent.unified = true;
    }

    setComponent(gsplatComponent);

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;

      const comp = parent.findComponent('gsplat');
      if (comp) {
        parent.removeComponent('gsplat');
      }
    };
  }, [parent]);

  useLayoutEffect(() => {
    if (!component) return;
    if (!isTwoFrameInterpMode) return;
    if (!frameA || !frameB) return;

    const count = Math.min(frameA.count, frameB.count);
    if (count <= 0) return;

    if (!instanceRef.current) {
      instanceRef.current = new AnimGSplatInstance(component, app.graphicsDevice);
    }

    instanceRef.current.setBlendFrames(
      {
        count,
        centers: frameA.centers,
        scales: frameA.scales,
        rotations: frameA.rotations,
        colors: frameA.colors,
      },
      {
        count,
        centers: frameB.centers,
        scales: frameB.scales,
        rotations: frameB.rotations,
        colors: frameB.colors,
      }
    );

    const t = Math.max(0, Math.min(1, frameCurrent / Math.max(frameLength - 1, 1)));
    instanceRef.current.setBlendFactor(t);
  }, [app.graphicsDevice, component, frameA, frameB, frameCurrent, frameLength, isTwoFrameInterpMode]);

  useEffect(() => {
    if (!isTwoFrameInterpMode) return;
    if (!instanceRef.current) return;
    if (!frameA || !frameB) return;

    const t = Math.max(0, Math.min(1, frameCurrent / Math.max(frameLength - 1, 1)));
    instanceRef.current.setBlendFactor(t);
  }, [frameA, frameB, frameCurrent, frameLength, isTwoFrameInterpMode]);

  return null;
};
