import { DemoConfig, ActConfig, isActConfig, Demo, Scene } from '../models';

/**
 * Normalizes a version 3 ActConfig to a legacy DemoConfig structure
 * This allows existing code to work with version 3 files transparently
 */
export function normalizeActConfig(config: ActConfig): DemoConfig {
  return {
    $schema: config.$schema,
    title: config.title,
    description: config.description,
    version: config.version,
    timer: config.timer,
    engageTime: config.engageTime,
    demos: config.scenes.map((scene) => sceneToDemo(scene)),
  };
}

/**
 * Converts a Scene (v3) to a Demo (v1/v2)
 */
function sceneToDemo(scene: Scene): Demo {
  return {
    id: scene.id,
    title: scene.title,
    description: scene.description,
    steps: scene.moves,
    icons: scene.icons,
    notes: scene.notes,
    disabled: scene.disabled,
  };
}

/**
 * Normalizes any config to the legacy DemoConfig structure
 * @param config The config to normalize (can be DemoConfig or ActConfig)
 * @returns A DemoConfig in the legacy format
 */
export function normalizeDemoConfig(config: DemoConfig | ActConfig): DemoConfig {
  if (isActConfig(config)) {
    return normalizeActConfig(config);
  }
  return config;
}

/**
 * Converts a DemoConfig to an ActConfig (v3)
 * Useful when upgrading files or creating new v3 files
 */
export function demoConfigToActConfig(config: DemoConfig, productIcon?: string): ActConfig {
  return {
    $schema: config.$schema,
    title: config.title,
    description: config.description,
    version: 3,
    timer: config.timer,
    productIcon: productIcon,
    engageTime: config.engageTime,
    scenes: config.demos.map((demo) => demoToScene(demo)),
  };
}

/**
 * Converts a Demo (v1/v2) to a Scene (v3)
 */
function demoToScene(demo: Demo): Scene {
  return {
    id: demo.id,
    title: demo.title,
    description: demo.description,
    moves: demo.steps,
    icons: demo.icons,
    notes: demo.notes,
    disabled: demo.disabled,
  };
}
