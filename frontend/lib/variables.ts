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
