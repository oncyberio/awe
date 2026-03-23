import type { SpaceProgram } from "./types";

export function defineSpaceProgram<TResult>(
  program: SpaceProgram<TResult>,
): SpaceProgram<TResult> {
  return program;
}

