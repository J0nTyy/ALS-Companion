import { useCallback, useState } from "react";

import {
  IDENTITY_TRANSFORM,
  panTransform,
  zoomTransform,
  type ImageViewerController,
} from "./image-transform";

/**
 * Local transform state for a single {@link ImageViewer} used uncontrolled. Built
 * on the pure transform functions, so the standalone viewer and the comparison
 * workspace share exactly the same zoom/pan behavior.
 */
export function useImageTransform(): ImageViewerController {
  const [transform, setTransform] = useState(IDENTITY_TRANSFORM);

  const zoomBy = useCallback(
    (factor: number) => setTransform((t) => zoomTransform(t, factor)),
    [],
  );
  const panBy = useCallback(
    (dx: number, dy: number) => setTransform((t) => panTransform(t, dx, dy)),
    [],
  );
  const reset = useCallback(() => setTransform(IDENTITY_TRANSFORM), []);
  const fit = useCallback(() => setTransform(IDENTITY_TRANSFORM), []);

  return { transform, zoomBy, panBy, reset, fit };
}
