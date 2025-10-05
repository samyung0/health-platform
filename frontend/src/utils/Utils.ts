import {
  CHART_BORDER_COLORS,
  CHART_BORDER_HOVER_COLORS,
  CHART_COLORS,
  CHART_HOVER_COLORS,
  CHART_MIN_OPACITY_FOR_TIME_SERIES,
  CHART_OPACITY_FOR_TIME_SERIES_PREFERRED_INTERVAL,
} from "~/lib/const";

export const formatValue = (value: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumSignificantDigits: 3,
    notation: "compact",
  }).format(value);

export const formatThousands = (value: number) =>
  Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 3,
    notation: "compact",
  }).format(value);

export const getCssVariable = (variable: string) => {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
};

const adjustHexOpacity = (hexColor: string, opacity: number) => {
  // Remove the '#' if it exists
  hexColor = hexColor.replace("#", "");

  // Convert hex to RGB
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);

  // Return RGBA string
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const adjustHSLOpacity = (hslColor: string, opacity: number) => {
  // Convert HSL to HSLA
  return hslColor.replace("hsl(", "hsla(").replace(")", `, ${opacity})`);
};

const adjustOKLCHOpacity = (oklchColor: string, opacity: number) => {
  // Add alpha value to OKLCH color
  return oklchColor.replace(/oklch\((.*?)\)/, (match, p1) => `oklch(${p1} / ${opacity})`);
};

export const adjustColorOpacity = (color: string, opacity: number) => {
  if (color.startsWith("#")) {
    return adjustHexOpacity(color, opacity);
  } else if (color.startsWith("hsl")) {
    return adjustHSLOpacity(color, opacity);
  } else if (color.startsWith("oklch")) {
    return adjustOKLCHOpacity(color, opacity);
  } else if (color.startsWith("rgba")) {
    const split = color.split(",");
    const opacityString = Number(split[3].slice(0, -1).trim());
    const newOpacity = opacityString * opacity;
    const newColor = split.slice(0, 3).join(",") + `, ${newOpacity})`;
    return newColor;
  } else {
    throw new Error("Unsupported color format");
  }
};

export const oklchToRGBA = (oklchColor: string) => {
  // Create a temporary div to use for color conversion
  const tempDiv = document.createElement("div");
  tempDiv.style.color = oklchColor;
  document.body.appendChild(tempDiv);

  // Get the computed style and convert to RGB
  const computedColor = window.getComputedStyle(tempDiv).color;
  document.body.removeChild(tempDiv);

  return computedColor;
};

export const getChartTimeSeriesOpacityStep = (count: number) => {
  // below min opacity. returns steps interval smallere than preferred
  if (count === 1) return [1];
  if (
    1 - CHART_OPACITY_FOR_TIME_SERIES_PREFERRED_INTERVAL * (count - 1) <
    CHART_MIN_OPACITY_FOR_TIME_SERIES
  ) {
    // round to 2 dp
    const interval = (1 - CHART_MIN_OPACITY_FOR_TIME_SERIES) / (count - 1);
    // from largest to smallest
    return Array.from({ length: count }, (_, i) => 1 - interval * i);
  }
  // above min, return normal preferred interval
  return Array.from(
    { length: count },
    (_, i) => 1 - CHART_OPACITY_FOR_TIME_SERIES_PREFERRED_INTERVAL * i
  );
};

export const shuffleArray = (array: any[]) => {
  return array.sort(() => Math.random() - 0.5);
};

export const getChartColor = (count: number) => {
  let colors = CHART_COLORS;
  let hoverColors = CHART_HOVER_COLORS;
  if (count > colors.length) {
    console.warn(`Count ${count} is greater than the number of colors in CHART_COLORS`);
    // can duplicate colors
    colors = Array.from({ length: Math.ceil(count / CHART_COLORS.length) }, () => colors).flat();
    hoverColors = Array.from(
      { length: Math.ceil(count / CHART_HOVER_COLORS.length) },
      () => hoverColors
    ).flat();
  }
  return [colors.slice(0, count), hoverColors.slice(0, count)];
};

export const getChartBorderColor = (count: number) => {
  let colors = CHART_BORDER_COLORS;
  let hoverColors = CHART_BORDER_HOVER_COLORS;
  if (count > colors.length) {
    console.warn(`Count ${count} is greater than the number of colors in CHART_BORDER_COLORS`);
    // can duplicate colors
    colors = Array.from(
      { length: Math.ceil(count / CHART_BORDER_COLORS.length) },
      () => colors
    ).flat();
    hoverColors = Array.from(
      { length: Math.ceil(count / CHART_BORDER_HOVER_COLORS.length) },
      () => hoverColors
    ).flat();
  }
  return [colors.slice(0, count), hoverColors.slice(0, count)];
};

// export function createPatternImage() {
//   var ctx = document.createElement("canvas").getContext("2d")!;
//   ctx.canvas.width = ctx.canvas.height = 4; // = size of pattern base
//   ctx.fillStyle = "red";
//   ctx.fillRect(0, 0, 2, 2);
//   return ctx.canvas; // canvas can be used as image source
// }
