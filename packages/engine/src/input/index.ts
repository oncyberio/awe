/**
 * AWE Input System
 *
 * A Unity-inspired input system supporting multiple devices (keyboard, mouse, gamepad, touch)
 * with semantic actions, event-driven callbacks, and continuous value polling.
 *
 * Main entry point: createInputs
 * - Button actions (type: "button") → InputAction with event callbacks
 * - Value actions (type: "value", "vector2") → InputValue<T> for polling
 *
 * @example
 * ```ts
 * import { createInputs, Keyboard, Gamepad } from "awe-engine";
 *
 * const inputs = createInputs({
 *   Move: { type: "vector2", bindings: [Keyboard.wasd(), Gamepad.leftStick()] },
 *   Jump: { type: "button", bindings: [Keyboard.button("Space"), Gamepad.button("A")] },
 * });
 *
 * inputs.Jump.onPerformed(() => player.jump());
 * const dir = inputs.Move.readValue(); // { x, y }
 *
 * // In game loop
 * inputs.update(dt);
 * ```
 *
 * @module input
 */

// Control State
export {
  // Classes
  ControlStateManager,
  KeyboardState,
  MouseState,
  GamepadState,
  TouchState,
  CustomState,
} from "./control-state";
export type {
  DeviceType,
  GamepadButtonName,
  GamepadAxisName,
  ControlStateManagerOptions,
} from "./control-state";
export { GamepadButtons, GamepadAxes } from "./control-state";
export {
  SharedControlStateManager,
  sharedControlState,
} from "./shared-control-state";
export type { SharedControlStateOptions } from "./shared-control-state";
export { BrowserInputCapture } from "./input-capture";
export type {
  ControlStateCaptureBackend,
  ControlStateCaptureMode,
  BrowserInputCaptureOptions,
} from "./input-capture";

// Bindings (device-based factories)
export {
  Keyboard,
  Gamepad,
  Mouse,
  Touch,
  Custom,
  Composite,
  withProcessors,
  ButtonState,
} from "./bindings";
export type {
  Vector2,
  Binding,
  ValueBinding,
  ButtonBinding,
  KeyBinding,
  KeyAxisBinding,
  KeyButtonBinding,
  GamepadButtonBinding,
  GamepadAxisBinding,
  MouseButtonBinding,
  MouseDeltaBinding,
  MouseWheelBinding,
  TouchTapBinding,
  CustomButtonBinding,
  CustomValueBinding,
  CustomVector2Binding,
  TouchJoystickBinding,
  TouchPositionBinding,
  TouchDeltaBinding,
  CompositeAxis1DBinding,
  CompositeVector2Binding,
  CompositeButtonAnyBinding,
  CompositeButtonAllBinding,
  GamepadStickBinding,
  TouchJoystickVector2Binding,
  DPadBinding,
  // Config types
  BindingConfig,
  ButtonBindingConfig,
  ValueBindingConfig,
  KeyAxisConfig,
  KeyButtonConfig,
  GamepadButtonConfig,
  GamepadAxisConfig,
  GamepadStickConfig,
  DPadConfig,
  MouseButtonConfig,
  MouseDeltaConfig,
  MouseWheelConfig,
  TouchTapConfig,
  CustomButtonConfig,
  CustomValueConfig,
  CustomVector2Config,
  TouchJoystickConfig,
  TouchJoystickVector2Config,
  TouchPositionConfig,
  TouchDeltaConfig,
  CompositeAxis1DConfig,
  CompositeVector2Config,
  CompositeButtonAnyConfig,
  CompositeButtonAllConfig,
} from "./bindings";

// Processors
export type {
  Processor,
  ProcessorConfig,
  ScalarProcessorConfig,
  Vector2ProcessorConfig,
  DeadzoneConfig,
  InvertConfig,
  ScaleConfig,
  ClampConfig,
  NormalizeConfig,
  CurveConfig,
  SnapToZeroConfig,
  DeadzoneVector2Config,
  InvertVector2Config,
  ScaleVector2Config,
  ClampMagnitudeConfig,
  NormalizeVector2Config,
  SwapAxesConfig,
  AxialDeadzoneConfig,
} from "./processors";
export { Processors } from "./processors";

// Interactions
export { Interactions } from "./interactions";
export type {
  InteractionPhase,
  InteractionContext,
  Interaction,
  InteractionConfig,
  PressConfig,
  HoldConfig,
  TapConfig,
  MultiTapConfig,
} from "./interactions";
export {
  PressInteraction,
  HoldInteraction,
  TapInteraction,
  MultiTapInteraction,
} from "./interactions";

// Input Action (buttons)
export { InputAction, createInputAction } from "./input-action";
export type {
  ActionCallbackContext,
  ActionCallback,
  ActionSource,
  InputActionConfig,
} from "./input-action";

// Input Value (continuous)
export { InputValue } from "./input-value";
export type { InputValueConfig } from "./input-value";
export {
  readInputsSnapshot,
  type ButtonInputSnapshot,
  type InputSnapshot,
} from "./input-snapshot";

// Inputs - Main API for creating input groups
export { createInputs } from "./input-map";
export type { CreateInputsOptions, Inputs, InputsHelpers } from "./input-map";

// Typed Config Utilities
export type {
  InputType,
  ButtonInputConfig,
  ValueInputConfig,
  Vector2InputConfig,
  InputConfigByType,
  TypedActionsConfig,
  TypedInputConfig,
  InputTypeToValueType,
} from "./types";
