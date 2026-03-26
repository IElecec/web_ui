import { type AssetResult, useApp, useParent } from '@playcanvas/react/hooks';
import { fetchAsset } from '@playcanvas/react/utils';
import type { Asset, GSplat, GSplatComponent, GSplatInstance, GSplatResource } from 'playcanvas';
import { useEffect, useLayoutEffect, useState } from 'react';
import { AnimGSplatInstance } from './AnimGSplatInstance.ts';

export const AnimGSplat = ({
  src,
  frameStart,
  frameLength,
  frameCurrent = 0,
  onLoadFrame = () => {},
}: {
  src: string;
  frameStart: number;
  frameLength: number;
  frameCurrent?: number;
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
    for (let i = 0; i < frameLength; i++) {
      const path = `${src}/frame_${(frameStart + i).toString().padStart(4, '0')}.ply`;

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
  }, [src, frameStart, frameLength, app]);

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
