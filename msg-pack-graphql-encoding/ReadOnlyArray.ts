interface ReadonlyArrayConstructor {
  new (arrayLength?: number): ReadonlyArray<any>;
  new <T>(arrayLength: number): ReadonlyArray<T>;
  new <T>(...items: T[]): ReadonlyArray<T>;
  (arrayLength?: number): ReadonlyArray<any>;
  <T>(arrayLength: number): ReadonlyArray<T>;
  <T>(...items: T[]): ReadonlyArray<T>;
  isArray(arg: any): arg is ReadonlyArray<any>;
  readonly prototype: ReadonlyArray<any>;
}
export const ReadonlyArray = Array as ReadonlyArrayConstructor;
