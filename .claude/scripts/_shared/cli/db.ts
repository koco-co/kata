#!/usr/bin/env bun
import { getDb } from "@shared/lib/client.ts";
import { initDatabase } from "@shared/lib/init.ts";
import { Command } from "commander";

export const program = new Command("db").description("SQLite 数据库管理").showHelpAfterError();

program
  .command("init")
  .description("初始化数据库 schema")
  .action(() => {
    initDatabase();
  });

program
  .command("query")
  .description("执行 SQL 查询")
  .argument("<sql>", "SQL 查询语句")
  .action((sql: string) => {
    const rows = getDb().prepare(sql).all();
    process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
  });
