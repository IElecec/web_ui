// 使用 Pyodide 的示例
import { useEffect } from "react";

export default function PythonDemo() {
  useEffect(() => {
    async function runPython() {
      const pyodide = await loadPyodide();
      await pyodide.runPythonAsync(`
        import math
        result = math.sqrt(16)
      `);
      console.log(pyodide.globals.get("result")); // 输出 4
    }
    runPython();
  }, []);

  return <div>Python in Browser</div>;
}