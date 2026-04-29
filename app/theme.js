import React, {
  createContext,
  isValidElement,
  useContext,
  useMemo,
  useState,
} from "react";
import { StyleSheet } from "react-native";

export const palette = {
  primary: "#0A0F2C",
  secondary: "#7B61FF",
  accent: "#00D4FF",
  softWhite: "#F8FAFC",
  surface: "#FFFFFF",
  darkGray: "#64748B",
};

export const lightColors = {
  primary: palette.primary,
  secondary: palette.secondary,
  accent: palette.accent,
  background: palette.softWhite,
  surface: palette.surface,
  surfaceMuted: "#EEF2F7",
  border: "#D8DEE9",
  text: palette.primary,
  textMuted: palette.darkGray,
  textSoft: "#94A3B8",
  successText: "#036B82",
  accentSoft: "#E6FAFF",
  secondarySoft: "#F0ECFF",
  danger: "#FF5C7A",
  dangerSoft: "#FFF0F3",
};

export const darkColors = {
  primary: "#FFFFFF",
  secondary: "#9A86FF",
  accent: palette.accent,
  background: "#02040C",
  surface: "#0A0F2C",
  surfaceMuted: "#161B33",
  border: "#1E293B",
  text: "#FFFFFF",
  textMuted: "#94A3B8",
  textSoft: "#64748B",
  successText: "#4ADE80",
  accentSoft: "#0C2D48",
  secondarySoft: "#1E1B4B",
  danger: "#FF4D6A",
  dangerSoft: "#31111D",
};

export const fonts = {
  heading: "Roboto",
  body: "Roboto",
  fallback: "Roboto",
};

const ThemeContext = createContext({
  mode: "light",
  theme: lightColors,
  toggleMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState("light");
  const value = useMemo(
    () => ({
      mode,
      theme: mode === "dark" ? darkColors : lightColors,
      toggleMode: () =>
        setMode((current) => (current === "dark" ? "light" : "dark")),
    }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

const colorRoles = {
  "#F8FAFC": "background",
  "#FFFFFF": "surface",
  "#EEF2F7": "surfaceMuted",
  "#F1F5F9": "surfaceMuted",
  "#EEF2FF": "secondarySoft",
  "#EEF6FF": "accentSoft",
  "#F8FAFC": "background",
  "#D8DEE9": "border",
  "#F1F5F9": "border",
  "#0A0F2C": "text",
  "#64748B": "textMuted",
  "#94A3B8": "textSoft",
  "#7B61FF": "secondary",
  "#9A86FF": "secondary",
  "#4338CA": "secondary",
  "#C7D2FE": "secondarySoft",
  "#00D4FF": "accent",
  "#036B82": "successText",
  "#E6FAFF": "accentSoft",
  "#F0ECFF": "secondarySoft",
  "#F5F3FF": "secondarySoft",
  "#FF5C7A": "danger",
  "#FF6F8A": "danger",
  "#E11D48": "danger",
  "#FECACA": "danger",
  "#FFF0F3": "dangerSoft",
  "#FFF1F2": "dangerSoft",
  "#DCFCE7": "successText",
  "#F0FDF4": "accentSoft",
  "#DBEAFE": "accent",
  "#EFF6FF": "accentSoft",
  "#FEF3C7": "secondary",
  "#FFFBEB": "secondarySoft",
  "#475569": "textMuted",
  "#0F172A": "text",
  "#1F2937": "text",
  "#334155": "textMuted",
  "#4B5563": "textMuted",
  "#CBD5E1": "border",
  "#E2E8F0": "border",
};

const textProps = new Set(["color", "textDecorationColor"]);
const surfaceProps = new Set([
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderRightColor",
  "shadowColor",
]);

const isPlainObject = (value) => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const mapColor = (value, propName, theme, mode) => {
  if (typeof value !== "string") {
    return value;
  }

  if (value === "transparent") {
    return value;
  }

  const role = colorRoles[value.toUpperCase()];
  if (!role) {
    return value;
  }

  if (propName === "shadowColor") {
    return mode === "dark" ? "#000000" : theme.primary;
  }

  if (textProps.has(propName)) {
    if (role === "surface") return mode === "dark" ? theme.text : theme.surface;
    if (role === "primary") return theme.text;
    return theme[role] || value;
  }

  if (surfaceProps.has(propName)) {
    if (role === "text")
      return mode === "dark" ? theme.surface : theme.primary;
    if (role === "surface")
      return mode === "dark" ? theme.surfaceMuted : theme.surface;
    return theme[role] || value;
  }

  return theme[role] || value;
};

const transformObject = (style, theme, mode) => {
  if (!style || typeof style !== "object") {
    return style;
  }

  const next = {};
  Object.keys(style).forEach((key) => {
    const value = style[key];
    if (Array.isArray(value)) {
      next[key] = value.map((item) =>
        isPlainObject(item) ? transformObject(item, theme, mode) : item,
      );
    } else if (isPlainObject(value) && key !== "fontVariant") {
      next[key] = transformObject(value, theme, mode);
    } else {
      next[key] = mapColor(value, key, theme, mode);
    }
  });
  return next;
};

export const transformStyle = (style, theme, mode) => {
  if (!style) {
    return style;
  }

  if (Array.isArray(style)) {
    return style.map((item) => transformStyle(item, theme, mode));
  }

  return transformObject(StyleSheet.flatten(style), theme, mode);
};

export const transformChildren = (children, theme, mode) =>
  React.Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return child;
    }

    if (child.type?.skipThemeTransform) {
      return child;
    }

    const nextProps = {};
    if (child.props.style) {
      nextProps.style = transformStyle(child.props.style, theme, mode);
    }
    if (child.props.contentContainerStyle) {
      nextProps.contentContainerStyle = transformStyle(
        child.props.contentContainerStyle,
        theme,
        mode,
      );
    }
    if (child.props.children) {
      nextProps.children = transformChildren(child.props.children, theme, mode);
    }

    return React.cloneElement(child, nextProps);
  });
