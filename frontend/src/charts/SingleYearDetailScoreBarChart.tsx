import { useRef, useEffect, useState, useMemo } from "react";
import { useThemeProvider } from "../utils/ThemeContext";

import { chartColors } from "./ChartjsConfig";
import {
  Chart,
  RadialLinearScale,
  Tooltip,
  Legend,
  RadarController,
  TimeScale,
  PointElement,
  type ChartData,
  BarElement,
  Title,
} from "chart.js";
import "chartjs-adapter-moment";

// Import utilities
import { adjustColorOpacity, getChartColor } from "../utils/Utils";
import React from "react";
import annotationPlugin from "chartjs-plugin-annotation";
import { drawPassingLineHorizontal } from "~/lib/utils";

import ChartDataLabels, { type Context } from "chartjs-plugin-datalabels";

Chart.register(
  RadarController,
  BarElement,
  Title,
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
    data: [22, 16, 17, 18],
  },
  {
    label: "2024年下学期",
    date: new Date(2024, 8, 15),
    data: [22, 16, 17, 18],
  },
  {
    label: "2024年上学期",
    date: new Date(2024, 2, 15),
    data: [22, 16, 17, 18],
  },
];
const classes = ["1A", "1B", "1C", "1D"];
// const passingScore = 15;

function SingleYearDetailScoreBarChart({
  height,
  dataFetched,
  classes,
}: {
  height?: number;
  dataFetched: { label: string; date: Date; data: number[] }[];
  classes: string[];
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
      labels: classes,
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
        title: {
          display: true,
          text: "班级平均分",
          font: {
            size: 14,
          },
          color: darkMode ? textColor.dark : textColor.light,
          padding: {
            bottom: 26,
          },
        },
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
        //       value: passingScore,
        //       borderWidth: 2,
        //       beforeDraw: drawPassingLineHorizontal,
        //       borderColor: darkMode ? passingLineColor.dark : passingLineColor.light,
        //     },
        //   },
        // },
        datalabels: {
          font: {
            size: 10,
          },
          color: function (context: Context) {
            // const c = context.dataset.backgroundColor as string;
            // if (!c || !c.startsWith("rgba(")) return "black";
            // const s = c.replace("rgba(", "").replace(")", "").split(",");
            // const r = parseInt(s[0]);
            // const g = parseInt(s[1]);
            // const b = parseInt(s[2]);
            // const a = parseFloat(s[3]);
            // const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            // if (brightness > 128) return "black";
            // return "white";
            return darkMode ? "white" : "black";
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
            top: 20,
            bottom: 12,
            left: 12,
            right: 56,
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
      <div className="grow">
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

export default SingleYearDetailScoreBarChart;
