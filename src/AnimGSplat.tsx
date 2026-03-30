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
    const asset = assets[frameCurrent]?.asset;
    if (asset) {
      const resource = asset.resource as GSplatResource;
      if (component)
        if (component.instance) {
          const instance = component.instance as AnimGSplatInstance;
          instance.updateGSplat(resource.createSplat() as GSplat);
        } else {
          const gsplat = resource.createSplat() as GSplat;
          component.instance = new AnimGSplatInstance(gsplat, gsplat.numSplats * 2) as GSplatInstance;
        }
    }
    return () => {};
  }, [frameCurrent, component, assets]);

  return null;
};