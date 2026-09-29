import os
import sys
import subprocess
import ctypes

# === AUTO-INSTALL PILLOW IF NEEDED ===
try:
    from PIL import Image
except ImportError:
    ctypes.windll.user32.MessageBoxW(
        0,
        "Pillow not found. Installing it for you now...",
        "Installing Dependencies",
        0
    )

    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow"])

    try:
        from PIL import Image
    except ImportError:
        ctypes.windll.user32.MessageBoxW(
            0,
            "Failed to install Pillow. Please install it manually.",
            "Fatal Error",
            0
        )
        sys.exit(1)

# === CONFIG ===
MAX_IMG_HEIGHT = 8000
MAX_IMG_WIDTH = 8000
FILE_SIZE_LIMIT = 8_000_000
OUTPUT_FOLDER = "output"

SUPPORTED_EXTENSIONS = (
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".bmp",
    ".tiff",
    ".tif"
)

# === MESSAGE BOX ===
def Mbox(title, text, style=0):
    ctypes.windll.user32.MessageBoxW(0, text, title, style)


# === SAVE FUNCTION ===
def save_png_under_limit(original_image, base_filename):
    output_path = os.path.join(OUTPUT_FOLDER, f"{base_filename}.png")

    temp_image = original_image.copy()
    temp_image.save(output_path, "PNG", optimize=True)

    while os.path.getsize(output_path) > FILE_SIZE_LIMIT:
        width, height = temp_image.size

        if width < 100 or height < 100:
            raise Exception(
                "Could not get image under the file size limit without making it extremely small."
            )

        new_size = (
            max(1, int(width * 0.9)),
            max(1, int(height * 0.9))
        )

        temp_image = temp_image.resize(new_size, Image.Resampling.LANCZOS)
        temp_image.save(output_path, "PNG", optimize=True)


# === RESIZE FUNCTION ===
def resize_to_max_dimensions(image):
    width, height = image.size

    # This is the important fix:
    # min(1, ...) prevents small images from being enlarged.
    ratio = min(
        1,
        MAX_IMG_WIDTH / width,
        MAX_IMG_HEIGHT / height
    )

    new_size = (
        int(width * ratio),
        int(height * ratio)
    )

    if new_size == image.size:
        return image.copy()

    return image.resize(new_size, Image.Resampling.LANCZOS)


# === MAIN FUNCTION ===
def main():
    try:
        abspath = os.path.abspath(sys.argv[0])
        dname = os.path.dirname(abspath)
        os.chdir(dname)

        all_files = [
            f for f in os.listdir(".")
            if os.path.isfile(f)
            and f.lower().endswith(SUPPORTED_EXTENSIONS)
        ]

        if not all_files:
            Mbox(
                "No Images Found",
                "Put some images in the same folder as this script.",
                0
            )
            return

        os.makedirs(OUTPUT_FOLDER, exist_ok=True)

        for filename in all_files:
            try:
                with Image.open(filename) as im:
                    im = im.convert("RGB")
                    resized_im = resize_to_max_dimensions(im)

                    base_name = os.path.splitext(os.path.basename(filename))[0]
                    save_png_under_limit(resized_im, base_name)

            except Exception as e:
                Mbox(
                    "Image Error",
                    f"Could not process {filename}:\n{str(e)}",
                    2
                )

        subprocess.Popen(f'explorer "{os.path.abspath(OUTPUT_FOLDER)}"')

        Mbox(
            "All Done",
            "Conversion complete. Your files can be found in the output folder.",
            0
        )

    except Exception as e:
        Mbox(
            "Script Error",
            f"Something exploded:\n{str(e)}",
            2
        )


# === ENTRY POINT ===
if __name__ == "__main__":
    main()