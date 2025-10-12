import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useThemeProvider } from "../utils/ThemeContext";

import {
  ArcElement,
  Chart,
  DoughnutController,
  TimeScale,
  Tooltip,
  type ChartData,
  type ChartMeta,
  type PluginOptionsByType,
  type TooltipItem,
} from "chart.js";
import "chartjs-adapter-moment";
import { chartColors } from "./ChartjsConfig";

// Import utilities
import { adjustColorOpacity, getChartColor, getCssVariable } from "../utils/Utils";

Chart.register(DoughnutController, ArcElement, TimeScale, Tooltip);

// TODO: add data, first one is PARTICIPATED, second one is NOT PARTICIPATED
const dataSet = [
  {
    label: "2025年上学期",
    date: new Date(2025, 2, 15),
    data: [50, 12],
  },
  {
    label: "2024年下学期",
    date: new Date(2024, 8, 15),
    data: [45, 18],
  },
  // {
  //   label: "2024年上学期",
  //   date: new Date(2024, 2, 15),
  //   data: [16, 2],
  // },
];

// this is not dynamic, 及格 = 优秀 + 良好 + 及格
const labels = ["及格", "不及格"];

function MultipleStudentsTotalGradeChart({
  height,
  dataSet,
}: {
  height?: number;
  dataSet: { label: string; date: Date | string; data: [number, number] }[];
}) {
  const [chart, setChart] = useState<Chart | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { currentTheme } = useThemeProvider();
  const darkMode = currentTheme === "dark";
  const { tooltipTitleColor, tooltipBodyColor, tooltipBgColor, tooltipBorderColor } = chartColors;
  const [colors, hoverColors] = useMemo(() => getChartColor(dataSet.length), [dataSet.length]);

  const data = useMemo<ChartData<"doughnut">>(
    () => ({
      labels: labels,
      datasets: dataSet
        // largest to smallest timescale
        .sort(
          (a, b) =>
            (b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime()) -
            (a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime())
        )
        .map((item, index) => ({
          label: item.label,
          data: item.data,
          backgroundColor: [
            adjustColorOpacity(colors[index], 0.85),
            adjustColorOpacity(colors[index], 0.2),
          ],
          hoverBackgroundColor: [
            adjustColorOpacity(hoverColors[index], 1),
            adjustColorOpacity(hoverColors[index], 0.35),
          ],
          // borderColor: darkMode
          //   ? [getCssVariable("--color-white"), getCssVariable("--color-white")]
          //   : [getCssVariable("--color-gray-900"), getCssVariable("--color-gray-900")],
          // hoverBorderColor: darkMode
          //   ? [getCssVariable("--color-white"), getCssVariable("--color-white")]
          //   : [getCssVariable("--color-gray-900"), getCssVariable("--color-gray-900")],
          order: index,
          borderWidth: 4,
          borderRadius: 4,
          cutout: dataSet.length === 1 ? "80%" : dataSet.length === 2 ? "65%" : "50%",
        })),
    }),
    [dataSet]
  );

  const doughnutOptions = useMemo(
    () => ({
      borderColor: darkMode ? getCssVariable("--color-gray-900") : getCssVariable("--color-white"),
      hoverBorderColor: darkMode
        ? getCssVariable("--color-gray-900")
        : getCssVariable("--color-white"),
    }),
    [darkMode]
  );

  const plugins = useMemo(
    () =>
      ({
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<"doughnut">) => {
              return `${context.dataset.label}: ${context.parsed} (${Math.round(
                (context.parsed / context.dataset.data.reduce((acc, curr) => acc + curr, 0)) * 100
              )}%)`;
            },
          },
          titleColor: darkMode ? tooltipTitleColor.dark : tooltipTitleColor.light,
          bodyColor: darkMode ? tooltipBodyColor.dark : tooltipBodyColor.light,
          backgroundColor: darkMode ? tooltipBgColor.dark : tooltipBgColor.light,
          borderColor: darkMode ? tooltipBorderColor.dark : tooltipBorderColor.light,
        },
      } as const),
    [darkMode]
  );

  const getVisibleDataItem = useCallback(function (chart: Chart, metadata: ChartMeta) {
    const data = metadata.data;
    for (let i = 0; i < data.length; i++) {
      if (chart.getDataVisibility(i)) {
        return i;
      }
    }
    return -1;
  }, []);

  useEffect(() => {
    const ctx = canvas.current;
    if (!ctx) return;
    let selectedDatasetIndex = 0;
    let selectedIndex = 0;
    // eslint-disable-next-line no-unused-vars
    const newChart = new Chart(ctx, {
      type: "doughnut",
      data: data,
      options: {
        datasets: {
          doughnut: doughnutOptions,
        },
        layout: {
          padding: {
            top: 8,
            bottom: 8,
            left: 16,
            right: 16,
          },
        },
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
        onHover: (e, elements, chart) => {
          if (elements.length > 0) {
            const { index, datasetIndex } = elements[0];
            selectedDatasetIndex = datasetIndex;
            selectedIndex = index;
            chart.draw();
          }
        },
      },
      plugins: [
        {
          id: "showPercentage",
          afterDraw: function (chart) {
            if (selectedDatasetIndex >= 0) {
              const ctx = chart.ctx;
              const { width, height, top, left } = chart.chartArea;
              const centerX = width / 2 + left;
              const centerY = height / 2 + top;
              ctx.save();
              ctx.font = "bold 16px Inter";
              // const metrics = ctx.measureText("100.0%");
              // ctx.c(centerX - metrics.width / 2, centerY - 30, metrics.width, 60);
              const metadata = chart.getDatasetMeta(selectedDatasetIndex);
              if (!chart.getDataVisibility(selectedIndex)) {
                const index = getVisibleDataItem(chart, metadata);
                if (isNaN(index)) {
                  return ctx.restore();
                }
                selectedIndex = index;
              }
              const metadataItem = metadata.data[selectedIndex];
              const d = chart.config.data.datasets[selectedDatasetIndex].data as number[];
              const sum = d.reduce((acc, curr) => acc + curr, 0);
              const value = d[selectedIndex] ?? 0;
              const percentage = (value / sum) * 100;
              const text = percentage.toFixed(1) + "%";
              ctx.fillStyle = adjustColorOpacity(colors[selectedDatasetIndex], 0.85);
              // console.log(metadataItem.options.backgroundColor);
              ctx.textBaseline = "bottom";
              ctx.textAlign = "center";
              ctx.fillText(text, centerX, centerY);
              ctx.textBaseline = "top";
              ctx.fillText(
                ((chart.config.data.labels as string[])[selectedIndex] ?? "") + "率",
                centerX,
                centerY
              );
              ctx.restore();
            }
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
    chart.options.plugins = plugins;
    chart.options.datasets = {
      doughnut: doughnutOptions,
    };
    chart.update("none");
  }, [plugins, doughnutOptions]);

  useEffect(() => {
    if (!chart) return;
    chart.data = data;
    chart.update("none");
  }, [data]);

  const calcHeight = useMemo(() => {
    return Math.max(dataSet.length * 80, 200);
  }, [dataSet]);

  return (
    <div className="grow flex flex-col justify-center">
      <div>
        <canvas ref={canvas} height={calcHeight}></canvas>
      </div>
      <div className="px-5 pt-2 pb-6">
        <div className="flex flex-wrap gap-y-2 gap-6">
          {dataSet.map((item, index) => (
            <div key={item.label} className="flex flex-col items-left">
              <div className="text-xs text-gray-500 font-bold dark:text-gray-400 flex items-center">
                <div
                  className="w-2 h-2 rounded-sm mr-4 pointer-events-none"
                  style={{
                    backgroundColor: colors[index],
                  }}
                ></div>
                <div className="pr-2">{item.label}</div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span className="pr-2">
                  及格：{item.data[0]} (
                  {Math.round(
                    (item.data[0] / item.data.reduce((acc, curr) => acc + curr, 0)) * 100
                  )}
                  %)
                </span>
                <span>
                  不及格：{item.data[1]} (
                  {Math.round(
                    (item.data[1] / item.data.reduce((acc, curr) => acc + curr, 0)) * 100
                  )}
                  %)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MultipleStudentsTotalGradeChart;
