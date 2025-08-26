import React from "react";
import { Input } from "./Input";
import { Label } from "./Label";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label, placeholder, disabled }) => {
  // Extract opacity
  let opacity = "1";
  if (value.startsWith("rgba(")) {
    const match = value.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)/);
    opacity = match ? match[1] : "1";
  } else if (value.startsWith("#") && value.length === 9) {
    const alphaHex = value.slice(7);
    opacity = (Number.parseInt(alphaHex, 16) / 255).toFixed(2);
  }

  // Get hex for color input
  let hex = "#ff0000";
  if (value.startsWith("#")) {
    hex = value.slice(0, 7);
  } else if (value.startsWith("rgb")) {
    hex =
      "#" +
      (value.match(/\d+/g)?.slice(0, 3).map((x) => Number.parseInt(x).toString(16).padStart(2, "0")).join("") || "ff0000");
  }

  // Handlers
  const handleHexChange = (newHex: string) => {
    let newOpacity = opacity;
    if (value.startsWith("rgba(")) {
      const match = value.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([0-9.]+)\s*\)/);
      newOpacity = match ? match[1] : "1";
    } else if (value.startsWith("#") && value.length === 9) {
      const alphaHex = value.slice(7);
      newOpacity = (Number.parseInt(alphaHex, 16) / 255).toFixed(2);
    }
    const r = Number.parseInt(newHex.slice(1, 3), 16);
    const g = Number.parseInt(newHex.slice(3, 5), 16);
    const b = Number.parseInt(newHex.slice(5, 7), 16);
    onChange(`rgba(${r},${g},${b},${newOpacity})`);
  };

  const handleOpacityChange = (newOpacity: string) => {
    if (value.startsWith("rgba(")) {
      const rgbMatch = value.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[0-9.]+\s*\)/);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch;
        onChange(`rgba(${r},${g},${b},${newOpacity})`);
        return;
      }
    } else if (value.startsWith("rgb(")) {
      const rgbMatch = value.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch;
        onChange(`rgba(${r},${g},${b},${newOpacity})`);
        return;
      }
    } else if (value.startsWith("#")) {
      const hexBase = value.slice(0, 7);
      const alphaHex = Math.round(Number.parseFloat(newOpacity) * 255)
        .toString(16)
        .padStart(2, "0");
      onChange(`${hexBase}${alphaHex}`);
      return;
    }
  };

  return (
    <div className="space-y-1">
      {label && <Label htmlFor="colorPickerInput">{label}</Label>}
      <div className="flex gap-2">
        <Input
          id="colorPickerInput"
          value={value}
          onChange={onChange}
          placeholder={placeholder || "HEX, RGB/RGBA, or var(--vscode-...)"}
          className="flex-1"
        />
        <input
          type="color"
          value={hex}
          onChange={(e) => handleHexChange(e.target.value)}
          className="w-12 h-10 rounded-sm border cursor-pointer"
          disabled={disabled || value.startsWith("var(")}
        />
      </div>
      {!value.startsWith("var(") && (
        <div className="flex items-center gap-2">
          <Label htmlFor="colorPickerOpacity" className="text-sm">
            Opacity:
          </Label>
          <input
            id="colorPickerOpacity"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            onChange={(e) => handleOpacityChange(e.target.value)}
            className="flex-1"
          />
          <span className="text-sm w-12">{opacity}</span>
        </div>
      )}
    </div>
  );
};
