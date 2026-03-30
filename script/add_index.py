# python add_index.py -i frame_0001.ply -o frame_0001_with_index.ply
import os
import argparse
import numpy as np
from plyfile import PlyData, PlyElement


def add_index_to_ply(input_path, output_path=None, field_name="index", overwrite=False):
    """
    给单个 PLY 文件增加一个 index 字段。
    index 值为点在 vertex 表中的原始行号。
    """
    ply = PlyData.read(input_path)

    if 'vertex' not in ply:
        raise ValueError(f"{input_path} 中没有 vertex 元素")

    vertex = ply['vertex'].data
    names = vertex.dtype.names

    if field_name in names:
        if not overwrite:
            print(f"[跳过] {input_path} 已存在字段 '{field_name}'")
            return
        else:
            print(f"[覆盖] {input_path} 已存在字段 '{field_name}'，将重写")

    n = len(vertex)

    # 构造新的 dtype
    new_descr = []
    for name in names:
        new_descr.append((name, vertex.dtype.fields[name][0]))
    if field_name not in names:
        new_descr.append((field_name, np.uint32))

    new_vertex = np.empty(n, dtype=new_descr)

    # 拷贝原字段
    for name in names:
        new_vertex[name] = vertex[name]

    # 写 index
    new_vertex[field_name] = np.arange(n, dtype=np.uint32)

    # 构造新的 ply elements
    new_elements = []
    for elem in ply.elements:
        if elem.name == 'vertex':
            new_elements.append(PlyElement.describe(new_vertex, 'vertex'))
        else:
            new_elements.append(elem)

    new_ply = PlyData(new_elements, text=ply.text)

    if output_path is None:
        output_path = input_path

    os.makedirs(os.path.dirname(output_path), exist_ok=True) if os.path.dirname(output_path) else None
    new_ply.write(output_path)
    print(f"[完成] 已写入: {output_path}")


def process_directory(input_dir, output_dir, field_name="index", overwrite=False):
    """
    处理目录下所有 .ply 文件，输出到 output_dir
    """
    os.makedirs(output_dir, exist_ok=True)

    files = sorted([f for f in os.listdir(input_dir) if f.lower().endswith(".ply")])
    if not files:
        print(f"[提示] {input_dir} 下没有找到 .ply 文件")
        return

    for fname in files:
        in_path = os.path.join(input_dir, fname)
        out_path = os.path.join(output_dir, fname)
        try:
            add_index_to_ply(
                input_path=in_path,
                output_path=out_path,
                field_name=field_name,
                overwrite=overwrite
            )
        except Exception as e:
            print(f"[失败] {fname}: {e}")


def main():
    parser = argparse.ArgumentParser(description="给 PLY 点云增加 index 字段")
    parser.add_argument("-i", "--input", required=True, help="输入 PLY 文件或目录")
    parser.add_argument("-o", "--output", required=False, help="输出 PLY 文件或目录")
    parser.add_argument("--field", default="index", help="字段名，默认 index")
    parser.add_argument("--overwrite", action="store_true", help="若字段已存在则覆盖")
    args = parser.parse_args()

    if os.path.isfile(args.input):
        out_path = args.output if args.output else args.input
        add_index_to_ply(
            input_path=args.input,
            output_path=out_path,
            field_name=args.field,
            overwrite=args.overwrite
        )
    elif os.path.isdir(args.input):
        if not args.output:
            raise ValueError("输入为目录时，必须指定 --output 输出目录")
        process_directory(
            input_dir=args.input,
            output_dir=args.output,
            field_name=args.field,
            overwrite=args.overwrite
        )
    else:
        raise ValueError(f"输入路径不存在: {args.input}")


if __name__ == "__main__":
    main()