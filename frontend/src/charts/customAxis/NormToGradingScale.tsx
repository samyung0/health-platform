// import { GRADING_SCALE } from "~/lib/const";
// import { Scale, LinearScale, Chart, TimeSeriesScale } from "chart.js";

// export default class NormToGradingScale extends Scale {
//   readonly labels = Object.keys(GRADING_SCALE) as (keyof typeof GRADING_SCALE)[];
//   readonly min = GRADING_SCALE[this.labels[0]][0];
//   static id: string;
//   static defaults: any;
//   constructor(cfg: { id: string; type: string; ctx: CanvasRenderingContext2D; chart: Chart }) {
//     super(cfg);
//     console.log("constructor", this.min, this.max);
//   }

//   // parse(raw: any, index: number) {
//   //   console.log(raw, index);
//   //   const value = LinearScale.prototype.parse.apply(this, [raw, index]) as number;
//   //   return isFinite(value) && value > 0 ? value : null;
//   // }

//   // determineDataLimits() {
//   // const { min, max } = this.getMinMax(true);
//   // console.log(min, max);
//   // this.min = isFinite(min) ? Math.max(0, min) : null;
//   // this.max = isFinite(max) ? Math.max(0, max) : null;
//   // }

//   determineDataLimits() {}

//   getLabelForValue(value: number) {
//     console.log("getLabelForValue", value);
//     return "hldsahdlsa";
//   }

//   buildTicks() {
//     return this.labels.map((grade) => ({ value: grade }));
//   }

//   /**
//    * @protected
//    */
//   configure() {
//     console.log("configure");
//     // const start = this.min;
//     // console.log(start);

//     // this._startValue = Math.log2(start!);
//     // this._valueRange = Math.log2(this.max!) - Math.log2(start!);
//   }

//   getPixelForValue(value: number) {
//     console.log(value);
//     if (value === undefined || value < this.min) {
//       value = this.min;
//     }

//     for(const label of this.labels) {
//       if (value >= GRADING_SCALE[label][0] && value < GRADING_SCALE[label][1]) {
//         return label;
//       }
//     }

//     return this.getPixelForDecimal(
//       value === this.min ? 0 : (Math.log2(value) - this._startValue!) / this._valueRange
//     );
//   }

//   getValueForPixel(pixel: number) {
//     console.log(pixel);
//     const decimal = this.getDecimalForPixel(pixel);
//     return Math.pow(2, this._startValue! + decimal * this._valueRange);
//   }
// }

// NormToGradingScale.id = "normToGradingScale";
// NormToGradingScale.defaults = {};
