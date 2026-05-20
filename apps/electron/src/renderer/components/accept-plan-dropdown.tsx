
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Send, ShieldCheck } from 'lucide-react';

interface AcceptPlanDropdownProps {
  onApprove: (mode: 'auto' | 'manual') => void;
}

export function AcceptPlanDropdown({ onApprove }: AcceptPlanDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20 transition-colors"
      >
        <Send className="h-3 w-3" />
        批准执行
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-56 rounded-md border border-border bg-bg shadow-elevation-2 z-[60] overflow-hidden">
          <button
            onClick={() => {
              onApprove('auto');
              setOpen(false);
            }}
            className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-bg-warm transition-colors"
          >
            <Send className="h-3.5 w-3.5 shrink-0 mt-0.5 text-success" />
            <div>
              <p className="text-xs font-medium text-text">批准执行</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">自动执行所有工具调用</p>
            </div>
          </button>
          <button
            onClick={() => {
              onApprove('manual');
              setOpen(false);
            }}
            className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-bg-warm transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-success" />
            <div>
              <p className="text-xs font-medium text-text">批准，手动审批</p>
              <p className="text-[10px] text-text-tertiary mt-0.5">逐步确认每个工具调用</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
