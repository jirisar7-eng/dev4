/**
 * @tmpr/module-engine - Module Registry Utilities
 * Pomocné funkce pro hluboké zmrazení a neměnnost dat.
 */

import type { DeepReadonly } from "./registry.types.js";

/**
 * Rekurzivně zmrazí hodnotu (objekty, pole a vnořené vlastnosti).
 * Primitivní hodnoty, funkce a null/undefined vrací beze změny.
 * Zabraňuje zacyklení na cyklických strukturách pomocí WeakSet.
 */
export function deepFreeze<T>(value: T, seen = new WeakSet<object>()): DeepReadonly<T> {
  if (value === null || typeof value !== "object") {
    return value as DeepReadonly<T>;
  }

  if (seen.has(value)) {
    return value as DeepReadonly<T>;
  }
  seen.add(value);

  const propNames = Object.getOwnPropertyNames(value);
  for (const name of propNames) {
    const prop = (value as Record<string, unknown>)[name];
    if (prop !== null && typeof prop === "object") {
      deepFreeze(prop, seen);
    }
  }

  return Object.freeze(value) as DeepReadonly<T>;
}
