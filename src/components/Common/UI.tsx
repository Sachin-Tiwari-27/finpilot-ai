import { ReactNode, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils";

// ─── Card ────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  glow?: "green" | "blue" | "red" | null;
}

export function Card({
  children,
  className,
  onClick,
  hover = false,
  glow,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "glass-card p-4 transition-all duration-200",
        hover && "hover-card cursor-pointer",
        glow === "green" && "glow-green",
        glow === "blue" && "glow-blue",
        glow === "red" && "glow-red",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── Button ──────────────────────────────────────────────────────
interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit";
  icon?: string;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  className,
  type = "button",
  icon,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-fp-primary text-fp-bg hover:bg-fp-primary/90 active:scale-95",
    secondary:
      "bg-fp-card border border-fp-border text-fp-text hover:bg-fp-muted active:scale-95",
    ghost: "text-fp-text-2 hover:bg-fp-card hover:text-fp-text active:scale-95",
    danger:
      "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:scale-95",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span>{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

// ─── Badge ───────────────────────────────────────────────────────
interface BadgeProps {
  children: ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        className,
      )}
      style={color ? { backgroundColor: `${color}20`, color } : undefined}
    >
      {children}
    </span>
  );
}

// ─── Modal ───────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  const widths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "relative w-full glass-card border border-fp-border/60 shadow-2xl overflow-hidden",
              widths[size],
            )}
          >
            {title && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-fp-border/40">
                <h3 className="text-base font-semibold text-fp-text">
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-fp-text-3 hover:text-fp-text hover:bg-fp-muted transition-all"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Input ───────────────────────────────────────────────────────
interface InputProps {
  label?: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  prefix?: string;
  suffix?: string;
  error?: string;
  required?: boolean;
  className?: string;
  min?: string | number;
  step?: string | number;
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  prefix,
  suffix,
  error,
  required,
  className,
  min,
  step,
}: InputProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label className="block text-xs font-medium text-fp-text-2">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-fp-text-3 text-sm pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          min={min}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-fp-card border border-fp-border rounded-xl px-3 py-2 text-sm text-fp-text placeholder:text-fp-text-3",
            "focus:outline-none focus:border-fp-primary/60 focus:ring-1 focus:ring-fp-primary/20 transition-all",
            error && "border-red-500/50",
            prefix && "pl-8",
            suffix && "pr-8",
          )}
        />
        {suffix && (
          <span className="absolute right-3 text-fp-text-3 text-sm pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Select ──────────────────────────────────────────────────────
interface SelectProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  className,
}: SelectProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label className="block text-xs font-medium text-fp-text-2">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-fp-card border border-fp-border rounded-xl px-3 py-2 text-sm text-fp-text focus:outline-none focus:border-fp-primary/60 transition-all appearance-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-fp-surface">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-4 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// ─── Data Source Tag (Trust Layer) ───────────────────────────────
interface DataSourceTagProps {
  source: string;
  updatedAt?: string;
  manual?: boolean;
}

export function DataSourceTag({
  source,
  updatedAt,
  manual,
}: DataSourceTagProps) {
  const [show, setShow] = useState(false);

  if (!source) return null;

  const isDelayed = source.includes("15min") || source.includes("delay");
  const isManual =
    manual || source.includes("manual") || source.includes("Manual");
  const isDemo = source.includes("demo") || source.includes("Demo");

  const color = isManual
    ? "#8B9DC3"
    : isDemo
      ? "#B04DFF"
      : isDelayed
        ? "#FFB84D"
        : "#10D9A0";
  const icon = isManual ? "✏️" : isDemo ? "🟣" : isDelayed ? "🔸" : "🟢";

  return (
    <div className="relative inline-flex">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-all"
        style={{ backgroundColor: `${color}15`, color }}
      >
        <span>{icon}</span>
        <span className="hidden sm:inline">
          {isManual
            ? "Manual"
            : isDemo
              ? "Demo"
              : isDelayed
                ? "15m delay"
                : "Live"}
        </span>
      </button>
      {show && (
        <div className="absolute bottom-full left-0 mb-1 z-50 bg-fp-card border border-fp-border rounded-lg px-3 py-2 text-xs text-fp-text-2 whitespace-nowrap shadow-xl">
          <div className="font-medium text-fp-text mb-0.5">Data Source</div>
          <div>{source}</div>
          {updatedAt && (
            <div className="text-fp-text-3 mt-0.5">
              Updated: {new Date(updatedAt).toLocaleTimeString()}
            </div>
          )}
          {isDelayed && (
            <div className="text-fp-warning mt-0.5">
              ⚠ Price delayed by 15 minutes
            </div>
          )}
          {isManual && (
            <div className="text-fp-text-3 mt-0.5">
              ℹ Manually entered price
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Change Chip ─────────────────────────────────────────────────
export function ChangeChip({
  value,
  suffix = "%",
}: {
  value: number;
  suffix?: string;
}) {
  const isPos = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium",
        isPos
          ? "bg-fp-primary/10 text-fp-primary"
          : "bg-red-500/10 text-red-400",
      )}
    >
      {isPos ? "↑" : "↓"} {Math.abs(value).toFixed(2)}
      {suffix}
    </span>
  );
}

// ─── Section Header ──────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: string;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  icon,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-lg">{icon}</span>}
        <div>
          <h2 className="text-base font-semibold text-fp-text">{title}</h2>
          {subtitle && (
            <p className="text-xs text-fp-text-3 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon = "📭",
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-sm font-medium text-fp-text-2 mb-1">{title}</div>
      {description && (
        <div className="text-xs text-fp-text-3 mb-4 max-w-xs">
          {description}
        </div>
      )}
      {action}
    </div>
  );
}
