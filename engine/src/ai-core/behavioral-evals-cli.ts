import { runBehavioralEvals } from "./behavioral-evals.ts";

const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith("--mode="));
const mode = modeArg?.split("=")[1] as "replay" | "record" | undefined;

if (!mode || (mode !== "replay" && mode !== "record")) {
  console.error("Usage: bun run behavioral-evals-cli.ts --mode=replay|record");
  process.exit(1);
}

if (mode === "record" && !process.env.DEEPSEEK_API_KEY) {
  console.error("DEEPSEEK_API_KEY is required for record mode");
  process.exit(1);
}

const result = await runBehavioralEvals({ mode });
console.log(JSON.stringify(result, null, 2));

if (!result.pass) {
  process.exit(1);
}
