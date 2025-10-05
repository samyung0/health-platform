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
} from "chart.js";
import "chartjs-adapter-moment";

// Import utilities
import { adjustColorOpacity, getChartColor } from "../utils/Utils";
import React from "react";
import annotationPlugin from "chartjs-plugin-annotation";
import { drawPassingLineVertical } from "~/lib/utils";

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

// TODO: find passing score

const entities = [
  "梁伟成",
  "容展鹏",
  "梁伟成",
  "容展鹏",
  "成龙",
  "成",
  "成",
  "梁伟成",
  "容展鹏",
  "梁伟成",
  "容展鹏",
  "成龙",
  "成",
  "成",
];

// TODO: sort by high/min score
// TODO: enable/disable score lines internally

const dataFetched = [
  {
    label: "2025年上学期",
    date: new Date(2025, 2, 15),
    data: [12, 23, 12, 23, 12, 23, 12, 12, 23, 12, 23, 12, 12, 23, 12],
  },
  {
    label: "2024年下学期",
    date: new Date(2024, 8, 15),
    data: [18, 29, 18, 29, 18, 29, 18, 18, 29, 18, 29, 18, 18, 29, 18],
  },
  {
    label: "2024年上学期",
    date: new Date(2024, 2, 15),
    data: [16, 22, 16, 22, 16, 22, 16, 16, 22, 16, 22, 16, 16, 22, 16],
  },
];

const passingScore = 15;

function MultipleEntitiesSingleExerciseBarChart({ height }: { height?: number }) {
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

  const [yearSelected, setYearSelected] = useState(() =>
    Array.from(Array(dataFetched.length).keys())
  );

  const [colors, hoverColors] = useMemo(
    () => getChartColor(dataFetched.length),
    [dataFetched.length]
  );

  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels: entities,
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
          barPercentage: entities.length < 6 ? 1 : 0.7,
          categoryPercentage: entities.length < 6 ? 0.7 : 1,
          borderRadius: 4,
        })),
    }),
    [dataFetched]
  );

  useEffect(() => {
    const ctx = canvas.current;
    if (!ctx) return;
    let localYearSelected = yearSelected;
    const w = window.innerWidth;
    // eslint-disable-next-line no-unused-vars
    const newChart = new Chart(ctx, {
      type: "bar",
      data: data,
      options: {
        indexAxis: "y",
        layout: {
          padding: {
            top: 30,
            bottom: 16,
            left: w < 768 ? 0 : 20,
            right: w < 768 ? 20 : 45,
          },
        },
        scales: {
          y: {
            border: {
              // display: false,
            },
            beginAtZero: true,
            ticks: {
              color: darkMode ? textColor.dark : textColor.light,
              backdropColor: darkMode ? backdropColor.dark : backdropColor.light,
            },
            grid: {
              display: false,
              color: darkMode ? gridColor.dark : gridColor.light,
            },
          },
          x: {
            border: {
              display: false,
            },
            grid: {
              // display: false,
            },
            ticks: {
              maxTicksLimit: 7,
              maxRotation: 0,
              color: darkMode ? textColor.dark : textColor.light,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            titleColor: darkMode ? tooltipTitleColor.dark : tooltipTitleColor.light,
            bodyColor: darkMode ? tooltipBodyColor.dark : tooltipBodyColor.light,
            backgroundColor: darkMode ? tooltipBgColor.dark : tooltipBgColor.light,
            borderColor: darkMode ? tooltipBorderColor.dark : tooltipBorderColor.light,
          },
          annotation: {
            clip: false,
            annotations: {
              annotation1: {
                type: "line",
                scaleID: "x",
                value: passingScore,
                borderWidth: 2,
                beforeDraw: drawPassingLineVertical,
                borderColor: darkMode ? passingLineColor.dark : passingLineColor.light,
              },
            },
          },
        },
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
                if (localYearSelected.length === 1 && localYearSelected[0] === item.datasetIndex)
                  return;
                setYearSelected((prev) => {
                  if (prev.includes(item.datasetIndex!)) {
                    localYearSelected = prev.filter((index) => index !== item.datasetIndex!);
                    return prev.filter((index) => index !== item.datasetIndex!);
                  }
                  localYearSelected = [...prev, item.datasetIndex!];
                  return [...prev, item.datasetIndex!];
                });
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
              label.classList.add("text-xs", "text-gray-500", "dark:text-gray-400");
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

    chart.options.scales = {
      y: {
        border: {
          // display: false,
        },
        beginAtZero: true,
        ticks: {
          maxTicksLimit: 6,
          color: darkMode ? textColor.dark : textColor.light,
          backdropColor: darkMode ? backdropColor.dark : backdropColor.light,
        },
        grid: {
          display: false,
          color: darkMode ? gridColor.dark : gridColor.light,
        },
      },
      x: {
        border: {
          display: false,
        },
        grid: {
          // display: false,
        },
        ticks: {
          maxRotation: 0,
          color: darkMode ? textColor.dark : textColor.light,
        },
      },
    };
    chart.options.plugins = {
      legend: {
        display: false,
      },
      tooltip: {
        titleColor: darkMode ? tooltipTitleColor.dark : tooltipTitleColor.light,
        bodyColor: darkMode ? tooltipBodyColor.dark : tooltipBodyColor.light,
        backgroundColor: darkMode ? tooltipBgColor.dark : tooltipBgColor.light,
        borderColor: darkMode ? tooltipBorderColor.dark : tooltipBorderColor.light,
      },
      annotation: {
        clip: false,
        annotations: {
          annotation1: {
            type: "line",
            scaleID: "x",
            value: 15,
            borderWidth: 2,
            beforeDraw: drawPassingLineVertical,
            borderColor: darkMode ? passingLineColor.dark : passingLineColor.light,
          },
        },
      },
    };
    chart.update("none");
  }, [currentTheme]);

  const parentHeight =
    Math.max(entities.length * 16 + entities.length * yearSelected.length * 12, 300) + 30;

  useEffect(() => {
    if (!chart) return;
    chart.data = data;
    canvas.current!.parentElement!.style.height = `${parentHeight}px`;
    chart.update("none");
  }, [data, yearSelected]);

  return (
    <React.Fragment>
      <div className="px-5 py-4">
        <div className="grow mb-1">
          <ul ref={legend} className="flex flex-wrap gap-x-4"></ul>
        </div>
      </div>
      {/* height of chart adjusted base on amount of entities and years  */}
      <div className="" style={{ height: parentHeight }}>
        <canvas ref={canvas} height={height}></canvas>
      </div>
    </React.Fragment>
  );
}

export default MultipleEntitiesSingleExerciseBarChart;
