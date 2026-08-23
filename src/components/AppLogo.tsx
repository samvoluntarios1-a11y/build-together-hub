import { HardHat } from "lucide-react";

interface AppLogoProps {
  className?: string;
  iconClassName?: string;
  showText?: boolean;
  textClassName?: string;
  variant?: "default" | "white" | "dark";
}

export function AppLogo({
  className = "flex items-center gap-3",
  iconClassName = "h-6 w-6",
  showText = true,
  textClassName = "text-lg font-extrabold tracking-tight",
  variant = "default",
}: AppLogoProps) {
  const iconContainerStyles = {
    default: "bg-accent text-accent-foreground",
    white: "bg-white text-primary",
    dark: "bg-primary text-primary-foreground",
  };

  return (
    <div className={className}>
      <span
        className={`flex items-center justify-center rounded-xl p-2 ${iconContainerStyles[variant]}`}
      >
        <HardHat className={iconClassName} />
      </span>
      {showText && <span className={textClassName}>Voluntarios LDC</span>}
    </div>
  );
}
