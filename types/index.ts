export interface TestCase {
  id: string;
  title: string;
  testType: string;
  priority: "Low" | "Medium" | "High";
  preconditions: string;
  steps: string[];
  testData: string;
  expectedResult: string;
  tags: string[];
}

export interface TestCaseDocument {
  _id?: string;
  userId: string;
  requirementInput: string;
  generatedTestCases: TestCase[];
  createdAt: Date;
}

export interface EnhancedBugReport {
  summary: string;
  environment: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  additionalNotes: string;
}

export interface BugReportDocument {
  _id?: string;
  userId: string;
  rawBugDescription: string;
  structuredBugReport: EnhancedBugReport;
  createdAt: Date;
}

export interface RegressionAnalysis {
  impactedModules: string[];
  riskAreas: string[];
  regressionFocusAreas: string[];
  recommendedTestTypes: string[];
  suggestedFlowScripts?: string[];
}

export interface RegressionReportDocument {
  _id?: string;
  userId: string;
  inputText: string;
  analysisOutput: RegressionAnalysis;
  createdAt: Date;
}

export interface DashboardStats {
  totalTestCases: number;
  totalBugReports: number;
  totalRegressionAnalyses: number;
  totalSmokeTests: number;
  totalRegressionScripts: number;
  timeSavedMinutes: number;
}

export interface SmokeTestReport {
  _id?: string;
  buildUrl: string;
  homepageStatus: "PASS" | "FAIL";
  loginStatus: "PASS" | "FAIL" | "N/A";
  consoleErrors: string[];
  networkErrors: string[];
  uiChecks: Record<string, "PASS" | "FAIL">;
  pageLoadTimeMs: number;
  redirectChecks: string[];
  criticalApiChecks: string[];
  testedPages: string[];
  createdAt: Date;
}

export interface RegressionScript {
  _id?: string;
  name: string;
  url: string;
  steps: {
    action: string;
    selector?: string;
    value?: string;
    timestamp: number;
  }[];
  generatedScript: string;
  createdAt: Date;
}

export interface TestExecutionResult {
  testCase: string;
  status: "pass" | "fail";
  errorMessage: string;
  screenshot?: string;
  durationMs: number;
}

export interface QAAssistantSession {
  _id?: string;
  userId: string;
  instruction: string;
  testCases: string[];
  results: TestExecutionResult[];
  createdAt: Date;
}

export interface FlowStep {
  step: number;
  action: "navigate" | "click" | "fill" | "select" | "press" | "wait";
  label?: string;
  url?: string;
  selector?: string;
  value?: string;
}

export interface TestFlow {
  _id?: string;
  name: string;
  targetUrl: string;
  steps: FlowStep[];
  description?: string;
  createdAt?: Date;
}

export interface FlowStepResult {
  step: number;
  label?: string;
  action?: string;
  status: "PASS" | "FAIL" | "SKIP";
  durationMs: number;
  error?: string;
}

export interface FlowRun {
  _id?: string;
  flowId: string;
  flowName: string;
  stepResults: FlowStepResult[];
  consoleLogs: string[];
  networkFailures: string[];
  overallStatus: "PASS" | "FAIL" | "PARTIAL";
  totalDurationMs: number;
  screenshot?: string;
  createdAt?: Date;
}
