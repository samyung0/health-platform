#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
学生信息匹配脚本
将25.8.19学生信息.xls中的教育ID添加到2025年09月23日-2025年09月24日成绩.xlsx的学籍号字段
"""

import pandas as pd
import numpy as np
import os
from datetime import datetime

class StudentIDMatcher:
    def __init__(self):
        self.student_info_file = "25.8.19学生信息.xls"
        self.score_file = "2025年09月23日-2025年09月24日 成绩.xlsx" 
        self.output_file = "2025年09月23日-2025年09月24日 成绩_含学号.xlsx"
        
    def load_student_info(self):
        """加载学生信息文件"""
        print("=== 加载学生信息文件 ===")
        try:
            # 尝试读取Excel文件
            df_info = pd.read_excel(self.student_info_file)
            print(f"成功读取学生信息文件，共{len(df_info)}条记录")
            print("学生信息文件列名:", df_info.columns.tolist())
            
            # 显示前几行数据以了解结构
            print("\n学生信息文件前5行数据:")
            print(df_info.head())
            
            return df_info
            
        except Exception as e:
            print(f"读取学生信息文件失败: {e}")
            return None
    
    def load_score_data(self):
        """加载成绩数据文件"""
        print("\n=== 加载成绩数据文件 ===")
        try:
            df_score = pd.read_excel(self.score_file)
            print(f"成功读取成绩文件，共{len(df_score)}条记录")
            print("成绩文件列名:", df_score.columns.tolist())
            
            # 显示前几行数据以了解结构
            print("\n成绩文件前5行数据:")
            print(df_score.head())
            
            return df_score
            
        except Exception as e:
            print(f"读取成绩数据文件失败: {e}")
            return None
    
    def find_matching_columns(self, df_info, df_score):
        """分析两个文件的匹配字段"""
        print("\n=== 分析匹配字段 ===")
        
        # 尝试找到姓名相关的列
        name_columns_info = [col for col in df_info.columns if '姓名' in str(col) or 'name' in str(col).lower()]
        name_columns_score = [col for col in df_score.columns if '姓名' in str(col) or 'name' in str(col).lower()]
        
        # 尝试找到班级相关的列
        class_columns_info = [col for col in df_info.columns if '班' in str(col) or 'class' in str(col).lower()]
        class_columns_score = [col for col in df_score.columns if '班级名称' in str(col) or '班' in str(col)]
        
        # 尝试找到教育ID相关的列
        id_columns_info = [col for col in df_info.columns if 'ID' in str(col).upper() or '号' in str(col) or '编号' in str(col)]
        
        print(f"学生信息文件中的姓名列: {name_columns_info}")
        print(f"成绩文件中的姓名列: {name_columns_score}")
        print(f"学生信息文件中的班级列: {class_columns_info}")
        print(f"成绩文件中的班级列: {class_columns_score}")
        print(f"学生信息文件中的ID列: {id_columns_info}")
        
        # 优先选择"班级名称"列
        score_class_col = None
        for col in class_columns_score:
            if '班级名称' in str(col):
                score_class_col = col
                break
        if not score_class_col and class_columns_score:
            score_class_col = class_columns_score[0]
        
        return {
            'name_info': name_columns_info[0] if name_columns_info else None,
            'name_score': name_columns_score[0] if name_columns_score else None,
            'class_info': class_columns_info[0] if class_columns_info else None,
            'class_score': score_class_col,
            'id_info': id_columns_info[0] if id_columns_info else None
        }
    
    def standardize_class_name(self, class_name):
        """标准化班级名称格式"""
        if pd.isna(class_name):
            return ""
        
        class_str = str(class_name).strip()
        
        # 提取年级和班号
        import re
        # 匹配各种可能的班级格式
        patterns = [
            r'([一二三四五六]年级)?(\d+)班',
            r'([1-6])年级(\d+)班',
            r'([一二三四五六])(\d+)班',
            r'(\d+)年级(\d+)班'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, class_str)
            if match:
                if len(match.groups()) == 2:
                    grade_part = match.group(1)
                    class_num = match.group(2)
                    
                    # 标准化年级部分
                    if grade_part:
                        if grade_part.isdigit():
                            grade_map = {'1': '一年级', '2': '二年级', '3': '三年级', 
                                       '4': '四年级', '5': '五年级', '6': '六年级'}
                            grade_part = grade_map.get(grade_part, grade_part + '年级')
                        elif grade_part in ['一', '二', '三', '四', '五', '六']:
                            grade_part += '年级'
                    
                    return f"{grade_part}{class_num}班"
        
        return class_str
    
    def extract_grade_from_class_name(self, class_name):
        """从班级名称中提取年级"""
        if pd.isna(class_name):
            return ""
        
        class_str = str(class_name).strip()
        for grade in ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']:
            if grade in class_str:
                return grade
        return ""
    
    def match_students(self, df_info, df_score, columns):
        """匹配学生信息 - 要求姓名+年级+班级三重匹配"""
        print("\n=== 开始匹配学生信息 ===")
        
        if not all([columns['name_info'], columns['name_score'], columns['id_info']]):
            print("❌ 缺少必要的匹配列")
            return None
        
        # 准备匹配用的数据
        print("准备匹配数据...")
        
        # 学生信息文件已经有独立的年级和班级列，不需要从班级名称中提取
        # df_info['年级'] 已经存在，使用原有数据
        df_info['标准化班级'] = df_info[columns['class_info']].apply(self.standardize_class_name)
        
        # 从成绩文件提取年级和班级信息
        df_score['年级'] = df_score[columns['class_score']].apply(self.extract_grade_from_class_name)
        df_score['标准化班级'] = df_score[columns['class_score']].apply(self.standardize_class_name)
        
        # 创建学号字段（如果不存在）
        if '学籍号' not in df_score.columns:
            df_score['学籍号'] = np.nan
        
        # 匹配统计
        matched_count = 0
        total_score_students = len(df_score)
        duplicate_warnings = []  # 收集重复学生的警告
        
        print(f"成绩文件中共有 {total_score_students} 名学生")
        print(f"学生信息文件中共有 {len(df_info)} 条记录")
        
        # 按年级统计学生数量
        grade_counts_score = df_score['年级'].value_counts()
        print(f"\n成绩文件各年级学生数量:")
        for grade in ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']:
            count = grade_counts_score.get(grade, 0)
            if count > 0:
                print(f"  {grade}: {count} 名")
        
        # 显示学生信息文件中的年级分布
        grade_counts_info = df_info['年级'].value_counts()
        print(f"\n学生信息文件各年级学生数量:")
        for grade in ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']:
            count = grade_counts_info.get(grade, 0)
            if count > 0:
                print(f"  {grade}: {count} 名")
        
        # 如果学生信息文件年级都为空，显示原始数据以便调试
        if grade_counts_info.sum() == 0:
            print(f"\n⚠️ 学生信息文件年级数据为空，显示原始数据样本:")
            sample_data = df_info[['年级', '班级', '姓名']].head(10)
            print(sample_data.to_string())
            
            # 检查年级列的实际内容
            unique_grades = df_info['年级'].unique()
            print(f"\n年级列唯一值: {unique_grades}")
            print(f"年级列数据类型: {df_info['年级'].dtype}")
            print(f"年级列空值数量: {df_info['年级'].isna().sum()}")
            print(f"年级列空字符串数量: {(df_info['年级'] == '').sum()}")
        
        # 显示班级标准化的示例
        print(f"\n成绩文件班级标准化示例:")
        unique_classes_score = df_score['标准化班级'].unique()[:10]
        for cls in unique_classes_score:
            print(f"  {cls}")
        
        print(f"\n学生信息文件班级标准化示例:")
        unique_classes_info = df_info['标准化班级'].unique()[:10] 
        for cls in unique_classes_info:
            print(f"  {cls}")
        
        # 如果学生信息文件班级标准化都为空，显示原始数据
        if len([cls for cls in unique_classes_info if cls]) == 0:
            print(f"\n⚠️ 学生信息文件班级标准化失败，显示原始班级数据:")
            sample_classes = df_info[columns['class_info']].dropna().unique()[:10]
            for cls in sample_classes:
                print(f"  原始班级: {cls}")
        
        # 逐个匹配
        for idx, score_row in df_score.iterrows():
            name = score_row[columns['name_score']]
            score_grade = score_row.get('年级', '')
            score_class = score_row.get('标准化班级', '')
            
            if pd.isna(name):
                continue
            
            # 如果是一年级，跳过匹配（一年级学生没有学号）
            if score_grade == '一年级':
                continue
            
            # 第一步：按姓名匹配
            name_matches = df_info[df_info[columns['name_info']] == name]
            
            if len(name_matches) == 0:
                # 没有姓名匹配项
                continue
            elif len(name_matches) == 1:
                # 唯一姓名匹配
                student_id = name_matches.iloc[0][columns['id_info']]
                df_score.loc[idx, '学籍号'] = student_id
                matched_count += 1
            else:
                # 多个同名学生，用年级+班级进一步区分
                # 成绩文件：年级="二年级"，班级="二年级1班"
                # 学生信息文件：年级="2年级"，班级="1班"
                
                # 转换年级格式：二年级 -> 2年级
                score_grade_converted = score_grade.replace('一年级', '1年级').replace('二年级', '2年级').replace('三年级', '3年级').replace('四年级', '4年级').replace('五年级', '5年级').replace('六年级', '6年级')
                
                # 从成绩文件的班级名称中提取班号："二年级1班" -> "1班"
                import re
                class_num_match = re.search(r'(\d+)班', score_class)
                if class_num_match:
                    score_class_num = class_num_match.group(1) + '班'  # "1班"
                else:
                    score_class_num = ""
                
                # 第二步：按年级匹配
                grade_matches = name_matches[name_matches['年级'] == score_grade_converted]
                
                if len(grade_matches) == 0:
                    # 年级不匹配，报告并使用第一个记录
                    duplicate_warnings.append(f"⚠️ 学生 {name} 年级不匹配 (成绩文件:{score_grade} vs 学生信息:{name_matches['年级'].unique()})")
                    student_id = name_matches.iloc[0][columns['id_info']]
                    df_score.loc[idx, '学籍号'] = student_id
                    matched_count += 1
                elif len(grade_matches) == 1:
                    # 年级唯一匹配，使用该记录
                    student_id = grade_matches.iloc[0][columns['id_info']]
                    df_score.loc[idx, '学籍号'] = student_id
                    matched_count += 1
                else:
                    # 第三步：按班级进一步匹配
                    if score_class_num:
                        class_matches = grade_matches[grade_matches['班级'] == score_class_num]
                        
                        if len(class_matches) == 1:
                            # 完美匹配：姓名+年级+班级
                            student_id = class_matches.iloc[0][columns['id_info']]
                            df_score.loc[idx, '学籍号'] = student_id
                            matched_count += 1
                        elif len(class_matches) > 1:
                            # 姓名+年级+班级都相同，真正的重复记录
                            duplicate_warnings.append(f"❌ 学生 {name} ({score_grade_converted} {score_class_num}) 真正重复记录")
                            student_id = class_matches.iloc[0][columns['id_info']]
                            df_score.loc[idx, '学籍号'] = student_id
                            matched_count += 1
                        else:
                            # 班级不匹配，报告并使用同年级第一个记录
                            duplicate_warnings.append(f"⚠️ 学生 {name} 班级不匹配 (成绩文件:{score_class_num} vs 学生信息:{grade_matches['班级'].unique()})")
                            student_id = grade_matches.iloc[0][columns['id_info']]
                            df_score.loc[idx, '学籍号'] = student_id
                            matched_count += 1
                    else:
                        # 无法提取班级信息，使用同年级第一个记录
                        duplicate_warnings.append(f"⚠️ 学生 {name} 无法提取班级信息，使用同年级第一个记录")
                        student_id = grade_matches.iloc[0][columns['id_info']]
                        df_score.loc[idx, '学籍号'] = student_id
                        matched_count += 1
        
        print(f"\n匹配结果:")
        print(f"成功匹配: {matched_count}/{total_score_students} 名学生")
        print(f"匹配率: {matched_count/total_score_students*100:.1f}%")
        
        # 显示重复记录警告
        if duplicate_warnings:
            print(f"\n⚠️ 发现重复记录 ({len(duplicate_warnings)} 项):")
            for warning in duplicate_warnings:
                print(f"  {warning}")
        
        # 显示未匹配的学生（严格排除一年级）
        unmatched = df_score[df_score['学籍号'].isna()]
        unmatched_non_grade1 = unmatched[unmatched['年级'] != '一年级']
        
        if len(unmatched_non_grade1) > 0:
            print(f"\n未匹配的学生 ({len(unmatched_non_grade1)} 名，不含一年级):")
            for _, row in unmatched_non_grade1.iterrows():
                grade_info = row.get('年级', '未知年级')
                class_info = row.get('标准化班级', '未知班级')
                print(f"  - {row[columns['name_score']]} ({grade_info} {class_info})")
        
        # 统计一年级学生（不报错）
        grade1_students = df_score[df_score['年级'] == '一年级']
        if len(grade1_students) > 0:
            print(f"\n一年级学生: {len(grade1_students)} 名（无需学号，已跳过匹配）")
        
        return df_score
    
    def save_result(self, df_score):
        """保存结果"""
        print(f"\n=== 保存结果到 {self.output_file} ===")
        try:
            # 按年级排序：一年级到六年级
            grade_order = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
            df_score['年级排序'] = df_score['年级'].apply(lambda x: grade_order.index(x) if x in grade_order else 99)
            
            # 按年级、班级、姓名排序
            df_sorted = df_score.sort_values(['年级排序', '标准化班级', '姓名']).drop('年级排序', axis=1)
            
            df_sorted.to_excel(self.output_file, index=False)
            print("✅ 文件保存成功")
            
            # 显示学籍号填充情况
            total_students = len(df_score)
            filled_students = len(df_score[df_score['学籍号'].notna()])
            print(f"总学生数: {total_students}")
            print(f"已填充学籍号: {filled_students}")
            print(f"填充率: {filled_students/total_students*100:.1f}%")
            
            # 按年级统计填充情况
            print(f"\n各年级学籍号填充情况:")
            for grade in grade_order:
                grade_students = df_score[df_score['年级'] == grade]
                if len(grade_students) > 0:
                    filled = len(grade_students[grade_students['学籍号'].notna()])
                    total = len(grade_students)
                    if grade == '一年级':
                        print(f"  {grade}: {total} 名学生（无需学号）")
                    else:
                        print(f"  {grade}: {filled}/{total} 名学生已填充学号 ({filled/total*100:.1f}%)")
            
        except Exception as e:
            print(f"❌ 保存文件失败: {e}")
    
    def process(self):
        """主处理流程"""
        print("学生信息匹配脚本")
        print("=" * 50)
        
        # 检查文件是否存在
        if not os.path.exists(self.student_info_file):
            print(f"❌ 学生信息文件不存在: {self.student_info_file}")
            return
        
        if not os.path.exists(self.score_file):
            print(f"❌ 成绩文件不存在: {self.score_file}")
            return
        
        # 加载数据
        df_info = self.load_student_info()
        if df_info is None:
            return
        
        df_score = self.load_score_data()
        if df_score is None:
            return
        
        # 分析匹配字段
        columns = self.find_matching_columns(df_info, df_score)
        print(f"\n将使用以下字段进行匹配:")
        print(f"  学生信息文件姓名列: {columns['name_info']}")
        print(f"  成绩文件姓名列: {columns['name_score']}")
        print(f"  学生信息文件班级列: {columns['class_info']}")
        print(f"  成绩文件班级列: {columns['class_score']}")
        print(f"  学生信息文件ID列: {columns['id_info']}")
        
        # 匹配学生信息
        result_df = self.match_students(df_info, df_score, columns)
        if result_df is None:
            return
        
        # 保存结果
        self.save_result(result_df)
        
        print("\n=== 处理完成 ===")
        print(f"新文件: {self.output_file}")
        print("请检查匹配结果，确认学籍号填充是否正确")

def main():
    matcher = StudentIDMatcher()
    matcher.process()

if __name__ == "__main__":
    main()
