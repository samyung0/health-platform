import { useEffect, useMemo, useRef, useState } from "react";
import { useThemeProvider } from "../utils/ThemeContext";

import {
  Chart,
  BarController,
  BarElement,
  TimeScale,
  Tooltip,
  type ChartData,
  LinearScale,
  Legend,
  type Tick,
  type TooltipItem,
} from "chart.js";
import "chartjs-adapter-moment";
import { chartColors } from "./ChartjsConfig";

// Import utilities
import {
  GRADING_COLORS,
  GRADING_COLORS_DARK,
  GRADING_SCALE_BMI_KEYS,
  GRADING_SCALE_KEYS,
} from "~/lib/const";
import {
  adjustColorOpacity,
  getChartBorderColor,
  getChartColor,
  getCssVariable,
} from "../utils/Utils";
import ChartDataLabels, { type Context } from "chartjs-plugin-datalabels";

Chart.register(BarController, BarElement, LinearScale, TimeScale, Tooltip, Legend);

// TODO: add data, follow worst to best order, note its total count, % is calculated
// const dataFetched = [
//   {
//     label: "2025年上学期",
//     date: new Date(2025, 2, 15),
//     data: [2, 12, 8, 10],
//   },
//   {
//     label: "2024年下学期",
//     date: new Date(2024, 8, 15),
//     data: [12, 8, 10, 2],
//   },
// ];
// const totalStudents = 30; // not summing arrays as students might not be participating

// this is not dynamic
const gradingColors = GRADING_SCALE_KEYS.map((key) =>
  adjustColorOpacity(GRADING_COLORS[key], 0.65)
);
const gradingHoverColors = GRADING_SCALE_KEYS.map((key) =>
  adjustColorOpacity(GRADING_COLORS[key], 0.65)
);
const gradingColorsDark = GRADING_SCALE_KEYS.map((key) =>
  adjustColorOpacity(GRADING_COLORS_DARK[key], 0.65)
);
const gradingHoverColorsDark = GRADING_SCALE_KEYS.map((key) =>
  adjustColorOpacity(GRADING_COLORS_DARK[key], 0.65)
);
function SingleClassDetailGradeBarChart({
  height,
  dataFetched,
  type,
  totalStudents,
}: {
  height?: number;
  dataFetched: { label: string; date: Date; data: number[] }[];
  type: string;
  totalStudents: number;
}) {
  const [chart, setChart] = useState<Chart | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const legend = useRef<HTMLUListElement>(null);
  const { currentTheme } = useThemeProvider();
  const darkMode = currentTheme === "dark";
  const {
    tooltipTitleColor,
    tooltipBodyColor,
    tooltipBgColor,
    tooltipBorderColor,
    textColor,
    gridColor,
    backdropColor,
  } = chartColors;

  const [colors, hoverColors] = useMemo(
    () => getChartColor(dataFetched.length),
    [dataFetched.length]
  );
  const [borderColors, borderHoverColors] = useMemo(
    () => getChartBorderColor(dataFetched.length),
    [dataFetched.length]
  );
  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels:
        type === "体重指数（BMI）"
          ? (GRADING_SCALE_BMI_KEYS as unknown as string[])
          : (GRADING_SCALE_KEYS as unknown as string[]),
      datasets: dataFetched
        // largest to smallest timescale
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map((item, index) => ({
          label: item.label,
          data: item.data.map((data) => Math.round((data / totalStudents) * 100)),
          backgroundColor: darkMode ? gradingColorsDark : gradingColors,
          hoverBackgroundColor: darkMode ? gradingHoverColorsDark : gradingHoverColors,
          borderColor: adjustColorOpacity(borderColors[index], 1),
          hoverBorderColor: adjustColorOpacity(borderColors[index], 1.5),
          order: index,
          pointRadius: 1,
          borderRadius: 4,
          borderWidth: dataFetched.length === 1 ? 0 : darkMode ? 4 : 3,
          categoryPercentage: 0.8,
          barPercentage: 0.9,
          datalabels: {
            align: "end",
            anchor: "end",
          },
        })),
    }),
    [dataFetched, darkMode]
  );

  const scales = useMemo(
    () =>
      ({
        y: {
          border: {
            display: false,
          },
          beginAtZero: true,
          ticks: {
            maxTicksLimit: 6,
            color: darkMode ? textColor.dark : textColor.light,
            backdropColor: darkMode ? backdropColor.dark : backdropColor.light,
            callback: function (tickValue: string | number, index: number, ticks: Tick[]) {
              return tickValue + "%";
            },
          },
          grid: {
            color: darkMode ? gridColor.dark : gridColor.light,
          },
          suggestedMin: 0,
        },
        x: {
          border: {
            display: false,
          },
          grid: {
            display: false,
          },
          ticks: {
            maxRotation: 0,
            color: darkMode ? textColor.dark : textColor.light,
          },
        },
      } as const),
    [darkMode]
  );

  const plugins = useMemo(
    () =>
      ({
        legend: {
          display: false,
        },
        tooltip: {
          titleColor: darkMode ? tooltipTitleColor.dark : tooltipTitleColor.light,
          bodyColor: darkMode ? tooltipBodyColor.dark : tooltipBodyColor.light,
          backgroundColor: darkMode ? tooltipBgColor.dark : tooltipBgColor.light,
          borderColor: darkMode ? tooltipBorderColor.dark : tooltipBorderColor.light,
          callbacks: {
            label: function (context: TooltipItem<"bar">) {
              return (
                context.dataset.label +
                ": " +
                dataFetched[context.datasetIndex].data[context.dataIndex] +
                "人 (" +
                context.dataset.data[context.dataIndex] +
                "%)"
              );
            },
          },
        },
        datalabels: {
          font: {
            size: 10,
          },
          color: function (context: Context) {
            return darkMode ? "white" : "black";
          },
          formatter: function (value: string | number, context: Context) {
            return value + "%";
          },
        },
      } as const),
    [darkMode]
  );

  useEffect(() => {
    const ctx = canvas.current;
    if (!ctx) return;
    // eslint-disable-next-line no-unused-vars
    const newChart = new Chart(ctx, {
      type: "bar",
      data: data,
      options: {
        layout: {
          padding: {
            top: 50,
            bottom: 12,
            left: 20,
            right: 20,
          },
        },
        scales: scales,
        plugins: plugins,
        interaction: {
          intersect: true,
          mode: "nearest",
        },
        animation: {
          duration: 500,
        },
        maintainAspectRatio: false,
        resizeDelay: 200,
      },
      plugins: [
        ChartDataLabels,
        {
          id: "htmlLegend",
          afterUpdate(c, args, options) {
            const ul = legend.current;
            if (!ul) return;
            // Remove old legend items
            while (ul.firstChild) {
              ul.firstChild.remove();
            }
            // Reuse the built-in legendItems generator
            const items = c.options.plugins?.legend?.labels?.generateLabels?.(c);
            items?.forEach((item) => {
              const li = document.createElement("li");
              // Button element
              const button = document.createElement("button");
              button.style.display = "inline-flex";
              button.style.alignItems = "center";
              button.style.opacity = item.hidden ? ".3" : "";
              button.onclick = () => {
                c.setDatasetVisibility(item.datasetIndex!, !c.isDatasetVisible(item.datasetIndex!));
                c.update();
              };
              // Color box
              const box = document.createElement("span");
              box.style.display = "block";
              box.style.width = "10px";
              box.style.height = "10px";
              box.style.borderRadius = "calc(infinity * 1px)";
              box.style.marginRight = "8px";
              box.style.borderWidth = "3px";
              box.style.borderColor = colors[item.datasetIndex!];
              box.style.pointerEvents = "none";
              // Label
              const label = document.createElement("span");
              label.classList.add("text-xs", "text-gray-500", "font-medium", "dark:text-gray-400");
              label.style.fontSize = "12px";
              label.style.lineHeight = "calc(1.25 / 0.875)";
              const labelText = document.createTextNode(item.text);
              label.appendChild(labelText);
              li.appendChild(button);
              button.appendChild(box);
              button.appendChild(label);
              ul.appendChild(li);
            });
          },
        },
      ],
    });
    setChart(newChart);
    return () => newChart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!chart) return;

    chart.options.scales = scales;
    chart.options.plugins = plugins;
    chart.update("none");
  }, [scales, plugins]);

  useEffect(() => {
    if (!chart) return;
    chart.data = data;
    chart.update("none");
  }, [data]);

  return (
    <div className="grow flex flex-col justify-center">
      <div>
        <canvas ref={canvas} height={height}></canvas>
      </div>
      <div className="px-5 pb-6">
        {dataFetched.length === 1 && (
          <div className="flex items-center justify-center flex-wrap gap-y-1 gap-3">
            {GRADING_SCALE_KEYS.map((key) => (
              <div key={key} className="flex flex-col items-left">
                <div className="text-xs text-gray-500 font-bold dark:text-gray-400 flex items-center">
                  <div
                    className="w-2 h-2 rounded-sm mr-2 pointer-events-none"
                    style={{ backgroundColor: GRADING_COLORS[key] }}
                  ></div>
                  <div className="pr-2">
                    {key} {dataFetched[0].data[GRADING_SCALE_KEYS.indexOf(key)]}人
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {dataFetched.length > 1 && (
          <div className="grow mb-1">
            <ul ref={legend} className="flex flex-wrap gap-x-4"></ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default SingleClassDetailGradeBarChart;
