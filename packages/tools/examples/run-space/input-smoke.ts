import { defineSpaceProgram } from "@oncyberio/tools/space";
import * as engineInput from "@oncyberio/engine/input";

const inputApi = (engineInput as any).default ?? engineInput;
const {
  createInputs,
  Custom,
  Interactions,
  Keyboard,
  sharedControlState,
} = inputApi;

const inputsConfig = {
  Move: {
    type: "vector2",
    bindings: [Keyboard.wasd()],
  },
  Confirm: {
    type: "button",
    bindings: [Keyboard.button("Space"), Custom.button("confirm")],
    interactions: [Interactions.press("pressOnly")],
  },
} as const;

export default defineSpaceProgram(async ({ engine, space }) => {
  sharedControlState.reset();

  const inputs = createInputs(inputsConfig);
  let confirmPerformed = 0;
  const unsubscribe = inputs.Confirm.onPerformed(() => {
    confirmPerformed += 1;
  });

  try {
    space.start();

    sharedControlState.keyboard.pressKey("KeyW");
    engine.tick(1 / 60);
    inputs.update(1 / 60);

    const afterKeyboard = {
      confirmPerformed,
      confirmPressed: inputs.Confirm.isPressed,
      move: inputs.Move.readValue(),
      wasJustPressed: inputs.Confirm.wasJustPressed,
    };

    sharedControlState.keyboard.releaseKey("KeyW");
    sharedControlState.custom.pressButton("confirm");
    engine.tick(1 / 60);
    inputs.update(1 / 60);

    const afterCustom = {
      confirmPerformed,
      confirmPressed: inputs.Confirm.isPressed,
      move: inputs.Move.readValue(),
      wasJustPressed: inputs.Confirm.wasJustPressed,
    };

    sharedControlState.custom.releaseButton("confirm");
    engine.tick(1 / 60);
    inputs.update(1 / 60);

    return {
      afterKeyboard,
      afterCustom,
      afterRelease: {
        confirmPerformed,
        confirmPressed: inputs.Confirm.isPressed,
        wasJustReleased: inputs.Confirm.wasJustReleased,
      },
    };
  } finally {
    unsubscribe();
    inputs.dispose();
    sharedControlState.reset();
  }
});
