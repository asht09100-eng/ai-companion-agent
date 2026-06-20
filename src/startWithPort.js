import "./config/loadEnv.js";

const portArg = process.argv[2];
if (portArg) {
  process.env.PORT = portArg;
}

await import("./server.js");
