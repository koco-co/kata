import { test } from "../../fixtures/step-screenshot";
import {
  ACTIVE_DATASOURCES,
  clearCurrentDatasource,
  type DatasourceConfig,
  SUITE_NAME,
  setCurrentDatasource,
} from "../data/test-data";

export function describeByDatasource(
  pageName: string,
  defineCases: (datasource: DatasourceConfig) => void,
): void {
  for (const datasource of ACTIVE_DATASOURCES) {
    test.describe(`${SUITE_NAME} - ${pageName} - ${datasource.reportName}`, () => {
      test.beforeAll(() => {
        setCurrentDatasource(datasource);
      });

      test.beforeEach(() => {
        setCurrentDatasource(datasource);
      });

      test.afterAll(() => {
        clearCurrentDatasource();
      });

      defineCases(datasource);
    });
  }
}
