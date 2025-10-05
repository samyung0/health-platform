import { useEffect, useMemo, useRef, useState } from "react";
import { useThemeProvider } from "../utils/ThemeContext";

import {
  BarController,
  BarElement,
  Chart,
  Legend,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  type ChartData,
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
import { type Context } from "chartjs-plugin-datalabels";
import { adjustColorOpacity, getChartBorderColor, getChartColor } from "../utils/Utils";

Chart.register(BarController, BarElement, LinearScale, TimeScale, Title, Tooltip, Legend);

// TODO: add data, follow worst to best order, note its total count, % is calculated
const dataFetched: {
  label: string;
  date: Date;
  data: number[];
  grade: (typeof GRADING_SCALE_KEYS)[number];
}[] = [
  {
    label: "2025年上学期",
    date: new Date(2025, 2, 15),
    data: [6, 6, 6, 6],
    grade: "优秀",
  },
  {
    label: "2025年上学期",
    date: new Date(2025, 2, 15),
    data: [6, 6, 6, 6],
    grade: "良好",
  },
  {
    label: "2025年上学期",
    date: new Date(2025, 2, 15),
    data: [2, 6, 6, 6],
    grade: "及格",
  },
  {
    label: "2025年上学期",
    date: new Date(2025, 2, 15),
    data: [10, 6, 6, 6],
    grade: "不及格",
  },
  {
    label: "2024年下学期",
    date: new Date(2024, 8, 15),
    data: [6, 6, 6, 6],
    grade: "优秀",
  },
  {
    label: "2024年下学期",
    date: new Date(2024, 8, 15),
    data: [6, 6, 6, 6],
    grade: "良好",
  },
  {
    label: "2024年下学期",
    date: new Date(2024, 8, 15),
    data: [6, 6, 6, 6],
    grade: "及格",
  },
  {
    label: "2024年下学期",
    date: new Date(2024, 8, 15),
    data: [6, 6, 6, 6],
    grade: "不及格",
  },
];
const classes = ["1A", "1B", "1C", "1D"];
const totalStudents = {
  "1A": 24,
  "1B": 24,
  "1C": 24,
  "1D": 24,
} as Record<string, number>;

// this is not dynamic
const gradingColors = GRADING_SCALE_KEYS.map((key) =>
  adjustColorOpacity(GRADING_COLORS[key], 0.85)
);
const gradingHoverColors = GRADING_SCALE_KEYS.map((key) =>
  adjustColorOpacity(GRADING_COLORS[key], 1)
);
const gradingColorsDark = GRADING_SCALE_KEYS.map((key) =>
  adjustColorOpacity(GRADING_COLORS_DARK[key], 0.85)
);
const gradingHoverColorsDark = GRADING_SCALE_KEYS.map((key) =>
  adjustColorOpacity(GRADING_COLORS_DARK[key], 1)
);
function SingleYearDetailGradeStackedBarChart({
  height,
  dataFetched,
  classes,
  totalStudents,
  type,
}: {
  height?: number;
  dataFetched: {
    label: string;
    date: Date;
    data: number[];
    grade: string;
  }[];
  classes: string[];
  totalStudents: Record<string, number>;
  type: string;
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

  const uniqueLabels = useMemo(() => {
    return [...new Set(dataFetched.map((item) => item.label))];
  }, [dataFetched]);

  const [colors, hoverColors] = useMemo(
    () => getChartColor(uniqueLabels.length),
    [uniqueLabels.length]
  );
  const [borderColors, borderHoverColors] = useMemo(
    () => getChartBorderColor(uniqueLabels.length),
    [uniqueLabels.length]
  );
  const data = useMemo<ChartData<"bar">>(
    () => ({
      labels: classes,
      datasets: dataFetched
        // largest to smallest timescale
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map((item) => {
          const gradeIndex =
            type === "体重指数（BMI）"
              ? GRADING_SCALE_BMI_KEYS.indexOf(
                  item.grade as (typeof GRADING_SCALE_BMI_KEYS)[number]
                )
              : GRADING_SCALE_KEYS.indexOf(item.grade as (typeof GRADING_SCALE_KEYS)[number]);
          const labelIndex = uniqueLabels.indexOf(item.label);
          return {
            label: item.label,
            stack: item.label,
            data: item.data.map((data) =>
              Math.round((data / totalStudents[classes[labelIndex]]) * 100)
            ),
            backgroundColor: adjustColorOpacity(
              darkMode ? gradingColorsDark[gradeIndex] : gradingColors[gradeIndex],
              0.8
            ),
            hoverBackgroundColor: adjustColorOpacity(
              darkMode ? gradingHoverColorsDark[gradeIndex] : gradingHoverColors[gradeIndex],
              0.8
            ),
            borderColor: adjustColorOpacity(borderColors[labelIndex], 1),
            hoverBorderColor: adjustColorOpacity(borderHoverColors[labelIndex], 1),
            pointRadius: 0,
            borderRadius: 0,
            // borderSkipped: false,
            borderWidth: uniqueLabels.length === 1 ? 0 : darkMode ? 4 : 3,
            categoryPercentage: 0.8,
            barPercentage: uniqueLabels.length === 1 ? 0.6 : 0.8,
            datalabels: {
              align: "end",
              anchor: "end",
            },
          };
        }),
    }),
    [dataFetched, darkMode, uniqueLabels]
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
          stacked: true,
        },
        x: {
          border: {
            display: false,
          },
          stacked: true,
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
        title: {
          display: true,
          text: "班级等级分布",
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
          callbacks: {
            title: function (context: TooltipItem<"bar">[]) {
              return context[0].dataset.label + " - " + context[0].label;
            },
            label: function (context: TooltipItem<"bar">) {
              return (
                dataFetched[context.datasetIndex].grade +
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
            const labelsSeen = new Set<string>();
            for (let i = 0; i < c.data.datasets.length; i++) {
              const l = c.data.datasets[i].label;
              if (!l || labelsSeen.has(l)) continue;
              labelsSeen.add(l);
              const isLabelVisible = c.isDatasetVisible(i);
              const li = document.createElement("li");
              // Button element
              const button = document.createElement("button");
              button.style.display = "inline-flex";
              button.style.alignItems = "center";
              button.style.opacity = isLabelVisible ? "" : ".3";
              button.onclick = () => {
                const allDataSetsIndicesForThatLabel = c.data.datasets
                  .map((dataset, index) => (dataset.label === l ? index : null))
                  .filter((index) => index !== null);
                allDataSetsIndicesForThatLabel.forEach((datasetIndex) => {
                  c.setDatasetVisibility(datasetIndex, !c.isDatasetVisible(datasetIndex));
                });
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
              box.style.borderColor = colors[labelsSeen.size - 1];
              box.style.pointerEvents = "none";
              // Label
              const label = document.createElement("span");
              label.classList.add("text-xs", "text-gray-500", "font-medium", "dark:text-gray-400");
              label.style.fontSize = "12px";
              label.style.lineHeight = "calc(1.25 / 0.875)";
              const labelText = document.createTextNode(l);
              label.appendChild(labelText);
              li.appendChild(button);
              button.appendChild(box);
              button.appendChild(label);
              ul.appendChild(li);
            }
          },
        },
        // {
        //   id: "backgroundYearColor",
        //   beforeDatasetDraw(c, args, options) {
        //     // since its the chart is stacked, we want to only draw the background once
        //     // chart js starts with last index, so we want to draw the background for only the last index to avoid overlapping colors
        //     if ((args.index + 1) % GRADING_SCALE_KEYS.length !== 0) return;
        //     const {
        //       data,
        //       ctx,
        //       chartArea: { top, bottom, left, right, width, height },
        //       scales: { x, y },
        //     } = c;
        //     // console.log(args);
        //     ctx.save();
        //     const uniqueLabels = [...new Set(data.datasets.map((dataset) => dataset.label))];
        //     // console.log(uniqueLabels);
        //     const segment = width / data.labels!.length;
        //     const barWidth =
        //       (segment * (data as ChartData<"bar">).datasets[0].categoryPercentage!) /
        //       uniqueLabels.length;
        //     ctx.fillStyle =
        //       args.meta.label === "2025年上学期" ? "rgb(255, 0, 0, 0.1)" : "rgb(0, 0, 255, 0.2)";
        //     console.log(args.index, args.meta, args.meta.label, ctx.fillStyle);
        //     for (let i = 0; i < data.labels!.length; i++) {
        //       // console.log(x.getPixelForValue(i));
        //       ctx.fillRect(
        //         x.getPixelForValue(i) - (args.meta.label === "2025年上学期" ? barWidth : 0),
        //         top,
        //         barWidth,
        //         height
        //       );
        //     }
        //   },
        // },
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
        {uniqueLabels.length === 1 && (
          <div className="flex items-center justify-center flex-wrap gap-y-1 gap-3">
            <div className="text-xs text-gray-500 font-medium dark:text-gray-400 flex items-center">
              总计
            </div>
            {GRADING_SCALE_KEYS.map((key, index) => (
              <div key={key} className="flex flex-col items-left">
                <div className="text-xs text-gray-500 font-medium dark:text-gray-400 flex items-center">
                  <div
                    className="w-2 h-2 rounded-sm mr-2 pointer-events-none"
                    style={{ backgroundColor: GRADING_COLORS[key] }}
                  ></div>
                  <div className="pr-2">
                    {key}{" "}
                    {dataFetched
                      .find((item) => item.grade === key)
                      ?.data.reduce((acc, item) => acc + item, 0)}
                    人
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {uniqueLabels.length > 1 && (
          <div className="grow mb-1">
            <ul ref={legend} className="flex flex-wrap gap-x-4"></ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default SingleYearDetailGradeStackedBarChart;
