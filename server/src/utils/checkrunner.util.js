import { getQuickJS } from "quickjs-emscripten";

let quickJSInstance = null;

async function getQuickJSSingleton() {
  if (!quickJSInstance) {
    quickJSInstance = await getQuickJS();
  }

  return quickJSInstance;
}

const MEMORY_LIMIT_BYTES = 32 * 1024 * 1024;

export async function runCustomChecker({
  checker,
  input,
  actualOutput,
  expectedOutput,
}) {
  if (!checker || !checker.scriptSource) {
    return {
      passed: false,
      reason: "No checker script configured for this question",
    };
  }

  const QuickJS = await getQuickJSSingleton();
  const vm = QuickJS.newContext();

  const timeoutMs = checker.timeoutMs || 2000;
  const deadline = Date.now() + timeoutMs;

  try {
    vm.runtime.setMemoryLimit(MEMORY_LIMIT_BYTES);
    vm.runtime.setInterruptHandler(() => Date.now() > deadline);

    const inputLiteral = JSON.stringify(input ?? null);
    const actualLiteral = JSON.stringify(actualOutput ?? "");
    const expectedLiteral = JSON.stringify(expectedOutput ?? null);

    const wrapped = `
      ${checker.scriptSource}

      (function() {
        const result = check(${inputLiteral}, ${actualLiteral}, ${expectedLiteral});
        const normalized = (typeof result === "boolean")
          ? { passed: result, reason: null }
          : { passed: Boolean(result && result.passed), reason: (result && result.reason) || null };
        return JSON.stringify(normalized);
      })();
    `;

    const evalResult = vm.evalCode(wrapped);

    if (evalResult.error) {
      const errMsg = vm.dump(evalResult.error);
      evalResult.error.dispose();
      return {
        passed: false,
        reason: `Checker error: ${JSON.stringify(errMsg)}`,
      };
    }

    const resultJson = vm.dump(evalResult.value);
    evalResult.value.dispose();
    return JSON.parse(resultJson);
  } catch (error) {
    return {
      passed: false,
      reason: `Checker execution error: ${error.message}`,
    };
  } finally {
    vm.dispose();
  }
}

export const unorderedMatchCheck = (actual, expected) => {
  try {
    const a = JSON.parse(actual).map(String).sort();
    const e = JSON.parse(expected).map(String).sort();
    return JSON.stringify(a) === JSON.stringify(e);
  } catch {
    return false;
  }
};