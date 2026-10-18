"""Render the saved MI300X training curve as a looping portfolio preview."""

import argparse
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.animation import FFMpegWriter
from matplotlib.patches import Rectangle


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("metrics", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    history = json.loads(args.metrics.read_text())["training_history"]
    steps = [int(row["step"]) for row in history]
    train = [float(row["train_mse"]) for row in history]
    rolling = [
        sum(train[max(0, index - 49):index + 1]) / min(index + 1, 50)
        for index in range(len(train))
    ]
    validation = [row for row in history if "validation_mse" in row]
    figure, axis = plt.subplots(figsize=(8, 4.5), constrained_layout=True)
    raw, = axis.plot(steps, train, label="Train minibatch MSE", alpha=0.18, linewidth=0.8)
    smooth, = axis.plot(
        steps, rolling, label="Train MSE (50-step rolling mean)",
        color="#4c78a8", linewidth=1.8,
    )
    val, = axis.plot(
        [row["step"] for row in validation],
        [row["validation_mse"] for row in validation],
        marker="o", label="Validation MSE", color="#f58518",
    )
    checkpoint = axis.axvline(
        3200, linestyle="--", color="#54a24b",
        label="Selected checkpoint (step 3200)",
    )
    axis.set_yscale("log")
    axis.set_xlabel("Optimizer step")
    axis.set_ylabel("Mean squared error (log scale)")
    axis.set_title("Hyena fit on captured Qwen attention outputs (BF16 teacher)")
    axis.legend()
    axis.grid(alpha=0.25)
    xmin, xmax = axis.get_xlim()
    reveal = Rectangle((xmin, 0), xmax - xmin, 1, transform=axis.get_xaxis_transform())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    writer = FFMpegWriter(
        fps=24, codec="libx264",
        extra_args=[
            "-vf", "scale=1120:630,pad=1200:630:(ow-iw)/2:(oh-ih)/2:black",
            "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        ],
    )
    with writer.saving(figure, str(args.output), dpi=160):
        for frame in range(216):
            progress = min(frame / 167, 1)
            end = steps[0] + progress * (steps[-1] - steps[0])
            reveal.set_width(end - xmin if progress < 1 else xmax - xmin)
            for artist in (raw, smooth, val):
                artist.set_clip_path(reveal)
            checkpoint.set_visible(progress == 1)
            writer.grab_frame()
    plt.close(figure)


if __name__ == "__main__":
    main()
