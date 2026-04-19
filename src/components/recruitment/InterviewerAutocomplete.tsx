import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Employee {
  id: string;
  name_ar: string;
  position?: string | null;
}

interface Props {
  employees: Employee[];
  value: string[];
  onChange: (names: string[]) => void;
}

export function InterviewerAutocomplete({ employees, value, onChange }: Props) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = inputValue.trim()
    ? employees.filter(
        (e) =>
          e.name_ar?.includes(inputValue) &&
          !value.includes(e.name_ar)
      ).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addName = (name: string) => {
    onChange([...value, name]);
    setInputValue("");
    setShowDropdown(false);
  };

  const removeName = (name: string) => {
    onChange(value.filter((n) => n !== name));
  };

  return (
    <div ref={containerRef} className="relative">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {value.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 text-xs">
              {name}
              <X className="h-3 w-3 cursor-pointer" onClick={() => removeName(name)} />
            </Badge>
          ))}
        </div>
      )}
      <Input
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => inputValue.trim() && setShowDropdown(true)}
        placeholder="ابدأ بكتابة اسم الموظف..."
      />
      {/* Hidden input for form submission */}
      <input type="hidden" name="interviewers" value={value.join(",")} />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((emp) => (
            <button
              key={emp.id}
              type="button"
              className="w-full text-right px-3 py-2 text-sm hover:bg-accent/50 transition-colors flex items-center justify-between"
              onClick={() => addName(emp.name_ar)}
            >
              <span className="font-medium">{emp.name_ar}</span>
              {emp.position && (
                <span className="text-[10px] text-muted-foreground">{emp.position}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
