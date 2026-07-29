export interface TestStep {
  step: string;
  expected: string;
}

export interface TestCase {
  case_id?: string;
  title: string;
  priority: string;
  preconditions?: string;
  steps: TestStep[];
  requirement_atom_ids?: string[];
  coverage_matrix_ids?: string[];
}

export interface SubGroup {
  name: string;
  test_cases: TestCase[];
}

export interface Page {
  name: string;
  sub_groups?: SubGroup[];
  test_cases?: TestCase[];
}

export interface Module {
  name: string;
  pages: Page[];
}

export interface Meta {
  project_name: string;
  requirement_name: string;
  version?: string;
  module_key?: string;
  requirement_id?: string | number;
  case_module_id?: string | number;
  requirement_ticket?: string;
  description?: string;
  tags?: string[];
  create_at?: string;
  status?: string;
}

export interface IntermediateJson {
  meta: Meta;
  modules: Module[];
}

export interface WorkflowStep {
  id: string;
  name?: string;
}

export interface WorkflowState {
  project: string;
  workflow: string;
  prdSlug: string;
}
