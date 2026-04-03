import { useLayoutEffect } from 'react';
import { useParent } from '@playcanvas/react/hooks';
import * as pc from 'playcanvas';

// 这个路径取决于你的 bundler。
// 如果这里报找不到模块，就把 playcanvas 包里的
// scripts/esm/shadow-catcher.mjs 复制到 src/vendor/ 里再本地 import。
import { ShadowCatcher } from 'playcanvas/scripts/esm/shadow-catcher.mjs';

type ShadowCatcherProps = {
  scale?: [number, number, number];
  y?: number;
  enabled?: boolean;
};

export function ShadowCatcherPlane({
  scale = [100, 100, 100],
  y = 0,
  enabled = true,
}: ShadowCatcherProps) {
  const parent = useParent();

  useLayoutEffect(() => {
    if (!parent) return;

    parent.enabled = enabled;
    parent.setLocalPosition(0, y, 0);

    let createdScriptComponent = false;
    if (!(parent as any).script) {
      parent.addComponent('script');
      createdScriptComponent = true;
    }

    const scriptComponent = (parent as any).script;
    let scriptInstance: any = null;

    try {
      scriptInstance = scriptComponent.create(ShadowCatcher, {
        properties: {
          scale: new pc.Vec3(scale[0], scale[1], scale[2]),
        },
      });
    } catch (e) {
      console.error('Failed to create ShadowCatcher script:', e);
    }

    return () => {
      try {
        if (scriptInstance?.destroy) {
          scriptInstance.destroy();
        }
      } catch (e) {
        console.warn('Failed to destroy ShadowCatcher instance:', e);
      }

      try {
        if (createdScriptComponent && (parent as any).script) {
          parent.removeComponent('script');
        }
      } catch (e) {
        console.warn('Failed to remove script component:', e);
      }
    };
  }, [parent, scale, y, enabled]);

  return null;
}