import type { Page } from "@playwright/test";

type ProjectListResponse = { data?: Array<{ id?: number | string }> };

export async function getAccessibleProjectIds(page: Page): Promise<number[]> {
  return page.evaluate(async () => {
    const response = await fetch("/dassets/v1/valid/project/getProjects", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
      },
    });
    const result = (await response.json()) as ProjectListResponse;
    return (result.data ?? [])
      .map((item: { id?: number | string }) => Number(item?.id))
      .filter((id: number) => Number.isFinite(id));
  });
}

/**
 * 获取数据质量项目列表并返回指定名称的项目 ID
 */
export async function getQualityProjectId(
  page: Page,
  projectName?: string,
): Promise<number | null> {
  if (!projectName) {
    throw new Error("quality project name is required; selecting the first project is unsafe");
  }

  const matches = await page.evaluate(async (name: string) => {
    const response = await fetch("/dassets/v1/valid/project/getProjects", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Accept-Language": "zh-CN",
      },
    });
    const json = (await response.json()) as {
      data?: Array<{
        id?: number | string;
        name?: string;
        projectName?: string;
      }>;
    };
    return (json.data ?? [])
      .filter((project) => (project.name ?? project.projectName ?? "") === name)
      .map((project) => Number(project.id))
      .filter((id) => Number.isFinite(id));
  }, projectName);
  if (matches.length === 0) return null;
  if (matches.length > 1) throw new Error(`quality project is ambiguous: ${projectName}`);
  return matches[0];
}
