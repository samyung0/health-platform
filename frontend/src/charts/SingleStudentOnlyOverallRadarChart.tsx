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

Chart.register(
  RadarController,
  LineElement,
  PointElement,
  RadialLinearScale,
  TimeScale,
  Tooltip,
  Legend
);

const dataFetched = [
  {
    label: "2025年上学期",
    date: new Date(2025, 2, 15),
    data: [92, 16, 83, 80, 79, 19, 173],
  },
  {
    label: "2024年下学期",
    date: new Date(2024, 8, 15),
    data: [62, 76, 73, 20, 69, 19, 93],
  },
  {
    label: "2024年上学期",
    date: new Date(2024, 2, 15),
    data: [52, 66, 63, 60, 59, 59, 23],
  },
];

const exerciseTypes = [
  "身高",
  "体重",
  "体重指数（BMI）",
  "肺活量",
  "50米跑",
  "坐位体前屈",
  "一分钟跳绳",
  "一分钟仰卧起坐",
  "50米×8往返跑",
  "立定跳远",
  "引体向上",
  "1000米跑",
  "800米跑",
];

function SingleStudentOnlyOverallRadarChart({
  height,
  dataFetched,
  exerciseTypes,
}: {
  height?: number;
  dataFetched: { label: string; date: Date; data: (number | null)[] }[];
  exerciseTypes: string[];
}) {
  const [chart, setChart] = useState<Chart | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const legend = useRef<HTMLUListElement>(null);
  const { currentTheme } = useThemeProvider();
  const darkMode = currentTheme === "dark";
  const {
    radarGridColor,
    textColor,
    backdropColor,
    tooltipTitleColor,
    tooltipBodyColor,
    tooltipBgColor,
    tooltipBorderColor,
  } = chartColors;

  const [colors] = useMemo(() => getChartColor(dataFetched.length), [dataFetched.length]);
  const data = useMemo<ChartData<"radar">>(
    () => ({
      labels: exerciseTypes,
      datasets: dataFetched
        // largest to smallest timescale
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map((item, index) => ({
          label: item.label,
          data: item.data,
          borderWidth: 2,
          borderColor: adjustColorOpacity(colors[index], 0.7),
          backgroundColor: adjustColorOpacity(colors[index], 0.2),
          pointRadius: 1,
          order: index,
        })),
    }),
    [dataFetched]
  );

  const scales = useMemo(
    () =>
      ({
        r: {
          grid: {
            color: darkMode ? radarGridColor.dark : radarGridColor.light,
          },
          ticks: {
            color: darkMode ? textColor.dark : textColor.light,
            backdropColor: darkMode ? backdropColor.dark : backdropColor.light,
          },
          suggestedMin: 0,
          suggestedMax: 100,
          pointLabels: {
            font: {
              size: 12,
            },
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
      } as const),
    [darkMode]
  );

  useEffect(() => {
    const ctx = canvas.current;
    if (!ctx) return;
    // eslint-disable-next-line no-unused-vars
    const newChart = new Chart(ctx, {
      type: "radar",
      data: data,
      options: {
        layout: {
          padding: {
            top: 10,
            bottom: 24,
            left: 16,
            right: 16,
          },
        },
        scales: scales,
        plugins: plugins,
        interaction: {
          intersect: false,
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
              li.style.margin = "4px";
              // Button element
              const button = document.createElement("button");
              button.classList.add(
                "btn-xs",
                "bg-white",
                "font-medium",
                "text-xs",
                "dark:bg-gray-700",
                "text-gray-500",
                "dark:text-gray-400",
                "shadow-xs",
                "shadow-black/[0.08]",
                "rounded-full"
              );
              button.style.opacity = item.hidden ? ".3" : "";
              button.onclick = () => {
                if (item.datasetIndex === undefined || item.datasetIndex === null) return;
                c.setDatasetVisibility(item.datasetIndex, !c.isDatasetVisible(item.datasetIndex));
                c.update();
              };
              // Color box
              const box = document.createElement("span");
              box.style.display = "block";
              box.style.width = "8px";
              box.style.height = "8px";
              box.style.backgroundColor = adjustColorOpacity(item.fillStyle!.toString(), 1 / 0.2);
              box.style.borderRadius = "4px";
              box.style.marginRight = "4px";
              box.style.pointerEvents = "none";
              // Label
              const label = document.createElement("span");
              label.style.display = "flex";
              label.style.alignItems = "center";
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
      <div className="px-5 pt-2 pb-6">
        <ul ref={legend} className="flex flex-wrap justify-center -m-1"></ul>
      </div>
    </div>
  );
}

export default SingleStudentOnlyOverallRadarChart;
