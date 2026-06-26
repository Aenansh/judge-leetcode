import * as k8s from "@kubernetes/client-node";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const cluster = kc.getCurrentCluster();
if (cluster) {
  cluster.skipTLSVerify = true;
} else {
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

const k8sBatchApi = kc.makeApiClient(k8s.BatchV1Api);
const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);

const b64Encode = (str) => Buffer.from(str).toString("base64");

const LANGUAGE_CONFIG = {
  CPP: {
    image: "gcc:latest",
    command: (code, input) =>
      `cd /tmp && echo "${b64Encode(code)}" | base64 -d > main.cpp && echo "${b64Encode(input)}" | base64 -d > in.txt && g++ main.cpp -o main 2> build_error.txt && if [ -f main ]; then ./main < in.txt; else cat build_error.txt; fi`,
  },
  C: {
    image: "gcc:latest",
    command: (code, input) =>
      `echo "${b64Encode(code)}" | base64 -d > main.c && echo "${b64Encode(input)}" | base64 -d > in.txt && gcc main.c -o main && ./main < in.txt`,
  },
  JAVA: {
    image: "openjdk:17",
    command: (code, input) =>
      `echo "${b64Encode(code)}" | base64 -d > Main.java && echo "${b64Encode(input)}" | base64 -d > in.txt && javac Main.java && java Main < in.txt`,
  },
  PYTHON: {
    image: "python:3.11-slim",
    command: (code, input) =>
      `echo "${b64Encode(code)}" | base64 -d > main.py && echo "${b64Encode(input)}" | base64 -d > in.txt && python3 main.py < in.txt`,
  },
  JAVASCRIPT: {
    image: "node:20-alpine",
    command: (code, input) =>
      `echo "${b64Encode(code)}" | base64 -d > main.js && echo "${b64Encode(input)}" | base64 -d > in.txt && node main.js < in.txt`,
  },
  TYPESCRIPT: {
    image: "node:20-alpine",
    command: (code, input) =>
      `echo "${b64Encode(code)}" | base64 -d > main.ts && echo "${b64Encode(input)}" | base64 -d > in.txt && npx tsx main.ts < in.txt`,
  },
};

const watchJobAndGetLogs = async (namespace, jobName) => {
  const maxRetries = 20;
  const delay = 500;

  for (let i = 0; i < maxRetries; i++) {
    await new Promise((resolve) => setTimeout(resolve, delay));

    const res = await k8sBatchApi.readNamespacedJobStatus({
      name: jobName,
      namespace: namespace
    });
    const jobData = res.body || res;
    const status = jobData.status;

    if (status && (status.succeeded || status.failed)) {
      const podRes = await k8sCoreApi.listNamespacedPod({
        namespace: namespace,
        labelSelector: `job-name=${jobName}`,
      });

      const podData = podRes.body || podRes;

      if (!podData.items || podData.items.length === 0) {
        throw new Error("Execution Pod not found.");
      }

      const podName = podData.items[0].metadata.name;

      if (status.failed) {
        console.log(status);
        throw new Error("Time Limit Exceeded or Execution Error.");
      }
      const logRes = await k8sCoreApi.readNamespacedPodLog({
        name: podName,
        namespace: namespace,
      });
      const logText = logRes.body !== undefined ? logRes.body : logRes;

      return typeof logText === "string" ? logText.trim() : "";
    }
  }
  throw new Error("Job tracking timed out.");
};

export const executeInK8s = async (code, language, input, runId) => {
  console.log(code);
  const namespace = "default";
  const jobName = `job-${runId.toLowerCase()}`;

  const config = LANGUAGE_CONFIG[language];

  if (!config) {
    throw new Error(`Unsupported LanguageType: ${language}`);
  }

  const dockerImage = config.image;
  const compileAndRunCmd = config.command(code, input);

  const jobManifest = {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: { name: jobName, namespace },
    spec: {
      activeDeadlineSeconds: 120,
      backoffLimit: 0,
      template: {
        spec: {
          containers: [
            {
              name: "evaluator",
              image: dockerImage,
              command: ["sh", "-c", compileAndRunCmd],
              resources: {
                limits: {
                  memory: "512Mi",
                  cpu: "500m",
                },
              },
            },
          ],
          restartPolicy: "Never",
        },
      },
    },
  };

  try {
    await k8sBatchApi.createNamespacedJob({
      namespace: namespace,
      body: jobManifest,
    });
    const output = await watchJobAndGetLogs(namespace, jobName);
    return { success: true, output };
  } catch (error) {
    console.error(`[K8s Sandbox Error]:`, error.body || error.message);
    return {
      success: false,
      error: error.message || "Compilation or Runtime Error",
    };
  } finally {
    // try {
    //   await k8sBatchApi.deleteNamespacedJob({
    //     name: jobName,
    //     namespace: namespace,
    //     body: {
    //       propagationPolicy: "Background",
    //     },
    //   });
    // } catch (cleanupError) {
    //   console.error(
    //     `Failed to clean up K8s job ${jobName}:`,
    //     cleanupError.message,
    //   );
    // }
  }
};
