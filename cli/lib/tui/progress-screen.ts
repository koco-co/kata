import { Box, render, Text, useApp, useInput } from "ink";
import { createElement, type ReactNode, useEffect, useMemo, useState } from "react";
import type { CaseItem } from "../cases/types.ts";
import { type CaseProgress, readProgressFile } from "./progress-state.ts";

interface ProgressScreenProps {
  runId: string;
  runPath: string;
  cases: readonly CaseItem[];
  exit: Promise<number>;
}

const h = createElement;

function statusColor(status: CaseProgress["status"]): string {
  if (status === "passed") return "green";
  if (status === "failed" || status === "broken") return "red";
  if (status === "running") return "cyan";
  if (status === "skipped") return "yellow";
  return "gray";
}

function counts(items: readonly CaseProgress[]): Record<string, number> {
  return items.reduce<Record<string, number>>((result, item) => {
    result[item.status] = (result[item.status] ?? 0) + 1;
    return result;
  }, {});
}

function ProgressScreen({ runId, runPath, cases, exit }: ProgressScreenProps): ReactNode {
  const { exit: leave } = useApp();
  const [items, setItems] = useState<CaseProgress[]>(() =>
    cases.map((item) => ({ caseId: item.id, title: item.title, status: "queued" })),
  );
  const [selected, setSelected] = useState(0);
  const [detail, setDetail] = useState<number | undefined>(undefined);
  const [finished, setFinished] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setItems(readProgressFile(runPath, cases));
    }, 500);
    exit.then((code) => {
      setExitCode(code);
      setFinished(true);
      setItems(readProgressFile(runPath, cases));
      clearInterval(timer);
    });
    return () => clearInterval(timer);
  }, [cases, exit, runPath]);

  useInput((_input, key) => {
    if (key.downArrow) setSelected((value) => Math.min(Math.max(items.length - 1, 0), value + 1));
    if (key.upArrow) setSelected((value) => Math.max(0, value - 1));
    if (key.return) {
      if (finished) {
        leave();
      } else {
        setDetail((value) => (value === selected ? undefined : selected));
      }
    }
    if (key.escape && finished) leave();
  });

  const summary = useMemo(() => counts(items), [items]);
  const selectedItem = items[selected];
  const statusLine = `queued ${summary.queued ?? 0} · running ${summary.running ?? 0} · passed ${
    summary.passed ?? 0
  } · failed ${summary.failed ?? 0} · skipped ${summary.skipped ?? 0}`;

  return h(
    Box,
    { flexDirection: "column" },
    h(
      Text,
      { bold: true },
      `Automation run · ${runId} · ${finished ? (exitCode === 0 ? "passed" : "failed") : "running"}`,
    ),
    h(Text, { color: "gray" }, statusLine),
    h(
      Box,
      { flexDirection: "column", marginTop: 1 },
      items.map((item, index) =>
        h(
          Text,
          { key: item.caseId, color: index === selected ? "white" : statusColor(item.status) },
          `${index === selected ? ">" : " "} ${item.status.padEnd(10)} ${item.caseId} ${item.title}`,
        ),
      ),
    ),
    detail !== undefined && selectedItem
      ? h(
          Box,
          { flexDirection: "column", marginTop: 1 },
          h(Text, { bold: true }, selectedItem.caseId),
          selectedItem.step ? h(Text, null, `Step: ${selectedItem.step}`) : null,
          selectedItem.error ? h(Text, { color: "red" }, `Error: ${selectedItem.error}`) : null,
        )
      : null,
    h(
      Box,
      { marginTop: 1 },
      h(
        Text,
        { color: "gray" },
        finished ? "Enter: continue · Esc: leave view" : "↑/↓: select · Enter: detail",
      ),
    ),
  );
}

export async function showProgressScreen(props: ProgressScreenProps): Promise<void> {
  const instance = render(h(ProgressScreen, props));
  await instance.waitUntilExit();
  instance.unmount();
}
