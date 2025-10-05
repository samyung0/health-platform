import defaultTheme from "tailwindcss/defaultTheme";

const _defaultColors = defaultTheme.colors();

export const FRONTEND_EXERCISE_TYPES = [
  "体重指数（BMI）",
  "肺活量",
  "50米跑",
  "坐位体前屈",
  "一分钟跳绳",
  "一分钟仰卧起坐",
  "50米×8往返跑",
];

export const EXPECTED_HEADERS_FROM_DAWEI_EXPORT_FRONTEND = [
  "年级编号",
  "班级编号",
  "班级名称",
  "学籍号",
  "民族代码",
  "姓名",
  "性别",
  "出生日期",
  "家庭住址",
  "身高(cm)",
  "体重(kg)",
  "肺活量(ml)",
  "50米跑(s)",
  "坐位体前屈(cm)",
  "一分钟跳绳(个）",
  "一分钟仰卧起坐(个)",
  "50米×8往返跑(s)",
  "立定跳远(cm)",
  "800米跑(s)",
  "1000米跑(s)",
  "引体向上(个)",
];

export const EXPECTED_HEADERS_FROM_SCHOOL_STUDENTS_EXPORT = [
  "年级",
  "班级",
  "姓名",
  "性别",
  "教育ID",
  "身份证件号码",
];

export const availableReportsToExport = [
  "全校成绩总表",
  "班级排名统计表",
  "个人成绩单",
  "年级成绩总表",
  "班级成绩总表",
] as const;

export const CHART_MIN_OPACITY_FOR_TIME_SERIES = 0.2;
export const CHART_OPACITY_FOR_TIME_SERIES_PREFERRED_INTERVAL = 0.2;

export const GRADING_SCALE = {
  不及格: [0, 50],
  及格: [50, 80],
  良好: [80, 90],
  优秀: [90, Infinity],
} as const;
// order from worst to best
export const GRADING_SCALE_KEYS = ["不及格", "及格", "良好", "优秀"] as const;
export const GRADING_SCALE_BMI_KEYS = ["低体重", "正常", "超重", "肥胖"] as const;

export const GENDER_FILTER = ["总计", "男生", "女生"] as const;

export const defaultColors = {
  ..._defaultColors,
  violet: {
    50: "#f1eeff",
    100: "#e6e1ff",
    200: "#d2cbff",
    300: "#b7acff",
    400: "#9c8cff",
    500: "#8470ff",
    600: "#755ff8",
    700: "#5d47de",
    800: "#4634b1",
    900: "#2f227c",
    950: "#1c1357",
  },
  sky: {
    50: "#e3f3ff",
    100: "#d1ecff",
    200: "#b6e1ff",
    300: "#a0d7ff",
    400: "#7bc8ff",
    500: "#67bfff",
    600: "#56b1f3",
    700: "#3193da",
    800: "#1c71ae",
    900: "#124d79",
    950: "#0b324f",
  },
  green: {
    50: "#d2ffe2",
    100: "#b1fdcd",
    200: "#8bf0b0",
    300: "#67e294",
    400: "#4bd37d",
    500: "#3ec972",
    600: "#34bd68",
    700: "#239f52",
    800: "#15773a",
    900: "#0f5429",
    950: "#0a3f1e",
  },
  red: {
    50: "#ffe8e8",
    100: "#ffd1d1",
    200: "#ffb2b2",
    300: "#ff9494",
    400: "#ff7474",
    500: "#ff5656",
    600: "#fa4949",
    700: "#e63939",
    800: "#c52727",
    900: "#941818",
    950: "#600f0f",
  },
  yellow: {
    50: "#fff2c9",
    100: "#ffe7a0",
    200: "#ffe081",
    300: "#ffd968",
    400: "#f7cd4c",
    500: "#f0bb33",
    600: "#dfad2b",
    700: "#bc9021",
    800: "#816316",
    900: "#4f3d0e",
    950: "#342809",
  },

  pink: {
    "50": "oklch(0.971 0.014 343.198)",
    "100": "oklch(0.948 0.028 342.258)",
    "200": "oklch(0.899 0.061 343.231)",
    "300": "oklch(0.823 0.12 346.018)",
    "400": "oklch(0.718 0.202 349.761)",
    "500": "oklch(0.656 0.241 354.308)",
    "600": "oklch(0.592 0.249 0.584)",
    "700": "oklch(0.525 0.223 3.958)",
    "800": "oklch(0.459 0.187 3.815)",
    "900": "oklch(0.408 0.153 2.432)",
    "950": "oklch(0.284 0.109 3.907)",
  },
  rose: {
    "50": "oklch(0.969 0.015 12.422)",
    "100": "oklch(0.941 0.03 12.58)",
    "200": "oklch(0.892 0.058 10.001)",
    "300": "oklch(0.81 0.117 11.638)",
    "400": "oklch(0.712 0.194 13.428)",
    "500": "oklch(0.645 0.246 16.439)",
    "600": "oklch(0.586 0.253 17.585)",
    "700": "oklch(0.514 0.222 16.935)",
    "800": "oklch(0.455 0.188 13.697)",
    "900": "oklch(0.41 0.159 10.272)",
    "950": "oklch(0.271 0.105 12.094)",
  },
};

export const GRADING_COLORS = {
  不及格: defaultColors.red[500],
  及格: defaultColors.yellow[500],
  良好: defaultColors.green[500],
  优秀: defaultColors.violet[500],
};

export const GRADING_COLORS_HOVER = {
  不及格: defaultColors.red[600],
  及格: defaultColors.yellow[600],
  良好: defaultColors.green[600],
  优秀: defaultColors.violet[600],
};

export const GRADING_COLORS_DARK = {
  不及格: defaultColors.red[400],
  及格: defaultColors.yellow[400],
  良好: defaultColors.green[400],
  优秀: defaultColors.violet[400],
};

export const GRADING_COLORS_HOVER_DARK = {
  不及格: defaultColors.red[300],
  及格: defaultColors.yellow[300],
  良好: defaultColors.green[300],
  优秀: defaultColors.violet[300],
};

export const CHART_COLORS = [
  defaultColors.violet[500],
  defaultColors.sky[500],
  defaultColors.yellow[500],
  defaultColors.green[500],
  defaultColors.teal[500],
  defaultColors.blue[500],
  defaultColors.purple[500],
  defaultColors.pink[500],
  defaultColors.lime[500],
  defaultColors.rose[500],
  defaultColors.cyan[500],
  defaultColors.indigo[500],
  defaultColors.fuchsia[500],
  defaultColors.emerald[500],
  defaultColors.orange[500],
  defaultColors.amber[500],
];

export const CHART_HOVER_COLORS = [
  defaultColors.violet[600],
  defaultColors.sky[600],
  defaultColors.yellow[600],
  defaultColors.green[600],
  defaultColors.teal[600],
  defaultColors.blue[600],
  defaultColors.purple[600],
  defaultColors.pink[600],
  defaultColors.lime[600],
  defaultColors.rose[600],
  defaultColors.cyan[600],
  defaultColors.indigo[600],
  defaultColors.fuchsia[600],
  defaultColors.emerald[600],
  defaultColors.orange[600],
  defaultColors.amber[600],
];

export const CHART_BORDER_COLORS = [
  defaultColors.violet[700],
  defaultColors.sky[700],
  defaultColors.yellow[700],
  defaultColors.green[700],
  defaultColors.teal[700],
  defaultColors.blue[700],
  defaultColors.purple[700],
  defaultColors.pink[700],
  defaultColors.lime[700],
  defaultColors.rose[700],
  defaultColors.cyan[700],
  defaultColors.indigo[700],
  defaultColors.fuchsia[700],
  defaultColors.emerald[700],
  defaultColors.orange[700],
  defaultColors.amber[700],
];

export const CHART_BORDER_HOVER_COLORS = [
  defaultColors.violet[500],
  defaultColors.sky[500],
  defaultColors.yellow[500],
  defaultColors.green[500],
  defaultColors.teal[500],
  defaultColors.blue[500],
  defaultColors.purple[500],
  defaultColors.pink[500],
  defaultColors.lime[500],
  defaultColors.rose[500],
  defaultColors.cyan[500],
  defaultColors.indigo[500],
  defaultColors.fuchsia[500],
  defaultColors.emerald[500],
  defaultColors.orange[500],
  defaultColors.amber[500],
];
