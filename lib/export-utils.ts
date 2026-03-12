import { TestCase } from "@/types";

/**
 * Diagnostic logs added to debug export issues.
 */

export async function exportToCSV(
  testCases: any[],
  filename: string = "test-cases",
): Promise<void> {
  const data = Array.isArray(testCases) ? testCases : [];
  const headers = ["Title", "Preconditions", "Steps", "ExpectedResult"];
  const rows = data.map((tc) => [
    tc.title || "",
    tc.preconditions || "",
    Array.isArray(tc.steps) ? tc.steps.join("; ") : (tc.steps || ""),
    tc.expectedResult || "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const escaped = String(cell).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    )
    .join("\r\n");

  // Use a hidden iframe as the form target for absolute reliability
  const iframeId = `download_iframe_${Date.now()}`;
  const iframe = document.createElement("iframe");
  iframe.id = iframeId;
  iframe.name = iframeId;
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/export";
  form.target = iframeId;
  form.style.display = "none";

  const dataInput = document.createElement("input");
  dataInput.type = "hidden";
  dataInput.name = "data";
  dataInput.value = csvContent;
  form.appendChild(dataInput);

  const formatInput = document.createElement("input");
  formatInput.type = "hidden";
  formatInput.name = "format";
  formatInput.value = "csv";
  form.appendChild(formatInput);

  document.body.appendChild(form);
  form.submit();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(form);
    document.body.removeChild(iframe);
  }, 2000);
}

export async function exportToJSON(
  testCases: any[],
  filename: string = "test-cases"
): Promise<void> {
  const data = Array.isArray(testCases) ? testCases : [];
  const exportData = data.map(tc => ({
    title: tc.title || "",
    preconditions: tc.preconditions || "",
    steps: Array.isArray(tc.steps) ? tc.steps : (tc.steps ? [tc.steps] : []),
    expectedResult: tc.expectedResult || ""
  }));

  const iframeId = `download_iframe_json_${Date.now()}`;
  const iframe = document.createElement("iframe");
  iframe.id = iframeId;
  iframe.name = iframeId;
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/export";
  form.target = iframeId;
  form.style.display = "none";

  const dataInput = document.createElement("input");
  dataInput.type = "hidden";
  dataInput.name = "data";
  dataInput.value = JSON.stringify(exportData);
  form.appendChild(dataInput);

  const formatInput = document.createElement("input");
  formatInput.type = "hidden";
  formatInput.name = "format";
  formatInput.value = "json";
  form.appendChild(formatInput);

  document.body.appendChild(form);
  form.submit();

  setTimeout(() => {
    document.body.removeChild(form);
    document.body.removeChild(iframe);
  }, 2000);
}
