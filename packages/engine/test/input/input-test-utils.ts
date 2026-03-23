import { ControlStateManager } from "../../src/input/control-state";
import { sharedControlState } from "../../src/input/shared-control-state";

export function emitInputFrame(
  iterationCount = 1,
  controlState: ControlStateManager = sharedControlState,
): void {
  controlState.processInputFrame(1 / 60, 0);
  if (iterationCount > 0) {
    controlState.beginFixedUpdates(iterationCount);
  }
}

export function pressKey(
  code: string,
  controlState: ControlStateManager = sharedControlState,
): void {
  controlState.keyboard.pressKey(code);
}

export function releaseKey(
  code: string,
  controlState: ControlStateManager = sharedControlState,
): void {
  controlState.keyboard.releaseKey(code);
}

export function moveMouse(
  dx: number,
  dy: number,
  controlState: ControlStateManager = sharedControlState,
  x = 0,
  y = 0,
): void {
  controlState.mouse.move(dx, dy, x, y);
}

export function scrollMouse(
  deltaY: number,
  controlState: ControlStateManager = sharedControlState,
): void {
  controlState.mouse.scroll(deltaY);
}

export function pressMouseButton(
  button: number,
  controlState: ControlStateManager = sharedControlState,
): void {
  controlState.mouse.pressButton(button);
}

export function releaseMouseButton(
  button: number,
  controlState: ControlStateManager = sharedControlState,
): void {
  controlState.mouse.releaseButton(button);
}

export function setJoystick(
  x: number,
  y: number,
  controlState: ControlStateManager = sharedControlState,
): void {
  controlState.touch.setJoystick(x, y);
}

export function pressCustomButton(
  event: string,
  controlState: ControlStateManager = sharedControlState,
): void {
  controlState.custom.pressButton(event);
}

export function releaseCustomButton(
  event: string,
  controlState: ControlStateManager = sharedControlState,
): void {
  controlState.custom.releaseButton(event);
}

export function setCustomValue(
  event: string,
  value: number,
  controlState: ControlStateManager = sharedControlState,
): void {
  controlState.custom.setValue(event, value);
}

export function setCustomVector2(
  event: string,
  x: number,
  y: number,
  controlState: ControlStateManager = sharedControlState,
): void {
  controlState.custom.setVector2(event, x, y);
}

export function setupNavigatorMock(): void {
  (globalThis as any).navigator ??= {};
  (globalThis as any).navigator.getGamepads ??= () => [];
}

export function createMockGamepad(options: {
  buttons?: Array<{ pressed: boolean; value: number }>;
  axes?: number[];
}): any {
  return {
    connected: true,
    index: 0,
    buttons:
      options.buttons ??
      Array(16)
        .fill(null)
        .map(() => ({ pressed: false, value: 0 })),
    axes: options.axes ?? [0, 0, 0, 0],
  };
}
