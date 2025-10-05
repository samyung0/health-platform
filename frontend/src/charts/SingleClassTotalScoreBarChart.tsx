import { useRef, useEffect, useState, useMemo } from "react";
import { useThemeProvider } from "../utils/ThemeContext";

import { chartColors } from "./ChartjsConfig";
import {
  Chart,
  RadialLinearScale,
  Tooltip,
  Legend,
  RadarController,
  LineElement,
  TimeScale,
  PointElement,
  type ChartData,
  type Tick,
} from "chart.js";
import "chartjs-adapter-moment";

// Import utilities
import { adjustColorOpacity, getChartColor } from "../utils/Utils";
import React from "react";
import annotationPlugin from "chartjs-plugin-annotation";
// import NormToGradingScale from "~/charts/customAxis/NormToGradingScale";

Chart.register(
  RadarController,
  LineElement,
  PointElement,
  RadialLinearScale,
  TimeScale,
  Tooltip,
  Legend
);
// Chart.register(NormToGradingScale);
Chart.register(annotationPlugin);

// TODO: find passing score

const dataAxis = ["总计", "男生", "女生"];

// TODO: sort by high/min score
// TODO: add custom axis?
// TODO: add score/result/grade to tooltip

const dataSet = [
  {
    label: "2025年上学期",
    date: new Date(2025, 2, 15),
    data: [90, 87, 92],
  },
  {
    label: "2024年下学期",
    date: new Date(2024, 8, 15),
    data: [83, 79, 86],
  },
  // {
  //   label: "2024年上学期",
  //   date: new Date(2024, 2, 15),
  //   data: [16, 22, 3],
  // },
];

function SingleClassTotalScoreBarChart({ height }: { height?: number }) {
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

  const [colors, hoverColors] = useMemo(() => getChartColor(dataSet.length), [dataSet.length]);

  const chartScales = useMemo(
    () =>
      ({
        y: {
          border: {
            display: false,
          },
          suggestedMin: 0,
          suggestedMax: 100,
          beginAtZero: true,
          ticks: {
            maxTicksLimit: 6,
            color: darkMode ? textColor.dark : textColor.light,
            backdropColor: darkMode ? backdropColor.dark : backdropColor.light,
            callback: function (tickValue: string | number, index: number, ticks: Tick[]) {
              return tickValue + "分";
            },
          },
          grid: {
            // display: false,
            color: darkMode ? gridColor.dark : gridColor.light,
          },
        },
        // y1: {
        //   type: "normToGradingScale",
        //   display: true,
        //   position: "right",

        //   // grid line settings
        //   grid: {
        //     drawOnChartArea: false, // only want the grid lines for one axis to show up
        //   },
        // },
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

  const chartPlugins = useMemo(
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
        //       scaleID: "x",
        //       value: 15,
        //       borderWidth: 2,
        //       beforeDraw: drawPassingLineVertical,
        //       borderColor: darkMode ? passingLineColor.dark : passingLineColor.light,
        //     },
        //   },
        // },
      } as const),
    [darkMode]
  );

  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels: dataAxis,
      datasets: dataSet
        // largest to smallest timescale
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map((item, index) => ({
          label: item.label,
          data: item.data,
          backgroundColor: adjustColorOpacity(colors[index], 0.85),
          hoverBackgroundColor: adjustColorOpacity(hoverColors[index], 1),
          pointRadius: 1,
          order: index,
          barPercentage: 0.8,
          categoryPercentage: dataAxis.length < 6 ? 0.4 : 0.7,
          borderRadius: 4,
        })),
    }),
    [dataSet]
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
            top: 26,
            bottom: 8,
            left: 16,
            right: 16,
          },
        },
        scales: chartScales,
        plugins: chartPlugins,
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

    chart.options.scales = chartScales;
    chart.options.plugins = chartPlugins;
    chart.update("none");
  }, [chartScales, chartPlugins]);

  useEffect(() => {
    if (!chart) return;
    chart.data = data;
    chart.update("none");
  }, [data]);

  const parentHeight = Math.max(dataAxis.length * dataSet.length * 25, 200) + 30;

  return (
    <React.Fragment>
      {/* height of chart adjusted base on amount of students and years  */}
      <div className="" style={{ height: parentHeight }}>
        <canvas ref={canvas} height={height}></canvas>
      </div>
      <div className="px-5 pt-2 pb-6">
        <div className="grow mb-1">
          <ul ref={legend} className="flex flex-wrap gap-x-4"></ul>
        </div>
      </div>
    </React.Fragment>
  );
}

export default SingleClassTotalScoreBarChart;
