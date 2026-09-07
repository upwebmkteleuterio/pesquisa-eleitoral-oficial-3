import { cn } from "../../lib/utils";

interface SubmissionQuestionFieldProps {
  question: any;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

export function SubmissionQuestionField({ question, value, onChange, disabled }: SubmissionQuestionFieldProps) {
  if (question.type === "radio") {
    return (
      <div className="space-y-2">
        {(question.options || []).map((option: string) => (
          <label key={option} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 font-bold", value === option ? "border-primary bg-primary/5 text-primary" : "border-outline text-on-surface")}>
            <input type="radio" name={question.id} checked={value === option} onChange={() => onChange(option)} disabled={disabled} className="h-4 w-4 accent-primary" />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "checkbox") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-2">
        {(question.options || []).map((option: string) => (
          <label key={option} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 font-bold", selected.includes(option) ? "border-primary bg-primary/5 text-primary" : "border-outline text-on-surface")}>
            <input type="checkbox" checked={selected.includes(option)} onChange={() => onChange(selected.includes(option) ? selected.filter((item: string) => item !== option) : [...selected, option])} disabled={disabled} className="h-4 w-4 rounded accent-primary" />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "scale") {
    const min = Number.isFinite(question.min) ? question.min : 1;
    const max = Number.isFinite(question.max) ? question.max : 5;
    return (
      <div className="flex gap-2">
        {Array.from({ length: max - min + 1 }, (_, index) => min + index).map(option => (
          <button key={option} type="button" onClick={() => onChange(option)} disabled={disabled} className={cn("h-11 flex-1 rounded-xl border font-black", value === option ? "border-primary bg-primary text-white" : "border-outline text-on-surface-variant hover:border-primary")}>
            {option}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === "select") {
    return (
      <select value={value ?? ""} onChange={event => onChange(event.target.value)} disabled={disabled} className="w-full rounded-xl border border-outline bg-white px-3 py-3 font-bold text-on-surface outline-none focus:border-primary dark:bg-slate-800">
        <option value="">Selecione uma opção</option>
        {(question.options || []).map((option: string) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }

  return (
    <textarea value={value ?? ""} onChange={event => onChange(event.target.value)} disabled={disabled} rows={3} className="w-full resize-y rounded-xl border border-outline bg-white px-3 py-3 font-medium text-on-surface outline-none focus:border-primary dark:bg-slate-800" />
  );
}
