export const TEST_CASE_PROMPT = (requirement: string) => `
You are a senior QA engineer. Given the following user story or requirement, generate comprehensive, professional test cases.

Requirement:
${requirement}

Return a JSON object with this exact structure:
{
  "testCases": [
    {
      "id": "TC-DESC-001",
      "title": "Clear Action-Oriented Title",
      "testType": "Functional",
      "priority": "High",
      "preconditions": "Detailed preconditions for this test.",
      "steps": [
        "First step action.",
        "Second step action.",
        "Expected observation step."
      ],
      "testData": "Specific inputs needed (e.g. UserID: 123, SKU: ABC)",
      "expectedResult": "Clear description of the successful outcome.",
      "tags": ["smoke", "regression"]
    }
  ]
}

Rules:
- Generate between 4 and 6 test cases.
- include happy path, negative scenarios, and boundary checks.
- TC_ID should be descriptive based on the action (e.g., TC-LOGIN-001).
- Priority must be "Low", "Medium", or "High".
- Steps must be full sentences without "Step X:" prefixes.
- Tags should be lowercase and relevant.
- Return ONLY valid JSON.
`;

export const BUG_REPORT_PROMPT = (description: string) => `
You are a senior QA engineer. Convert the following unstructured bug description into a professional, structured bug report.

Bug Description:
${description}

Return a JSON object with this exact structure:
{
  "summary": "One-line summary of the bug",
  "environment": "OS, browser, device, version if mentioned — otherwise write 'Not specified'",
  "stepsToReproduce": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "expectedResult": "What should have happened",
  "actualResult": "What actually happened",
  "severity": "Critical",
  "additionalNotes": "Any other relevant observations or context"
}

Rules:
- Severity must be exactly "Low", "Medium", "High", or "Critical"
- If information is missing, make reasonable inferences or write "Not specified"
- Steps must be clear and reproducible
- Return ONLY valid JSON. No markdown, no explanation.
`;

export const REGRESSION_PROMPT = (prSummary: string, availableFlowScripts: string[] = []) => `
You are a QA lead reviewing a pull request. Analyze the following PR summary or list of changed files and identify regression risk areas.

PR / Changed Files:
${prSummary}

${availableFlowScripts.length > 0 ? `Available Automated Flow Scripts in library:
${availableFlowScripts.map(s => `- ${s}`).join("\\n")}
` : ""}

Return a JSON object with this exact structure:
{
  "impactedModules": ["Module A", "Module B", "Module C"],
  "riskAreas": ["Risk area 1 with brief explanation", "Risk area 2..."],
  "regressionFocusAreas": ["Focus area 1", "Focus area 2", "Focus area 3"],
  "recommendedTestTypes": ["API", "UI", "Integration"],
  "suggestedFlowScripts": ["Script Name 1", "Script Name 2"]
}

Rules:
- Provide 2-6 impacted modules
- Provide 2-5 risk areas with brief explanations
- Provide 3-6 regression focus areas
- recommendedTestTypes must be from: ["API", "UI", "Integration", "Unit", "E2E", "Performance", "Security"]
- ${availableFlowScripts.length > 0 ? "Under 'suggestedFlowScripts', suggest relevant scripts from the 'Available Automated Flow Scripts' list provided above. Only suggest if highly relevant." : "If you don't have a list of available scripts, leave 'suggestedFlowScripts' as an empty array."}
- Think like an experienced QA engineer prioritizing test effort
- Return ONLY valid JSON. No markdown, no explanation.
`;

export const AI_QA_ASSISTANT_PROMPT = (testCase: any, globalInstruction: string) => `
You are a Playwright automation expert. Your task is to convert a single manual test case into a standalone executable Playwright code block.

Context / Instructions:
${globalInstruction}

Test Case Details:
Title: ${testCase.title}
${testCase.steps?.length ? `Steps:\n${testCase.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}` : "No specific predefined steps. Follow the Instructions provided above to formulate the test."}

Return a JSON object with this exact structure:
{
  "code": "async (page) => { \\n  await page.goto('...'); \\n  // ... steps ... \\n }"
}

Rules:
- Generate ONLY the function body as a string.
- Assume 'page' and 'expect' are already initialized and passed to the function.
- Use 'await' for all Playwright actions.
- Use 'expect' for assertions (e.g., await expect(page).toHaveTitle(/.../)).
- If a Target URL is provided in the Context, start with 'await page.goto(URL)'.
- If Login Credentials (Email/Password) are provided in the Context, use them to login at the beginning.
- Use robust selectors (data-testid, text, ARIA roles, then IDs/classes).
- Handle common UI patterns (click, fill, wait, press Enter).
- Ensure the code is standalone and self-contained for this specific test case.
- Return ONLY valid JSON.
`;

export const AI_TESTING_AGENT_PROMPT = (instruction: string, url: string, domSnapshot: string, history: string) => `
You are an AI Software Testing Agent. Your goal is to navigate a web application and verify the user's instructions.
You are currently on: ${url}

User Instruction:
"${instruction}"

Recent Action History:
${history || "No actions taken yet."}

Current Interactive Elements (Simplified DOM):
${domSnapshot}

Based on the instruction, history, and the current DOM, what is the SINGLE next action you must take to progress the test?
If you have completed the instruction successfully, output action: "finish".
If you are stuck, cannot find the element after multiple tries, or the instruction is impossible, output action: "fail".

Return a JSON object with strictly this structure:
{
  "action": "click" | "fill" | "navigate" | "full_page_screenshot" | "finish" | "fail",
  "elementId": "The exact numeric ID of the element from data-playwright-id (if click or fill), leave empty otherwise",
  "value": "Text to type (if fill) or URL to navigate to (if navigate). Leave empty otherwise",
  "reasoning": "A short, 1-sentence explanation of why you are taking this action."
}

Rules:
- You must output ONLY valid JSON.
- For click or fill actions, you MUST provide the exact numeric ID from the [data-playwright-id="..."] attribute in the DOM snapshot. Do NOT type a CSS selector. Type ONLY the number.
- DO NOT hallucinate elements that are not in the DOM snapshot. Do not guess hrefs.
`;
