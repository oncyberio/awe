import { useSyncExternalStore } from "react";

type Callback = () => void;

/**
 * @public
 */
export class Store<State> {
  //
  private _callbacks: Callback[] = [];

  constructor(protected _state: State) {}

  public getState = () => this._state;

  public get state() {
    return this._state;
  }

  public subscribe = (cb: Callback) => {
    //
    this._callbacks.push(cb);

    return () => {
      //
      this._callbacks = this._callbacks.filter((c) => c !== cb);
    };
  };

  public notify = () => {
    //
    this._callbacks.forEach((cb) => cb());
  };

  public update = (newState: Partial<State> | ((state: State) => State)) => {
    //
    if (typeof newState === "function") {
      this._state = newState(this._state);
    } else {
      this._state = {
        ...this._state,
        ...newState,
      };
    }

    this.notify();
  };
}

/**
 * @public
 */
export interface StoreLike<T> {
  subscribe: (cb: Callback) => () => void;
  getState: () => T;
}

/**
 * @public
 */
export function useStore<T>(store: StoreLike<T>) {
  //
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
