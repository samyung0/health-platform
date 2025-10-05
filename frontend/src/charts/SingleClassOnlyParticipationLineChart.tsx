import { useEffect, useMemo, useRef, useState } from "react";
import { useThemeProvider } from "../utils/ThemeContext";

import {
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TimeScale,
  Tooltip,
  type ChartData,
  type ChartTypeRegistry,
  type Tick,
} from "chart.js";
import "chartjs-adapter-moment";
import { chartColors } from "./ChartjsConfig";

// Import utilities
import annotationPlugin from "chartjs-plugin-annotation";
import React from "react";
import { adjustColorOpacity, getChartColor } from "../utils/Utils";

Chart.register(LineController, LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend);

Chart.register(annotationPlugin);

// TODO: add score/result/grade to tooltip
// aggregate by day
const dataFetched = [
  {
    label: "运动人数",
    data: [
      {
        createdAt: "2018-12-07",
        normalizedScore: 80,
      },
      {
        createdAt: "2018-12-08",
        normalizedScore: 70,
      },
      {
        createdAt: "2018-12-09",
        normalizedScore: 90,
      },
      {
        createdAt: "2018-12-10",
        normalizedScore: 100,
      },
    ],
  },
  {
    label: "运动时间",
    data: [
      {
        createdAt: "2018-12-07",
        normalizedScore: 34,
      },
      {
        createdAt: "2018-12-08",
        normalizedScore: 67,
      },
      {
        createdAt: "2018-12-09",
        normalizedScore: 69,
      },
      {
        createdAt: "2018-12-10",
        normalizedScore: 73,
      },
    ],
  },
];

const timeRange: { from: Date; to: Date } = {
  from: new Date(2018, 11, 6),
  to: new Date(2018, 11, 11),
};

const classTotalPeople = 100;

function SingleClassOnlyParticipationLineChart({ height }: { height?: number }) {
  const [chart, setChart] = useState<Chart<
    keyof ChartTypeRegistry,
    {
      x: string;
      y: number;
    }[],
    unknown
  > | null>(null);
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
    () => getChartColor(Math.ceil(dataFetched.length / 2)),
    [dataFetched.length]
  );

  const data = useMemo<
    ChartData<
      "line",
      {
        x: string;
        y: number;
      }[],
      unknown
    >
  >(
    () => ({
      datasets: dataFetched.map((item, index) => ({
        label: item.label,
        data: item.data.map((item2) => ({
          x: item2.createdAt,
          y: item2.normalizedScore,
        })),
        borderColor: adjustColorOpacity(
          colors[Math.floor(index / 2)],
          0.85 * (index % 2 === 0 ? 1 : 0.5)
        ),
        backgroundColor: adjustColorOpacity(
          colors[Math.floor(index / 2)],
          0.85 * (index % 2 === 0 ? 1 : 0.5)
        ),
        hoverBorderColor: adjustColorOpacity(
          hoverColors[Math.floor(index / 2)],
          1 * (index % 2 === 0 ? 1 : 0.5)
        ),
        fill: false,
        pointStyle: "circle",
        pointRadius: 3,
        tension: 0.3,
        yAxisID: index === 0 ? "y" : "y1",
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
          position: "left",
          beginAtZero: true,
          ticks: {
            maxTicksLimit: 6,
            color: darkMode ? textColor.dark : textColor.light,
            backdropColor: darkMode ? backdropColor.dark : backdropColor.light,
            callback: function (tickValue: string | number, index: number, ticks: Tick[]) {
              return tickValue + "人";
            },
          },
          grid: {
            color: darkMode ? gridColor.dark : gridColor.light,
          },
          suggestedMin: 0,
          suggestedMax: classTotalPeople,
        },
        y1: {
          border: {
            display: false,
          },
          position: "right",
          beginAtZero: true,
          ticks: {
            maxTicksLimit: 6,
            color: darkMode ? textColor.dark : textColor.light,
            backdropColor: darkMode ? backdropColor.dark : backdropColor.light,
            callback: function (tickValue: string | number, index: number, ticks: Tick[]) {
              return tickValue + "分钟";
            },
          },
          grid: {
            color: darkMode ? gridColor.dark : gridColor.light,
            drawOnChartArea: false,
          },
        },
        x: {
          type: "time",
          display: true,
          time: {
            unit: "day",
            displayFormats: {
              day: "MM/DD",
            },
          },
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
          suggestedMin: timeRange.from as unknown as string,
          suggestedMax: timeRange.to as unknown as string,
        },
      } as const),
    [darkMode]
  );

  const plugins = useMemo(
    () =>
      ({
        legend: {
          display: false,
          labels: {
            usePointStyle: true,
          },
        },
        tooltip: {
          titleColor: darkMode ? tooltipTitleColor.dark : tooltipTitleColor.light,
          bodyColor: darkMode ? tooltipBodyColor.dark : tooltipBodyColor.light,
          backgroundColor: darkMode ? tooltipBgColor.dark : tooltipBgColor.light,
          borderColor: darkMode ? tooltipBorderColor.dark : tooltipBorderColor.light,
        },
      } as const),
    [darkMode]
  );

  useEffect(() => {
    const ctx = canvas.current;
    if (!ctx) return;
    // eslint-disable-next-line no-unused-vars
    const newChart = new Chart(ctx, {
      type: "line",
      data: data,
      options: {
        layout: {
          padding: {
            top: 12,
            bottom: 16,
            left: 20,
            right: 56,
          },
        },
        scales: scales,
        plugins: plugins,
        interaction: {
          intersect: false,
          mode: "index",
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
      <div className="px-5 py-2">
        <div className="grow mb-2">
          <ul ref={legend} className="flex flex-wrap gap-x-4"></ul>
        </div>
      </div>
      <div className="grow">
        <canvas ref={canvas} height={height}></canvas>
      </div>
    </React.Fragment>
  );
}

export default SingleClassOnlyParticipationLineChart;
