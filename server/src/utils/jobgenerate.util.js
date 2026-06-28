import * as k8s from "@kubernetes/client-node";
import stream from "stream";

const kc = new k8s.KubeConfig();
try {
  kc.loadFromDefault();
  const cluster = kc.getCurrentCluster();
  if (cluster) {
    cluster.skipTLSVerify = true;
    if (
      cluster.server.includes("127.0.0.1") ||
      cluster.server.includes("localhost")
    ) {
      cluster.server = cluster.server
        .replace("127.0.0.1", "host.docker.internal")
        .replace("localhost", "host.docker.internal");
    }
  }
} catch (error) {
  kc.loadFromOptions({
    clusters: [
      {
        name: "local-docker",
        server: "http://host.docker.internal:8080",
        skipTLSVerify: true,
      },
    ],
    users: [{ name: "dev" }],
    contexts: [{ name: "dev-context", cluster: "local-docker", user: "dev" }],
    currentContext: "dev-context",
  });
}

const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
const exec = new k8s.Exec(kc);

const b64Encode = (str) => Buffer.from(str).toString("base64");

const LANGUAGE_CONFIG = {
  CPP: {
    image: "gcc:latest",
    compile: (code) =>
      `mkdir -p /sandbox && cd /sandbox && printf "%s" "${b64Encode(code)}" | base64 -d > main.cpp && g++ main.cpp -o app.bin > build.log 2>&1 || (cat build.log >&2 && exit 1)`,
    run: (input) =>
      `cd /sandbox && printf "%s" "${b64Encode(input)}" | base64 -d > in.txt && timeout 5s ./app.bin < in.txt`,
  },
  C: {
    image: "gcc:latest",
    compile: (code) =>
      `mkdir -p /sandbox && cd /sandbox && printf "%s" "${b64Encode(code)}" | base64 -d > main.c && gcc main.c -o app.bin > build.log 2>&1 || (cat build.log >&2 && exit 1)`,
    run: (input) =>
      `cd /sandbox && printf "%s" "${b64Encode(input)}" | base64 -d > in.txt && timeout 5s ./app.bin < in.txt`,
  },
  JAVA: {
    image: "openjdk:17",
    compile: (code) =>
      `mkdir -p /sandbox && cd /sandbox && printf "%s" "${b64Encode(code)}" | base64 -d > Main.java && javac Main.java > build.log 2>&1 || (cat build.log >&2 && exit 1)`,
    run: (input) =>
      `cd /sandbox && printf "%s" "${b64Encode(input)}" | base64 -d > in.txt && timeout 5s java Main < in.txt`,
  },
  PYTHON: {
    image: "python:3.11-slim",
    compile: (code) =>
      `mkdir -p /sandbox && cd /sandbox && printf "%s" "${b64Encode(code)}" | base64 -d > main.py`,
    run: (input) =>
      `cd /sandbox && printf "%s" "${b64Encode(input)}" | base64 -d > in.txt && timeout 5s python3 main.py < in.txt`,
  },
  JAVASCRIPT: {
    image: "node:20-alpine",
    compile: (code) =>
      `mkdir -p /sandbox && cd /sandbox && printf "%s" "${b64Encode(code)}" | base64 -d > main.js`,
    run: (input) =>
      `cd /sandbox && printf "%s" "${b64Encode(input)}" | base64 -d > in.txt && timeout 5s node main.js < in.txt`,
  },
  TYPESCRIPT: {
    image: "node:20-alpine",
    compile: (code) =>
      `mkdir -p /sandbox && cd /sandbox && printf "%s" "${b64Encode(code)}" | base64 -d > main.ts`,
    run: (input) =>
      `cd /sandbox && printf "%s" "${b64Encode(input)}" | base64 -d > in.txt && timeout 5s npx --yes tsx main.ts < in.txt`,
  },
};

export class ExecutionSandbox {
  constructor(runId, language) {
    this.runId = runId.toLowerCase();
    this.podName = `sandbox-${this.runId}`;
    this.namespace = "default";
    this.config = LANGUAGE_CONFIG[language];
    this.language = language;
  }

  async init() {
    if (!this.config) throw new Error(`Unsupported Language: ${this.language}`);

    const podManifest = {
      apiVersion: "v1",
      kind: "Pod",
      metadata: { name: this.podName, namespace: this.namespace },
      spec: {
        containers: [
          {
            name: "evaluator",
            image: this.config.image,
            command: ["sleep", "3600"],
            resources: {
              limits: { memory: "1Gi", cpu: "1000m" },
            },
          },
        ],
        restartPolicy: "Never",
      },
    };

    try {
      await k8sCoreApi.createNamespacedPod({
        namespace: this.namespace,
        body: podManifest,
      });
    } catch (err) {
      throw new Error(
        `Pod Creation Failed: ${err.message || err.type || "Unknown Error"}`,
      );
    }

    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));

      try {
        const res = await k8sCoreApi.readNamespacedPodStatus({
          name: this.podName,
          namespace: this.namespace,
        });

        const podData = res.body || res;
        const status = podData.status || {};
        const phase = status.phase;

        const containerStatuses = status.containerStatuses || [];
        const isReady =
          containerStatuses.length > 0 && containerStatuses[0].ready === true;

        if (phase === "Running" && isReady) {
          await new Promise((r) => setTimeout(r, 500));
          return true;
        }
        if (phase === "Failed" || phase === "Unknown") {
          throw new Error(`Pod failed to start. Status: ${phase}`);
        }
      } catch (error) {
        if (error.statusCode !== 404) {
          console.error(`[Pod Status Polling]`, error.message || error.type);
        }
      }
    }
    throw new Error("Sandbox creation timed out.");
  }

  async execCommand(commandStr) {
    return new Promise((resolve) => {
      let outputData = "";
      const outStream = new stream.PassThrough();

      outStream.on("data", (chunk) => {
        outputData += chunk.toString();
      });

      try {
        const req = exec.exec(
          this.namespace,
          this.podName,
          "evaluator",
          ["sh", "-c", commandStr],
          outStream,
          outStream,
          null,
          false,
          (status) => {
            setTimeout(() => {
              const output = outputData.trim();
              if (status && status.status === "Failure") {
                const errorReason = output.includes("Terminated")
                  ? "Time Limit Exceeded"
                  : output;
                resolve({
                  success: false,
                  output: errorReason || "Execution Failed",
                });
              } else {
                resolve({ success: true, output: output });
              }
            }, 100);
          },
        );
        if (req && req.catch) {
          req.catch((err) => {
            resolve({
              success: false,
              output: `K8s WebSocket Dropped: ${err.message || err.type}`,
            });
          });
        }
      } catch (err) {
        resolve({
          success: false,
          output: `K8s Exec Crash: ${err.message || err.type}`,
        });
      }
    });
  }

  async cleanup() {
    try {
      await k8sCoreApi.deleteNamespacedPod({
        name: this.podName,
        namespace: this.namespace,
        body: { propagationPolicy: "Background" },
      });
    } catch (err) {
      if (err.statusCode !== 404) {
        console.error(
          `[Cleanup Error] ${this.podName}:`,
          err.message || err.type || "Deletion failed",
        );
      }
    }
  }
}
