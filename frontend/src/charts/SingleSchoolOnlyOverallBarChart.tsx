import { useEffect, useMemo, useRef, useState } from "react";
import { useThemeProvider } from "../utils/ThemeContext";

import {
  Chart,
  Legend,
  LineElement,
  PointElement,
  RadarController,
  RadialLinearScale,
  TimeScale,
  Tooltip,
  type ChartData,
  type Tick,
} from "chart.js";
import "chartjs-adapter-moment";
import { chartColors } from "./ChartjsConfig";

// Import utilities
import React from "react";
import { adjustColorOpacity, getChartColor } from "../utils/Utils";

import { type Context } from "chartjs-plugin-datalabels";
import annotationPlugin from "chartjs-plugin-annotation";

Chart.register(
  RadarController,
  LineElement,
  PointElement,
  RadialLinearScale,
  TimeScale,
  Tooltip,
  Legend
);

Chart.register(annotationPlugin);

// TODO: add score/result/grade to tooltip

const dataFetched = [
  {
    label: "2025年上学期",
    date: new Date(2025, 2, 15),
    data: [92, 16, 83, 80, 79, 19],
  },
  {
    label: "2024年下学期",
    date: new Date(2024, 8, 15),
    data: [62, 76, 73, 20, 69, 19],
  },
  {
    label: "2024年上学期",
    date: new Date(2024, 2, 15),
    data: [52, 66, 63, 60, 59, 59],
  },
];

const entity = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"];

function SingleStudentOnlyOverallBarChart({
  height,
  dataFetched,
  entity,
}: {
  height?: number;
  entity: string[];
  dataFetched: { label: string; date: Date; data: number[] }[];
}) {
  const [chart, setChart] = useState<Chart | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const legend = useRef<HTMLUListElement>(null);
  const { currentTheme } = useThemeProvider();
  const darkMode = currentTheme === "dark";
  const {
    gridColor,
    textColor,
    backdropColor,
    tooltipTitleColor,
    tooltipBodyColor,
    tooltipBgColor,
    tooltipBorderColor,
    passingLineColor,
  } = chartColors;

  const [colors, hoverColors] = useMemo(
    () => getChartColor(dataFetched.length),
    [dataFetched.length]
  );

  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels: entity,
      datasets: dataFetched
        // largest to smallest timescale
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map((item, index) => ({
          label: item.label,
          data: item.data,
          backgroundColor: adjustColorOpacity(colors[index], 0.85),
          hoverBackgroundColor: adjustColorOpacity(hoverColors[index], 1),
          pointRadius: 1,
          order: index,
          categoryPercentage: 0.7,
          borderRadius: 4,
          datalabels: {
            align: "end",
            anchor: "end",
          },
        })),
    }),
    [dataFetched]
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
          suggestedMax: 100,
        },
        x: {
          border: {
            display: false,
          },
          grid: {
            display: false,
          },
          ticks: {
            // maxRotation: 0,
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
        },
        // annotation: {
        //   clip: false,
        //   annotations: {
        //     annotation1: {
        //       type: "line",
        //       scaleID: "y",
        //       value: 50,
        //       borderWidth: 2,
        //       beforeDraw: drawPassingLineHorizontal,
        //       borderColor: darkMode ? passingLineColor.dark : passingLineColor.light,
        //     },
        //   },
        // },
        // datalabels: {
        //   font: {
        //     size: 10,
        //   },
        //   color: function (context: Context) {
        //     return darkMode ? "white" : "black";
        //   },
        //   formatter: function (value: string | number, context: Context) {
        //     return value + "%";
        //   },
        // },
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
            top: 36,
            bottom: 16,
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
              box.style.borderColor = item.fillStyle!.toString();
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
    <React.Fragment>
      <div className="grow max-h-[400px]">
        <canvas ref={canvas} height={height}></canvas>
      </div>
      <div className="px-5 pb-6">
        <div className="grow mb-1">
          <ul ref={legend} className="flex flex-wrap gap-x-4"></ul>
        </div>
      </div>
    </React.Fragment>
  );
}

export default SingleStudentOnlyOverallBarChart;
