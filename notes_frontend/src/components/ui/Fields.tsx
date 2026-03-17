import React from "react";

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  const { className, ...rest } = props;
  return (
    <label
      {...rest}
      className={["text-sm font-medium text-slate-700", className ?? ""].join(
        " ",
      )}
    />
  );
}

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { error?: string }
>(function TextInput(props, ref) {
  const { className, error, ...rest } = props;
  return (
    <div className="w-full">
      <input
        {...rest}
        ref={ref}
        className={[
          "w-full h-10 rounded-lg border bg-white px-3 text-sm text-slate-900",
          "placeholder:text-slate-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ring-offset-white",
          error ? "border-red-300" : "border-slate-200",
          className ?? "",
        ].join(" ")}
      />
      {error ? (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});

TextInput.displayName = "TextInput";

export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }
>(function TextArea(props, ref) {
  const { className, error, ...rest } = props;
  return (
    <div className="w-full">
      <textarea
        {...rest}
        ref={ref}
        className={[
          "w-full min-h-32 rounded-lg border bg-white px-3 py-2 text-sm text-slate-900",
          "placeholder:text-slate-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ring-offset-white",
          error ? "border-red-300" : "border-slate-200",
          className ?? "",
        ].join(" ")}
      />
      {error ? (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});

TextArea.displayName = "TextArea";

export function Chip(props: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const { label, selected, onClick, ariaLabel } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-white",
        selected
          ? "bg-cyan-50 border-cyan-200 text-cyan-700 focus-visible:ring-cyan-500"
          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
