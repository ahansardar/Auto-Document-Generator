const variableToken = /{{\s*([a-z][a-z0-9_]*)\s*}}/g;
export const variableNamePattern = /^[a-z][a-z0-9_]*$/;

export function extractVariablesFromText(content: string) {
  return Array.from(new Set(Array.from(content.matchAll(variableToken), (match) => match[1]))).sort();
}

export function extractVariablesFromElements(elements: { content: string }[]) {
  return Array.from(new Set(elements.flatMap((element) => extractVariablesFromText(element.content)))).sort();
}

export function replaceVariables(content: string, data: Record<string, string>) {
  return content.replace(variableToken, (_, name: string) => data[name] || name);
}

export function firstVariableName(content: string) {
  return content.match(variableToken)?.[0]?.replace(/[{}\s]/g, "") ?? "";
}

export function normalizeVariableName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[^a-z]+/, "") || "field";
}
