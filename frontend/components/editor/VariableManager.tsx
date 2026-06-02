"use client";

import { Plus, Trash2 } from "lucide-react";
import type { TemplateVariable, VariableType } from "@/lib/types";
import { extractVariablesFromElements, variableNamePattern } from "@/lib/variables";

type Props = {
  variables: TemplateVariable[];
  elementContents: { content: string }[];
  onChange: (variables: TemplateVariable[]) => void;
  onRename: (oldName: string, newName: string) => void;
};

const variableTypes: VariableType[] = ["text", "number", "date", "email", "phone", "multiline", "currency"];

export function VariableManager({ variables, elementContents, onChange, onRename }: Props) {
  const usedNames = extractVariablesFromElements(elementContents);

  function update(index: number, patch: Partial<TemplateVariable>) {
    onChange(variables.map((variable, variableIndex) => (variableIndex === index ? { ...variable, ...patch } : variable)));
  }

  function addVariable() {
    const base = "student_name";
    const name = variables.some((variable) => variable.name === base) ? `variable_${variables.length + 1}` : base;
    onChange([...variables, { name, label: name.replaceAll("_", " "), type: "text", required: true, default_value: "", sample_value: "", description: "" }]);
  }

  return (
    <section className="border-t border-line p-4">
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
            <div key={`${variable.name}-${index}`} className="rounded border border-line p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  className={`min-w-0 flex-1 rounded border px-2 py-1 text-sm ${valid ? "border-line" : "border-red-400"}`}
                  value={variable.name}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    const oldName = variable.name;
                    update(index, { name: nextName });
                    if (variableNamePattern.test(nextName)) onRename(oldName, nextName);
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
                <input className="rounded border border-line px-2 py-1 text-sm" placeholder="Label" value={variable.label} onChange={(event) => update(index, { label: event.target.value })} />
                <select className="rounded border border-line px-2 py-1 text-sm" value={variable.type} onChange={(event) => update(index, { type: event.target.value as VariableType })}>
                  {variableTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <input className="rounded border border-line px-2 py-1 text-sm" placeholder="Default value" value={variable.default_value ?? ""} onChange={(event) => update(index, { default_value: event.target.value })} />
                <input className="rounded border border-line px-2 py-1 text-sm" placeholder="Sample value" value={variable.sample_value ?? ""} onChange={(event) => update(index, { sample_value: event.target.value })} />
                <textarea className="rounded border border-line px-2 py-1 text-sm" placeholder="Help text" value={variable.description ?? ""} onChange={(event) => update(index, { description: event.target.value })} />
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
