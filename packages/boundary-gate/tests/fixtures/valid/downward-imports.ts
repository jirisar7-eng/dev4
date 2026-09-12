/**
 * Testovací fixture: Povolené downward importy dle architektury
 * Směr závislostí: Domain -> CMS -> Synthesis OS (PASS)
 */
import { CoreEngine } from "@tmpr/synthesis-core";
import { CmsRegistry } from "@tmpr/synthesis-cms";
import { Button } from "@tmpr/ui";

export function initFeature() {
  return { CoreEngine, CmsRegistry, Button };
}
