import { type AssetResult, useApp, useParent } from '@playcanvas/react/hooks';
import { fetchAsset } from '@playcanvas/react/utils';
import type { Asset, GSplat, GSplatComponent, GSplatInstance, GSplatResource } from 'playcanvas';
import { useEffect, useLayoutEffect, useState } from 'react';
import { AnimGSplatInstance } from './AnimGSplatInstance.ts';
import { interpGSplatResource } from './InterpGSplat.tsx';

export const AnimGSplat = ({
  src,
  frameStart,
  frameLength,
  frameCurrent = 0,
  keyFrameA = 5,
  keyFrameB = 15,
  interpolate = false,
  onLoadFrame = () => {},
}: {
  src: string;
  frameStart: number;
  frameLength: number;
  frameCurrent?: number;
  keyFrameA?: number;
  keyFrameB?: number;
  interpolate?: boolean;
  onLoadFrame?: (frame: number) => void;
}) => {
  const app = useApp();
  const [assets, setAssets] = useState<AssetResult[]>(new Array(frameLength));
  const parent = useParent();
  const [component, setComponent] = useState<GSplatComponent | null>(null);
  const [loadedFrames, setLoadedFrames] = useState(new Set<number>());

  useEffect(() => {
    setLoadedFrames(new Set<number>());
    const assets: AssetResult[] = new Array(frameLength);
    setAssets(assets);
    if (interpolate) {
      console.log(`Loading frames with interpolation: ${keyFrameA} and ${keyFrameB} as keyframes.`);
      const pathA = `${src}/point_cloud_${(frameStart + keyFrameA)}.ply`;
      const pathB = `${src}/point_cloud_${(frameStart + keyFrameB)}.ply`;

      Promise.all([
        fetchAsset({ app, url: pathA, type: 'gsplat' }),
        fetchAsset({ app, url: pathB, type: 'gsplat' }),
      ])
        .then(([assetA, assetB]: [Asset, Asset]) => {
          const resourceA = assetA.resource as GSplatResource;
          const resourceB = assetB.resource as GSplatResource;


          setAssets((currentAssets) => {
            const newAssets = [...currentAssets];

          newAssets[0] = {
            asset: assetA,
            loading: false,
            error: null,
            subscribe: (cb) => () => {},
          };
          console.log(`Loaded asset: ${pathA}`);

          if (frameLength > 1) {
            newAssets[frameLength - 1] = {
              asset: assetB,
              loading: false,
              error: null,
              subscribe: (cb) => () => {},
            };
          }
          console.log(`Loaded asset: ${pathB}`);

          // 中间帧：由 A 和 B 插值得到
          for (let i = 1; i < frameLength - 1; i++) {
            const t = i / (frameLength - 1);
            const interp = interpGSplatResource(app, resourceA, resourceB, t);

            newAssets[i] = {
              asset: {
                resource: interp,
              } as Asset,
              loading: false,
              error: null,
              subscribe: (cb) => () => {},
            };
          }

            return newAssets;
          });

          setLoadedFrames(new Set(Array.from({ length: frameLength }, (_, i) => i)));

          console.log(`Interpolated ${Math.max(0, frameLength - 2)} frames`);
        })
        .catch((error) => {
          console.error(`Failed to load assets: ${pathA}, ${pathB}`);
          setAssets((currentAssets) => {
            const newAssets = [...currentAssets];
            for (let i = 0; i < frameLength; i++) {
              newAssets[i] = {
                asset: null,
                loading: false,
                error: error?.message || `Failed to load assets: ${pathA}, ${pathB}`,
                subscribe: (cb) => () => {},
              };
            }
            return newAssets;
          });
        });
      }
    else{// no interpolation, load all frames directly
      for (let i = 0; i < frameLength; i++) {
        const path = `${src}/point_cloud_${(frameStart + i)}.ply`;

        fetchAsset({ app, url: path, type: 'gsplat' })
          .then((asset: Asset) => {
            setLoadedFrames((prevIndices: Set<number>) => {
              const newIndices = new Set(prevIndices);
              newIndices.add(i);
              return newIndices;
            });
            setAssets((currentAssets) => {
              const newAssets = [...currentAssets];
              newAssets[i] = {
                asset: asset,
                loading: false,
                error: null,
                subscribe: (cb) => () => {},
              };
              return newAssets;
            });
            console.log(`Loaded asset: ${path}`);
          })
          .catch((error) => {
            console.error(`Failed to load asset: ${path}`);
            setAssets((currentAssets) => {
              const newAssets = [...currentAssets];
              newAssets[i] = {
                asset: null,
                loading: false,
                error: error?.message || `Failed to load asset: ${path}`,
                subscribe: (cb) => () => {},
              };
              return newAssets;
            });
          });
      }
    }
  }, [src, frameStart, frameLength, app, interpolate]);

  useEffect(() => {
    onLoadFrame(loadedFrames.size);
  }, [loadedFrames, onLoadFrame]);

  useLayoutEffect(() => {
    let component = parent.findComponent('gsplat') as GSplatComponent;
    if (!component) {
      component = parent.addComponent('gsplat', {
        instance: null,
      }) as GSplatComponent;
      console.log('AnimGSplat component created', component);
    }
    setComponent(component);
    console.log(parent);
    return () => {
      parent.removeComponent('gsplat');
      console.log('AnimGSplat component removed');
    };
  }, [parent]);

  useLayoutEffect(() => {
    const current = assets[frameCurrent]?.asset as Asset | null;
    if (!current || !component) return;

    component.castShadows = true;
    component.unified = true;

    // 插值帧或手工资源：直接走 resource
    if ((current as any).resource && !(current as any).id) {
      component.resource = (current as any).resource as GSplatResource;
    } else {
      component.asset = current;
    }
    }, [frameCurrent, component, assets]);
//     const glsl = `
// uniform vec3 uTint;

// void modifySplatCenter(inout vec3 center) {
// }

// void modifySplatRotationScale(
//     vec3 originalCenter,
//     vec3 modifiedCenter,
//     inout vec4 rotation,
//     inout vec3 scale
// ) {
// }

// void modifySplatColor(vec3 center, inout vec4 color) {
//     color.rgb *= uTint;
// }
// `;

// component.setWorkBufferModifier({ glsl });
// component.setParameter('uTint', [1.0, 0.3, 0.3]);
//   const glsl = `
// uniform float uHeightMin;
// uniform float uHeightMax;
// uniform vec3 uWarmColor;
// uniform vec3 uCoolColor;
// uniform float uContrast;

// void modifySplatCenter(inout vec3 center) {
// }

// void modifySplatRotationScale(
//     vec3 originalCenter,
//     vec3 modifiedCenter,
//     inout vec4 rotation,
//     inout vec3 scale
// ) {
// }

// void modifySplatColor(vec3 center, inout vec4 color) {
//     float h = clamp((center.y - uHeightMin) / (uHeightMax - uHeightMin), 0.0, 1.0);

//     // 增强对比，让变化更明显
//     h = pow(h, uContrast);

//     vec3 tint = mix(uCoolColor, uWarmColor, h);

//     // 亮度范围拉大一点
//     float lighting = mix(0.45, 1.35, h);

//     color.rgb *= tint;
//     color.rgb *= lighting;
// }
// `;

//   component.setWorkBufferModifier({ glsl });
//   component.setParameter('uHeightMin', 0.0);
//   component.setParameter('uHeightMax', 10.0);
//   component.setParameter('uWarmColor', [1.15, 1.0, 0.9]);
//   component.setParameter('uCoolColor', [0.75, 0.82, 1.08]);
//   component.setParameter('uContrast', 1.4);
    

  const glsl = `
uniform vec3 uLightDir;
uniform vec3 uWarmColor;
uniform vec3 uCoolColor;
uniform float uContrast;
uniform float uIntensity;

void modifySplatCenter(inout vec3 center) {
}

void modifySplatRotationScale(
    vec3 originalCenter,
    vec3 modifiedCenter,
    inout vec4 rotation,
    inout vec3 scale
) {
}

void modifySplatColor(vec3 center, inout vec4 color) {
    vec3 fakeNormal = normalize(vec3(center.x * 0.6, 1.0, center.z * 0.6));

    float ndl = max(dot(fakeNormal, normalize(-uLightDir)), 0.0);
    ndl = pow(ndl, uContrast);

    vec3 tint = mix(uCoolColor, uWarmColor, ndl);
    float lighting = mix(0.9, 1.2 * uIntensity, ndl);

    color.rgb *= tint;
    color.rgb *= lighting;
}
`;
  useLayoutEffect(() => {
    if (!component) return;

    component.setWorkBufferModifier({ glsl });
  }, [component]);

  useEffect(() => {
    if (!component || !app) return;

    const updateLightParams = () => {
      // const sun = app.root.findByName('sun');
      // if (!sun) return;

      // const forward = sun.forward;

      component.setParameter('uLightDir', [0.35, -0.87, 0.35]);

      component.setParameter('uWarmColor', [1.08, 1.02, 0.97]);
      component.setParameter('uCoolColor', [0.92, 0.95, 1.03]);
      component.setParameter('uContrast', 1.2);
      component.setParameter('uIntensity', 1.2);
    };

    updateLightParams();
    app.on('update', updateLightParams);

    return () => {
      app.off('update', updateLightParams);
    };
  }, [component, app]);

  return null;
};