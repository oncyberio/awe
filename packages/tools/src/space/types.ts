export interface SpaceSnapshot {
  components: Record<string, any>;
  creatorId?: string;
  editors?: string[];
  id: string;
}

export interface RunSpaceContext {
  engine: any;
  projectDir: string;
  publicDir: string | null;
  scenePath: string;
  snapshot: SpaceSnapshot;
  space: any;
}

export type SpaceProgram<TResult = unknown> = (
  ctx: RunSpaceContext,
) => TResult | Promise<TResult>;
