"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Menu } from "@/components/ui/menu";
import { setTheme, useThemeChoice } from "@/lib/theme";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match system", icon: Monitor },
];

/** Sun / moon button in the top bar; opens Light, Dark and Match system. */
export function ThemeSwitch() {
  const choice = useThemeChoice();
  const current = OPTIONS.find((option) => option.value === choice) ?? OPTIONS[2];
  const Icon = current.icon;

  return (
    <Menu
      label={`Theme: ${current.label}`}
      buttonClassName="flex size-8 items-center justify-center rounded-lg text-white/85 transition hover:bg-white/10 hover:text-white"
      buttonContent={<Icon className="size-[18px]" aria-hidden="true" />}
      items={OPTIONS.map((option) => {
        const OptionIcon = option.icon;
        return {
          label: option.label,
          icon: <OptionIcon aria-hidden="true" />,
          checked: option.value === choice,
          onSelect: () => setTheme(option.value),
        };
      })}
    />
  );
}
