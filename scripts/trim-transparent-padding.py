#!/usr/bin/env python3
"""Trim transparent borders in place from PNG/WebP files (requires Pillow).

Examples:
    python scripts/trim-transparent-padding.py icon.png
    python scripts/trim-transparent-padding.py first.png second.webp
    python scripts/trim-transparent-padding.py "public/map/icons/**/*.webp"

Install Pillow with: python -m pip install Pillow
"""

import argparse
import glob
import os
from pathlib import Path
import sys
import tempfile

from PIL import Image


def trim(path: Path, dry_run: bool = False) -> bool:
    with Image.open(path) as image:
        if image.format not in {"PNG", "WEBP"}:
            raise ValueError("only PNG and WebP files are supported")
        rgba = image.convert("RGBA")
        # Only fully transparent pixels are padding; keep antialiased edges.
        bounds = rgba.getchannel("A").getbbox()
        if bounds is None or bounds == (0, 0, image.width, image.height):
            return False
        cropped = rgba.crop(bounds)
        if not dry_run:
            # Finish encoding before replacing the original, including on Windows.
            fd, temporary = tempfile.mkstemp(dir=path.parent, suffix=path.suffix)
            os.close(fd)
            try:
                options = (
                    {"lossless": True, "exact": True}
                    if image.format == "WEBP"
                    else {}
                )
                cropped.save(temporary, format=image.format, **options)
            except BaseException:
                Path(temporary).unlink(missing_ok=True)
                raise
        old_size, new_size = image.size, cropped.size
    if not dry_run:
        try:
            os.replace(temporary, path)
        finally:
            Path(temporary).unlink(missing_ok=True)
    action = "Would trim" if dry_run else "Trimmed"
    print(f"{action} {path}: {old_size} -> {new_size}")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "files", nargs="+", help="file paths or quoted glob patterns (supports **)"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="report changes without writing files"
    )
    args = parser.parse_args()
    paths: set[Path] = set()
    errors = 0
    for pattern in args.files:
        literal = Path(pattern)
        matches = (
            [literal]
            if literal.is_file()
            else [Path(p) for p in glob.glob(pattern, recursive=True)]
        )
        if not matches:
            print(f"No files matched: {pattern}", file=sys.stderr)
            errors += 1
        paths.update(path.resolve() for path in matches if path.is_file())
    changed = 0
    for path in sorted(paths):
        try:
            changed += trim(path, args.dry_run)
        except (OSError, ValueError) as error:
            print(f"Could not trim {path}: {error}", file=sys.stderr)
            errors += 1
    action = "would change" if args.dry_run else "trimmed"
    print(f"{len(paths)} files checked, {changed} {action}, {errors} errors.")
    return int(errors > 0)


if __name__ == "__main__":
    sys.exit(main())
