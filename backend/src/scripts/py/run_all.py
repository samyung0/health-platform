#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
体测成绩处理主程序
按顺序运行所有脚本：whole_school.py -> form_and_class.py -> class_ranking.py -> transcript.py
"""

import os
import sys
import time
import importlib.util
from datetime import datetime


def load_module_from_file(file_path, module_name):
    """从文件路径加载模块"""
    try:
        spec = importlib.util.spec_from_file_location(module_name, file_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    except Exception as e:
        print(f"❌ 加载模块 {file_path} 失败: {e}")
        return None


def run_script(script_name, script_path, description):
    """运行单个脚本"""
    print(f"\n{'='*60}")
    print(f"开始运行 {script_name}")
    print(f"功能：{description}")
    print(f"{'='*60}")

    start_time = time.time()

    try:
        # 加载并运行模块
        module = load_module_from_file(script_path, script_name.replace(".py", ""))
        if module is None:
            return False

        # 运行主函数
        if hasattr(module, "main"):
            module.main()
        else:
            print(f"❌ 脚本 {script_name} 没有main()函数")
            return False

        elapsed_time = time.time() - start_time
        print(f"\n✅ {script_name} 运行完成 (耗时: {elapsed_time:.2f}秒)")
        return True

    except Exception as e:
        elapsed_time = time.time() - start_time
        print(f"\n❌ {script_name} 运行失败 (耗时: {elapsed_time:.2f}秒)")
        print(f"错误信息: {e}")
        import traceback

        traceback.print_exc()
        return False


def main():
    """主函数"""
    print("体测成绩处理系统")
    print("=" * 60)
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # 检查输入文件是否存在
    input_file = "2025年09月23日-2025年09月24日 成绩.xlsx"
    student_info_file = "25.8.19学生信息.xls"

    if not os.path.exists(input_file):
        print(f"❌ 输入文件不存在: {input_file}")
        print("请确保Excel文件在当前目录下")
        return

    if not os.path.exists(student_info_file):
        print(f"❌ 学生信息文件不存在: {student_info_file}")
        print("请确保学生信息文件在当前目录下")
        return

    # 脚本配置：文件名、描述
    scripts = [
        {
            "name": "add_student_id.py",
            "description": "匹配学生信息并添加教育ID到成绩文件",
        },
        {"name": "whole_school.py", "description": "生成全校学生体质健康测试成绩总表"},
        {"name": "form_and_class.py", "description": "生成各年级和班级汇总表"},
        {"name": "class_ranking.py", "description": "生成班级排名统计表"},
        {"name": "transcript.py", "description": "生成个人成绩单"},
    ]

    # 检查所有脚本文件是否存在
    missing_scripts = []
    for script in scripts:
        if not os.path.exists(script["name"]):
            missing_scripts.append(script["name"])

    if missing_scripts:
        print("❌ 以下脚本文件不存在:")
        for script in missing_scripts:
            print(f"   - {script}")
        print("请确保所有脚本文件在当前目录下")
        return

    # 按顺序运行所有脚本
    success_count = 0
    total_start_time = time.time()

    for i, script in enumerate(scripts, 1):
        print(f"\n进度: {i}/{len(scripts)}")

        success = run_script(script["name"], script["name"], script["description"])

        if success:
            success_count += 1
        else:
            print(f"\n⚠️  脚本 {script['name']} 运行失败，但继续执行后续脚本...")
            # 可以选择在这里停止执行：
            # break

    # 总结
    total_elapsed_time = time.time() - total_start_time
    print(f"\n{'='*60}")
    print("运行总结")
    print(f"{'='*60}")
    print(f"总耗时: {total_elapsed_time:.2f}秒")
    print(f"成功运行: {success_count}/{len(scripts)} 个脚本")
    print(f"结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    if success_count == len(scripts):
        print("🎉 所有脚本运行成功！")
        print("\n生成的文件:")
        print("📁 25年9月体测成绩得分等级汇总/")
        print("   ├── 全校学生体质健康测试成绩总表.xlsx")
        print("   ├── 四年级/")
        print("   │   ├── 四年级统计汇总表.xlsx")
        print("   │   └── 四*班_班级统计汇总表.xlsx")
        print("   ├── 六年级/")
        print("   │   ├── 六年级统计汇总表.xlsx")
        print("   │   └── 六*班_班级统计汇总表.xlsx")
        print("   ├── 班级排名统计表.xlsx")
        print("   └── 成绩表/")
        print("       ├── 四年级/")
        print("       │   └── 四*班/")
        print("       │       └── 学号_学生姓名_成绩单.xlsx")
        print("       └── 六年级/")
        print("           └── 六*班/")
        print("               └── 学号_学生姓名_成绩单.xlsx")
        print(
            "\n📄 2025年09月23日-2025年09月24日 成绩_含学号.xlsx  # 包含学号的成绩文件"
        )
    else:
        print("⚠️  部分脚本运行失败，请检查错误信息")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    main()
