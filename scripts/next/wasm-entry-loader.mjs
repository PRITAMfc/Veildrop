const MARKER = '__wbg_set_wasm(wasm)';

const REWRITE = `import * as wasmModule from "./midnight_onchain_runtime_wasm_bg.wasm";
export * from "./midnight_onchain_runtime_wasm_bg.js";
import { __wbg_set_wasm } from "./midnight_onchain_runtime_wasm_bg.js";
const wasm = await wasmModule;
__wbg_set_wasm(wasm);
if (typeof wasm.__wbindgen_start === "function") {
  wasm.__wbindgen_start();
}`;

export default function wasmEntryLoader(source) {
  if (!source.includes(MARKER)) {
    return source;
  }
  return REWRITE;
}
