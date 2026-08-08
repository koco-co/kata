import { isCancel, note, select } from "@clack/prompts";
import { lintPageCount, lintPageSlice, PAGE_SIZE } from "./lint-result.ts";

export interface PagedItemView<T> {
  label: (item: T) => string;
  hint: (item: T) => string;
  detail?: (item: T) => string;
  detailTitle?: (item: T) => string;
}

export async function showPagedItems<T>(
  title: string,
  items: readonly T[],
  view: PagedItemView<T>,
  countLabel: string,
  emptyMessage: string,
): Promise<void> {
  for (;;) {
    const selected = await selectPagedItem(title, items, view, countLabel, emptyMessage);
    if (!selected || !view.detail) return;
    note(
      view.detail(selected),
      view.detailTitle ? view.detailTitle(selected) : view.label(selected),
    );
  }
}

export async function selectPagedItem<T>(
  title: string,
  items: readonly T[],
  view: PagedItemView<T>,
  countLabel: string,
  emptyMessage: string,
): Promise<T | undefined> {
  if (items.length === 0) {
    note(emptyMessage, title);
    return undefined;
  }
  const totalPages = lintPageCount(items.length);
  let page = 0;
  let showAll = false;
  for (;;) {
    const visible = showAll ? items : lintPageSlice(items, page);
    const options = visible.map((item, index) => ({
      value: `item:${showAll ? index : page * PAGE_SIZE + index}`,
      label: view.label(item),
      hint: view.hint(item),
    }));
    if (!showAll) {
      if (page > 0) {
        options.push({
          value: "previous",
          label: "Previous page",
          hint: `Page ${page}/${totalPages}`,
        });
      }
      if (page < totalPages - 1) {
        options.push({
          value: "next",
          label: "Next page",
          hint: `${Math.max(0, items.length - (page + 1) * PAGE_SIZE)} more`,
        });
        options.push({
          value: "show-all",
          label: "Show All",
          hint: `${items.length} ${countLabel}`,
        });
      }
    } else {
      options.push({
        value: "back-to-pages",
        label: "Back to pages",
        hint: "Return to paged view",
      });
    }
    options.push({ value: "back", label: "Back", hint: "Return to previous menu" });
    const choice = await select({
      message: `${title} · ${items.length} ${countLabel} · ${
        showAll ? "all" : `page ${page + 1}/${totalPages}`
      }`,
      options,
    });
    if (isCancel(choice) || choice === "back") return undefined;
    if (choice === "previous") {
      page -= 1;
      continue;
    }
    if (choice === "next") {
      page += 1;
      continue;
    }
    if (choice === "show-all") {
      showAll = true;
      page = 0;
      continue;
    }
    if (choice === "back-to-pages") {
      showAll = false;
      continue;
    }
    const index = Number(String(choice).slice("item:".length));
    return items[index];
  }
}
