import { checkRepositoryPolicy, formatPolicyViolations } from "../cli/lib/repository-policy.ts";

const violations = checkRepositoryPolicy(process.cwd());
if (violations.length > 0) {
  process.stderr.write(`${formatPolicyViolations(violations)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("[repository policy] ok\n");
}
