"use client";

import { InfoIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const CSS_VARIABLES = [
  "radius",
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "sidebar",
  "sidebar-foreground",
  "sidebar-primary",
  "sidebar-primary-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "sidebar-ring",
];

export function ThemeSwitcherMultiButton() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [themeVariables, setThemeVariables] = React.useState<{
    light: Record<string, string>;
    dark: Record<string, string>;
  }>({ light: {}, dark: {} });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    const extractVariablesFromStyleSheets = () => {
      const lightVariables: Record<string, string> = {};
      const darkVariables: Record<string, string> = {};

      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            if (rule instanceof CSSStyleRule) {
              if (rule.selectorText === ":root") {
                for (const varName of CSS_VARIABLES) {
                  const value = rule.style
                    .getPropertyValue(`--${varName}`)
                    .trim();
                  if (value) {
                    lightVariables[varName] = value;
                  }
                }
              } else if (rule.selectorText === ".dark") {
                for (const varName of CSS_VARIABLES) {
                  const value = rule.style
                    .getPropertyValue(`--${varName}`)
                    .trim();
                  if (value) {
                    darkVariables[varName] = value;
                  }
                }
              }
            }
          }
        } catch {}
      }

      return { light: lightVariables, dark: darkVariables };
    };

    setThemeVariables(extractVariablesFromStyleSheets());
  }, [mounted]);

  React.useEffect(() => {
    if (!mounted) return;

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const backgroundColor =
      resolvedTheme === "dark"
        ? themeVariables.dark.background
        : themeVariables.light.background;

    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", backgroundColor || "");
    } else {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = backgroundColor || "";
      document.head.appendChild(meta);
    }
  }, [resolvedTheme, mounted, themeVariables]);

  const themes = [
    { value: "system", icon: MonitorIcon, label: "Switch to system theme" },
    { value: "light", icon: SunIcon, label: "Switch to light theme" },
    { value: "dark", icon: MoonIcon, label: "Switch to dark theme" },
  ];

  if (!mounted) {
    return (
      <div className="relative isolate inline-flex h-8 items-center rounded-full border border-dotted px-1">
        <div className="flex space-x-0">
          <div className="size-6 rounded-full bg-input animate-pulse" />
          <div className="size-6 rounded-full bg-input animate-pulse" />
          <div className="size-6 rounded-full bg-input animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="hidden md:flex  gap-1 items-center">
            <span className="text-xs">Theme</span>
            <InfoIcon className="size-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[600px] max-h-[500px] overflow-auto">
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Theme Variables</h3>
            <div className="rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left font-medium">Variable</th>
                    <th className="p-2 text-left font-medium">Light</th>
                    <th className="p-2 text-left font-medium">Dark</th>
                  </tr>
                </thead>
                <tbody>
                  {CSS_VARIABLES.map((varName) => (
                    <tr key={varName} className="border-b last:border-0">
                      <td className="p-2 font-mono text-muted-foreground">
                        --{varName}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="size-4 rounded border"
                            style={{
                              backgroundColor: themeVariables.light[varName],
                            }}
                          />
                          <span className="font-mono text-[10px]">
                            {themeVariables.light[varName]}
                          </span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="size-4 rounded border"
                            style={{
                              backgroundColor: themeVariables.dark[varName],
                            }}
                          />
                          <span className="font-mono text-[10px]">
                            {themeVariables.dark[varName]}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <div className="relative isolate inline-flex h-8 items-center rounded-full border border-dotted px-1 cursor-pointer">
        {themes.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            aria-label={label}
            title={label}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTheme(value);
            }}
            className="group relative size-6 rounded-full transition duration-200 ease-out"
          >
            {theme === value && (
              <div className="-z-1 absolute inset-0 rounded-full bg-muted" />
            )}
            <Icon
              className={`relative m-auto size-3.5 transition duration-200 ease-out ${
                theme === value
                  ? "text-foreground"
                  : "text-secondary-foreground group-hover:text-foreground group-focus-visible:text-foreground"
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
