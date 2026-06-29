const b64Encode = (str) => Buffer.from(str).toString("base64");


export const LANGUAGE_CONFIG = {
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
    image: "eclipse-temurin:17-jdk-alpine",
    compile: (code) =>
      `mkdir -p /sandbox && cd /sandbox && printf "%s" "${b64Encode(code)}" | base64 -d > Main.java && javac Main.java > build.log 2>&1 || (cat build.log >&2 && exit 1)`,
    run: (input) =>
      `cd /sandbox && printf "%s" "${b64Encode(input)}" | base64 -d > in.txt && timeout 5s java -Xmx128m -XX:+UseSerialGC -Djava.awt.headless=true Main < in.txt`,
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
    compile: (code) => `
      mkdir -p /sandbox && cd /sandbox && \
      apk add --no-cache npm > /dev/null 2>&1 && \
      npm install typescript @types/node > /dev/null 2>&1 && \
      printf "%s" "${b64Encode(code)}" | base64 -d > main.ts && \
      npx tsc main.ts --target es6 --module commonjs --types node --typeRoots ./node_modules/@types --esModuleInterop > build.log 2>&1 || (cat build.log && exit 1)`,

    run: (input) =>
      `cd /sandbox && printf "%s" "${b64Encode(input)}" | base64 -d > in.txt && timeout 5s node main.js < in.txt`,
  },
};