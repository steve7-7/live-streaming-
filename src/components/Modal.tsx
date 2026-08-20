import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icons";

export default function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/60 backdrop-blur-sm animate-[fade_.2s_ease]"
      />
      <div
        className={`relative w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-[slideUp_.25s_ease] max-h-[90vh] overflow-hidden flex flex-col`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Icon.Close className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
