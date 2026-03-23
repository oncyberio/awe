/**
 * Input grouping utilities for managing related inputs.
 *
 * @module input-map
 */

import type { InputAction } from "./input-action";
import { createInputAction } from "./input-action";
import { readInputsSnapshot, type InputSnapshot } from "./input-snapshot";
import { InputValue } from "./input-value";
import { ControlStateManager, ControlStateEvents } from "./control-state";
import { sharedControlState } from "./shared-control-state";
import type { Vector2 } from "./bindings";
import type {
  ButtonInputConfig,
  TypedActionsConfig,
  TypedInputConfig,
  ValueInputConfig,
  ValueDataType,
  Vector2InputConfig,
} from "./types";

/**
 * Maps input config to return type for each input.
 * - "button" → InputAction
 * - "value" → InputValue<number>
 * - "vector2" → InputValue<Vector2>
 */
type InputFromConfig<T extends TypedInputConfig> = T["type"] extends "button"
  ? InputAction
  : T["type"] extends "vector2"
    ? InputValue<Vector2>
    : InputValue<number>;

/**
 * Result type from createInputs - direct access to typed inputs plus helpers.
 */
export type Inputs<TConfig extends TypedActionsConfig> = {
  readonly [K in keyof TConfig]: InputFromConfig<TConfig[K]>;
} & InputsHelpers<TConfig>;

export interface CreateInputsOptions {
  /** Control state instance to bind against. Defaults to the shared singleton. */
  controlState?: ControlStateManager;
  /**
   * Sampling mode:
   * - `event` subscribes to INPUT_STATE_READY automatically
   * - `manual` lets the caller drive sampling explicitly via `inputs.sample()`
   */
  sampling?: "event" | "manual";
}

/**
 * Helper methods available on the inputs object.
 */
export interface InputsHelpers<
  TConfig extends TypedActionsConfig = TypedActionsConfig,
> {
  /** Bound control state manager. */
  readonly controlState: ControlStateManager;
  /** Sample current bound control state immediately. */
  sample(state?: ControlStateManager): void;
  /** Update all inputs. Call this in your game loop (render or fixed update). */
  update(dt: number): void;
  /** Read the current typed gameplay snapshot. */
  readSnapshot(): InputSnapshot<TConfig>;
  /** Enable all inputs. */
  enable(): void;
  /** Disable all inputs. */
  disable(): void;
  /** Dispose all inputs and unsubscribe from events. */
  dispose(): void;
  /** Whether inputs are currently enabled. */
  readonly enabled: boolean;
}

/**
 * Creates a group of inputs with direct typed access.
 *
 * Returns an object where each input is directly accessible by name,
 * plus helper methods for update/enable/disable/dispose.
 *
 * @example
 * ```ts
 * const inputs = createInputs({
 *   Move: { type: "vector2", bindings: [Keyboard.wasd(), Gamepad.leftStick()] },
 *   Jump: { type: "button", bindings: [Keyboard.button("Space")] },
 * });
 *
 * // Direct typed access - no lookup needed
 * inputs.Jump.onPerformed(() => player.jump());
 * const dir = inputs.Move.readValue(); // Vector2
 *
 * // In game loop
 * inputs.update(dt);
 *
 * // Context switching
 * inputs.disable();
 * inputs.enable();
 *
 * // Cleanup
 * inputs.dispose();
 * ```
 */
export function createInputs<TConfig extends TypedActionsConfig>(
  config: TConfig,
  options: CreateInputsOptions = {},
): Inputs<TConfig> {
  const controlState = options.controlState ?? sharedControlState;
  const sampling = options.sampling ?? "event";
  const allInputs: (InputAction | InputValue<ValueDataType>)[] = [];
  const inputProps: Record<string, InputAction | InputValue<ValueDataType>> =
    {};

  let _enabled = true;
  let _disposed = false;

  // Create inputs from config
  for (const [name, inputConfig] of Object.entries(config)) {
    if (inputConfig.type === "button") {
      const action = InputActions.button(name, inputConfig);
      allInputs.push(action);
      inputProps[name] = action;
    } else if (inputConfig.type === "vector2") {
      const value = InputValues.vector2(name, inputConfig);
      allInputs.push(value);
      inputProps[name] = value;
    } else {
      const value = InputValues.value(name, inputConfig);
      allInputs.push(value);
      inputProps[name] = value;
    }
  }

  // Sample handler
  const onInputStateReady = (state: ControlStateManager): void => {
    if (!_enabled || _disposed) return;
    for (const input of allInputs) {
      input.sample(state);
    }
  };

  if (sampling === "event") {
    controlState.on(ControlStateEvents.INPUT_STATE_READY, onInputStateReady);
  }

  // Helper methods
  let inputsRef!: Inputs<TConfig>;

  const helpers: InputsHelpers<TConfig> = {
    get controlState(): ControlStateManager {
      return controlState;
    },

    sample(state: ControlStateManager = controlState): void {
      if (!_enabled || _disposed) return;
      onInputStateReady(state);
    },

    update(dt: number): void {
      if (!_enabled || _disposed) return;
      for (const input of allInputs) {
        if (input instanceof InputValue) {
          input.update();
        } else {
          (input as InputAction).update(dt);
        }
      }
    },

    readSnapshot(): InputSnapshot<TConfig> {
      return readInputsSnapshot(inputsRef);
    },

    enable(): void {
      if (_enabled) return;
      _enabled = true;
      for (const input of allInputs) {
        input.enabled = true;
      }
    },

    disable(): void {
      if (!_enabled) return;
      _enabled = false;
      for (const input of allInputs) {
        input.enabled = false;
      }
    },

    dispose(): void {
      if (_disposed) return;
      _disposed = true;
      _enabled = false;
      if (sampling === "event") {
        controlState.off(ControlStateEvents.INPUT_STATE_READY, onInputStateReady);
      }
      allInputs.length = 0;
    },

    get enabled(): boolean {
      return _enabled;
    },
  };

  // Combine input properties with helpers
  inputsRef = Object.assign(inputProps, helpers) as Inputs<TConfig>;
  return inputsRef;
}

/**
 * Factory functions for creating InputValue instances from typed config.
 */
const InputValues = {
  value: (name: string, config: ValueInputConfig) => {
    return new InputValue<number>(
      {
        type: "number",
        name,
        bindings: [...config.bindings],
        processors: config.processors ? [...config.processors] : undefined,
      },
      0
    );
  },
  vector2: (name: string, config: Vector2InputConfig) => {
    return new InputValue<Vector2>(
      {
        type: "vector2",
        name,
        bindings: [...config.bindings],
        processors: config.processors ? [...config.processors] : undefined,
      },
      { x: 0, y: 0 }
    );
  },
};

/**
 * Factory functions for creating InputAction instances from typed config.
 */
const InputActions = {
  button: (name: string, config: ButtonInputConfig) => {
    return createInputAction({
      name,
      bindings: [...config.bindings],
      interactions: config.interactions ? [...config.interactions] : undefined,
      processors: config.processors ? [...config.processors] : undefined,
    });
  },
};
