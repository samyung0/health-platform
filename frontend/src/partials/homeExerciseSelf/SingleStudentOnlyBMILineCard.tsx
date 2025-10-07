import SingleStudentOnlyBMILineChart from "~/charts/SingleStudentOnlyBMILineChart";
import {
  atomHomeExerciseDateRangeChosen,
  useAllHomeExerciseRecordsByMeStore,
} from "~/states/homeExerciseRecords";
import { useStore } from "@nanostores/react";
import { useMemo } from "react";
import BMI_Grading_ from "@/data/persistent/BMI_grading.json";

const BMI_Grading = BMI_Grading_ as Record<
  string,
  Record<string, Record<string, Record<string, (number | (number | null)[])[]>>>
>;

function SingleStudentOnlyBMILineCard() {
  const data = useAllHomeExerciseRecordsByMeStore().data;
  const date = useStore(atomHomeExerciseDateRangeChosen);

  const d = useMemo(() => {
    if (!date || !date.from || !date.to || !data || data.length === 0) return null;
    const BMIData: { score: number; createdAt: string }[] = [];
    for (const rec of data) {
      if (!rec.score || !rec.exerciseDate || rec.recordType !== "体重指数（BMI）") continue;
      BMIData.push({
        score: rec.score,
        createdAt: rec.exerciseDate,
      });
    }
    BMIData.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return [
      {
        label: "体重指数（BMI）",
        data: BMIData,
      },
    ];
  }, [data, date]);

  const line = useMemo(() => {
    if (!date || !date.from || !date.to || !data || data.length === 0) return null;
    const gender = data[0].recordToEntity.gender;
    const schoolType = data[0].recordToEntity.schoolType;
    const year = data[0].recordToEntity.year || "六年级";
    if (!gender || !schoolType || !year) return null;
    const t = BMI_Grading[gender][schoolType][year]["正常"][1];
    if (!Array.isArray(t)) return null;
    const underweight = t[0];
    const overweight = t[1];
    if (!underweight || !overweight) return null;
    return [underweight, overweight];
  }, [data, date]);

  return (
    <div className="flex flex-col col-span-full lg:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">
          体重指数（BMI）（千克/米2）
        </h2>
      </header>
      {d && d.length > 0 && date && date.to && date.from ? (
        <SingleStudentOnlyBMILineChart
          height={250}
          dataFetched={d}
          timeRange={{ from: date.from!, to: date.to! }}
          weightline={line}
        />
      ) : (
        <div className="flex flex-col justify-center items-center h-[200px]">
          <p className="text-gray-500 dark:text-gray-400">暂无数据</p>
        </div>
      )}
    </div>
  );
}

export default SingleStudentOnlyBMILineCard;
