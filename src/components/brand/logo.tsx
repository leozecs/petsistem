import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoTone = "dark" | "light";
type LogoVariant = "mark" | "lockup";

type PetsistemLogoProps = {
  tone?: LogoTone;
  className?: string;
  priority?: boolean;
};

function LogoMark({ tone, className }: { tone: LogoTone; className?: string }) {
  const paw = tone === "dark" ? "#0F172A" : "#FFFFFF";
  const pulse = tone === "dark" ? "#3B82F6" : "#60A5FA";
  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <g fill={paw}>
        <circle cx="10" cy="14" r="2.6" />
        <circle cx="16.5" cy="9.5" r="2.6" />
        <circle cx="23.5" cy="9.5" r="2.6" />
        <circle cx="30" cy="14" r="2.6" />
        <ellipse cx="20" cy="26" rx="9" ry="7" />
      </g>
      <path
        d="M14 26 L16 26 L17.5 22 L19 30 L21 23 L22.5 27 L26 26"
        stroke={pulse}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function PetsistemLogo({
  tone = "dark",
  className,
  priority = false,
}: PetsistemLogoProps) {
  const src = tone === "light" ? "/brand/petsistem-logo-light.png" : "/brand/petsistem-logo-dark.png";

  return (
    <Image
      src={src}
      alt="PETSISTEM"
      width={435}
      height={96}
      priority={priority}
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}

export function Logo({
  variant = "lockup",
  tone = "dark",
  size = "md",
  tagline,
  className,
}: {
  variant?: LogoVariant;
  tone?: LogoTone;
  size?: "sm" | "md" | "lg";
  tagline?: string;
  className?: string;
}) {
  const markBox = size === "sm" ? "size-8" : size === "lg" ? "size-14" : "size-10";
  const containerClasses = cn(
    "flex items-center gap-3",
    tone === "dark" ? "text-zinc-950" : "text-white",
    className,
  );
  const wordmarkSize = size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-base";

  const markBg = tone === "dark" ? "bg-white" : "bg-white/10 backdrop-blur";
  const markPadding = "rounded-xl";

  return (
    <div className={containerClasses}>
      <div className={cn("flex items-center justify-center", markBg, markPadding, markBox)}>
        <LogoMark tone="dark" className="size-[78%]" />
      </div>
      {variant === "lockup" ? (
        <div className="flex flex-col leading-tight">
          <span className={cn("font-semibold tracking-tight", wordmarkSize)}>PETSISTEM</span>
          {tagline ? (
            <span
              className={cn(
                "text-xs",
                tone === "dark" ? "text-zinc-500" : "text-zinc-400",
              )}
            >
              {tagline}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { LogoMark };
