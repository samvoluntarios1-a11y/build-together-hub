import {
  HardHat,
  Zap,
  Paintbrush,
  Hammer,
  BrickWall,
  Wrench,
  Sparkles,
  Truck,
  ChefHat,
  Leaf,
  Shovel,
  PaintRoller,
  Plug,
  Ruler,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "hard-hat": HardHat,
  zap: Zap,
  paintbrush: Paintbrush,
  hammer: Hammer,
  "brick-wall": BrickWall,
  wrench: Wrench,
  sparkles: Sparkles,
  truck: Truck,
  "chef-hat": ChefHat,
  leaf: Leaf,
  shovel: Shovel,
  "paint-roller": PaintRoller,
  plug: Plug,
  ruler: Ruler,
};

export const ICON_OPTIONS = Object.keys(CATEGORY_ICONS);

export function CategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[name] ?? HardHat;
  return <Icon className={className} />;
}
