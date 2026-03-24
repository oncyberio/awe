import type { ComponentData, Game } from "@oncyberio/engine";
import type { EngineHeadless } from "@oncyberio/engine/headless";
import type { Space } from "@oncyberio/engine/space";

export type SpaceSnapshot<
  TComponent extends ComponentData = ComponentData,
> = Omit<Game, "components"> & {
  components: Record<string, TComponent>;
};

export interface RunSpaceContext<
  TSnapshot extends SpaceSnapshot = SpaceSnapshot,
> {
  engine: EngineHeadless;
  projectDir: string;
  publicDir: string | null;
  scenePath: string;
  snapshot: TSnapshot;
  space: Space;
}

export type SpaceProgram<
  TResult = unknown,
  TSnapshot extends SpaceSnapshot = SpaceSnapshot,
> = (
  ctx: RunSpaceContext<TSnapshot>,
) => TResult | Promise<TResult>;
