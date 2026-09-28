export type WasmRuntime = {
  instance: WebAssembly.Instance;
  memory: WebAssembly.Memory;
};

const IDENTITY_WASM = new Uint8Array([
  0,97,115,109,1,0,0,0,1,6,1,96,0,1,127,3,2,1,0,5,3,1,0,1,
  7,15,1,11,102,97,99,116,111,114,121,0,0,10,9,1,7,0,65,42,11
]);

export async function createWasmRuntime(bytes: BufferSource = IDENTITY_WASM): Promise<WasmRuntime> {
  const { instance } = await WebAssembly.instantiate(bytes);
  const memory = (instance.exports.memory as WebAssembly.Memory | undefined) ?? new WebAssembly.Memory({ initial: 1 });
  return { instance, memory };
}

export async function runWasmSmokeTest(): Promise<number> {
  const runtime = await createWasmRuntime();
  const factory = runtime.instance.exports.factory;
  if (typeof factory !== "function") throw new Error("WASM smoke-test export missing.");
  return Number(factory());
}
