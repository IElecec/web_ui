import { useApp, useParent } from '@playcanvas/react/hooks';
import { fetchAsset } from '@playcanvas/react/utils';
import type { Asset, GSplatComponent } from 'playcanvas';
import { useEffect, useLayoutEffect, useState } from 'react';

export function StaticGSplat({
  url,
  castShadows = true,
  unified = true,
}: {
  url: string;
  castShadows?: boolean;
  unified?: boolean;
}) {
  const app = useApp();
  const parent = useParent();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [component, setComponent] = useState<GSplatComponent | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAsset({ app, url, type: 'gsplat' })
      .then((loaded: Asset) => {
        if (!cancelled) setAsset(loaded);
      })
      .catch((err) => {
        console.error('Failed to load gsplat asset:', url, err);
      });

    return () => {
      cancelled = true;
    };
  }, [app, url]);

  useLayoutEffect(() => {
    let created = false;
    let comp = parent.findComponent('gsplat') as GSplatComponent | null;

    if (!comp) {
      comp = parent.addComponent('gsplat', {}) as GSplatComponent;
      created = true;
    }

    setComponent(comp);

    return () => {
      try {
        if (created && parent && (parent as any).gsplat) {
          parent.removeComponent('gsplat');
        }
      } catch (e) {
        console.warn('Skip removing gsplat during cleanup:', e);
      }
    };
  }, [parent]);

  useLayoutEffect(() => {
    if (!asset || !component) return;

    component.castShadows = castShadows;
    component.unified = unified;
    component.asset = asset;
  }, [asset, component, castShadows, unified]);

  return null;
}