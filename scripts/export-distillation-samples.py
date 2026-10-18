"""Export a small view of the two saved test examples. Requires NumPy.

Usage: python scripts/export-distillation-samples.py /path/to/mi300x-bf16-512
"""

import hashlib
import json
import sys
from pathlib import Path

import numpy as np


source = Path(sys.argv[1])
tensor_file = source / "activations.safetensors"
metadata = json.loads((source / "activation_metadata.json").read_text())
with tensor_file.open("rb") as stream:
    header_length = int.from_bytes(stream.read(8), "little")
    header = json.loads(stream.read(header_length))
    payload = stream.read()


def tensor(key):
    record = header[key]
    if record["dtype"] != "F16":
        raise ValueError(f"Expected saved float16 activations for {key}")
    start, end = record["data_offsets"]
    return np.frombuffer(payload[start:end], dtype="<f2").reshape(record["shape"])


samples = []
for item in metadata["items"]:
    if item["split"] != "test":
        continue
    target = tensor(item["target_key"])
    prediction = tensor(item["prediction_key"])
    channels = np.linspace(0, target.shape[1] - 1, 64, dtype=int)
    token_count = min(64, target.shape[0])
    target_view = target[:token_count, channels].T.astype(float)
    prediction_view = prediction[:token_count, channels].T.astype(float)
    if not np.isfinite(target_view).all() or not np.isfinite(prediction_view).all():
        raise ValueError("Non-finite activation in selected view")
    samples.append({
        "title": item["title"], "sourceId": item["source_id"],
        "sequenceTokens": target.shape[0], "tokenCount": token_count,
        "channels": channels.tolist(),
        "qwen": np.round(target_view.flatten(), 6).tolist(),
        "hyena": np.round(prediction_view.flatten(), 6).tolist(),
    })

data = {
    "checkpoint": "mi300x-bf16-512 (before tuning)",
    "sourceSha256": hashlib.sha256(tensor_file.read_bytes()).hexdigest(),
    "selection": "First 64 tokens; 64 evenly spaced channels across all 3584. Saved float16 values rounded to six decimals.",
    "samples": samples,
}
output = Path(__file__).resolve().parents[1] / "src/data/distillation-activations.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(data, separators=(",", ":")) + "\n")
print(f"Exported {len(samples)} saved test examples to {output}")
