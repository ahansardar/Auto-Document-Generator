"use client";

import { useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { TemplateVariable, VariableType } from "@/lib/types";
import { generateFromPattern } from "@/lib/patterns";
import { extractVariablesFromElements, variableNamePattern } from "@/lib/variables";

type Props = {
  variables: TemplateVariable[];
  elementContents: { content: string }[];
  onChange: (variables: TemplateVariable[]) => void;
  onRename: (oldName: string, newName: string) => void;
};

const variableTypes: VariableType[] = ["text", "number", "date", "email", "phone", "multiline", "currency"];
const quickPatterns = [
  { label: "TIES-0000", value: "TIES-{####}" },
  { label: "4 digits", value: "{####}" },
  { label: "6 uppercase", value: "{AAAAAA}" },
  { label: "8 alphanumeric", value: "{XXXXXXXX}" },
  { label: "Lowercase slug", value: "{aaaa}-{####}" },
  { label: "Special mix", value: "{??##**}" }
];

function blankVariable(name: string): TemplateVariable {
  return { name, label: name.replaceAll("_", " "), type: "text", required: true, default_value: "", sample_value: "", description: "", generator_enabled: false, generator_pattern: "" };
}

export function VariableManager({ variables, elementContents, onChange, onRename }: Props) {
  const renameOrigins = useRef<Record<number, string>>({});
  const usedNames = extractVariablesFromElements(elementContents);

  function update(index: number, patch: Partial<TemplateVariable>) {
    onChange(variables.map((variable, variableIndex) => (variableIndex === index ? { ...variable, ...patch } : variable)));
  }

  function addVariable() {
    const base = "student_name";
    const name = variables.some((variable) => variable.name === base) ? `variable_${variables.length + 1}` : base;
    onChange([...variables, blankVariable(name)]);
  }

  return (
    <section className="min-w-0 border-t border-line p-3 sm:p-4 lg:border-l">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Variables</h2>
        <button title="Add variable" className="rounded border border-line p-1.5" onClick={addVariable}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        {variables.map((variable, index) => {
          const used = usedNames.includes(variable.name);
          const valid = variableNamePattern.test(variable.name);
          return (
            <div key={variable.id ?? `variable-${index}`} className="min-w-0 rounded border border-line p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  className={`min-w-0 flex-1 rounded border px-2 py-1 text-sm ${valid ? "border-line" : "border-red-400"}`}
                  value={variable.name}
                  onFocus={() => {
                    renameOrigins.current[index] = variable.name;
                  }}
                  onChange={(event) => {
                    update(index, { name: event.target.value });
                  }}
                  onBlur={() => {
                    const oldName = renameOrigins.current[index];
                    delete renameOrigins.current[index];
                    if (oldName && oldName !== variable.name && variableNamePattern.test(variable.name)) {
                      onRename(oldName, variable.name);
                    }
                  }}
                />
                <button
                  title="Delete unused variable"
                  disabled={used}
                  className="rounded border border-line p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => onChange(variables.filter((_, variableIndex) => variableIndex !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-2">
                <input className="min-w-0 rounded border border-line px-2 py-1 text-sm" placeholder="Label" value={variable.label} onChange={(event) => update(index, { label: event.target.value })} />
                <select className="min-w-0 rounded border border-line px-2 py-1 text-sm" value={variable.type} onChange={(event) => update(index, { type: event.target.value as VariableType })}>
                  {variableTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <input className="min-w-0 rounded border border-line px-2 py-1 text-sm" placeholder="Default value" value={variable.default_value ?? ""} onChange={(event) => update(index, { default_value: event.target.value })} />
                <input className="min-w-0 rounded border border-line px-2 py-1 text-sm" placeholder="Sample value" value={variable.sample_value ?? ""} onChange={(event) => update(index, { sample_value: event.target.value })} />
                <textarea className="min-w-0 rounded border border-line px-2 py-1 text-sm" placeholder="Help text" value={variable.description ?? ""} onChange={(event) => update(index, { description: event.target.value })} />
                <div className="min-w-0 rounded border border-line bg-canvas p-3">
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      className="mt-1"
                      type="checkbox"
                      checked={variable.generator_enabled}
                      onChange={(event) => update(index, { generator_enabled: event.target.checked, generator_pattern: variable.generator_pattern || "{####}" })}
                    />
                    <span>
                      <span className="font-medium">Generate when empty</span>
                      <span className="block text-xs text-zinc-500">Perfect for certificate IDs and other unique fields.</span>
                    </span>
                  </label>
                  {variable.generator_enabled ? (
                    <div className="mt-3 grid gap-2">
                      <input
                        className="min-w-0 rounded border border-line bg-white px-2 py-1 text-sm"
                        placeholder="TIES-{####}"
                        value={variable.generator_pattern ?? ""}
                        onChange={(event) => update(index, { generator_pattern: event.target.value })}
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {quickPatterns.map((pattern) => (
                          <button key={pattern.value} className="shrink-0 rounded border border-line bg-white px-2 py-1 text-xs" onClick={() => update(index, { generator_pattern: pattern.value })}>
                            {pattern.label}
                          </button>
                        ))}
                      </div>
                      <div className="rounded bg-white px-2 py-1 text-xs text-zinc-600">
                        Example: <span className="font-medium text-ink">{generateFromPattern(variable.generator_pattern, true)}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-500">
                        Static text stays outside braces. Inside braces use <b>#</b> digits, <b>A</b> uppercase, <b>a</b> lowercase, <b>X</b> uppercase alphanumeric, <b>*</b> special.
                      </p>
                    </div>
                  ) : null}
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={variable.required} onChange={(event) => update(index, { required: event.target.checked })} /> Required</label>
                <span className="text-xs text-zinc-500">{used ? "Used in template" : "Unused"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
