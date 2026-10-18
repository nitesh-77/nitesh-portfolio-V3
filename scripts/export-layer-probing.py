#!/usr/bin/env python3
"""Export the audited MI300X experiment for the portfolio, without ML dependencies."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil


PLOTS = (
    "layer_metrics.png", "seed_comparison.png", "deepseek_qwen_probe_comparison.png",
    "deepseek_qwen_residual_updates.png", "deepseek_qwen_generated_answers.png",
    "deepseek_qwen_seed_stability.png",
)
MODELS = (
    ("deepseek", "DeepSeek", "DeepSeek-R1-Distill-Qwen-7B", "metrics.json", "916b56a44061fd5cd7d6a8fb632557ed4f724f60"),
    ("qwen", "Qwen", "Qwen2-7B-Instruct", "metrics_qwen_seed43.json", "f2826a00ceef68f0f2b946d945ecc0477ce4450c"),
)


def export(source, output):
    provenance = {}

    def read(name):
        raw = (source / name).read_bytes()
        provenance[name] = hashlib.sha256(raw).hexdigest()
        return json.loads(raw)

    def metrics(name, revision):
        run = read(name)
        if run["model_revision"] != revision or sorted(map(int, run["layers"])) != list(range(28)):
            raise ValueError(f"Unexpected model revision or layers in {name}")
        if run["config"]["representation"] != "post_layer_final_rmsnorm":
            raise ValueError(f"Unexpected probe representation in {name}")
        for layer in run["layers"].values():
            if layer["tokens"] != 7676 or layer["examples"] != 64:
                raise ValueError(f"Evaluation sample changed in {name}")
            for key in ("agreement", "probe_accuracy", "teacher_accuracy", "kl"):
                value = layer[key]
                if not math.isfinite(value) or value < 0 or (key != "kl" and value > 1):
                    raise ValueError(f"Invalid {key} in {name}")
        return run

    def jump(run):
        values = [run["layers"][str(i)]["agreement"] for i in range(28)]
        start = max(range(27), key=lambda i: values[i + 1] - values[i])
        return {"from": start, "to": start + 1, "increase": values[start + 1] - values[start]}

    manifest = read("manifest.json")
    models = []
    seed_runs = {}
    for model_id, label, name, filename, revision in MODELS:
        run = metrics(filename, revision)
        for split in ("train_indices", "eval_indices"):
            if run[split] != manifest[split]:
                raise ValueError(f"Unmatched {split} in {filename}")
        if run["config"]["seed"] != 43 or len(run["train_indices"]) != 256:
            raise ValueError(f"Unexpected main run in {filename}")
        repeats = [run] + [metrics(f"metrics_{'qwen_' if model_id == 'qwen' else ''}seed{seed}.json", revision) for seed in (44, 45)]
        for repeat in repeats:
            if repeat["eval_indices"] != manifest["eval_indices"]:
                raise ValueError("Seed repeats changed evaluation rows")
            if jump(repeat)["from"] != 21:
                raise ValueError("Seed summary no longer supports the layer-22 finding")
        seed_runs[model_id] = repeats
        models.append({"id": model_id, "label": label, "name": name, "revision": revision,
            "layers": [{"layer": i, "agreement": run["layers"][str(i)]["agreement"],
                "probeAccuracy": run["layers"][str(i)]["probe_accuracy"],
                "teacherAccuracy": run["layers"][str(i)]["teacher_accuracy"],
                "klTeacherToProbe": run["layers"][str(i)]["kl"]} for i in range(28)],
            "seeds": [{"seed": r["config"]["seed"], "trainExamples": len(r["train_indices"]), "largestJump": jump(r),
                "finalAgreement": r["layers"]["27"]["agreement"]} for r in repeats]})
    for deepseek, qwen in zip(seed_runs["deepseek"], seed_runs["qwen"]):
        if deepseek["train_indices"] != qwen["train_indices"]:
            raise ValueError("Seed-paired training rows differ")
    rank = metrics("metrics_rank128_seed43.json", MODELS[0][4])
    if rank["train_indices"] != manifest["train_indices"] or rank["eval_indices"] != manifest["eval_indices"] or jump(rank)["from"] != 21:
        raise ValueError("Rank control no longer matches the main sample/finding")

    summary = read("generated_answer_summary.json")
    if summary["sample_size"] != 64 or [r["index"] for r in summary["rows"]] != manifest["eval_indices"]:
        raise ValueError("Generation sample does not match probes")
    for model_id, _, _, _, revision in MODELS:
        if summary[model_id]["revision"] != revision or sum(row[f"{model_id}_correct"] for row in summary["rows"]) != summary[model_id]["correct"]:
            raise ValueError("Generation counts or revisions disagree with audit rows")
    response = {"index": 1298}
    excerpts = {
        "deepseek": ("rescue_answers_deepseek.jsonl", "4. **Sum the total cents from all coins:**", "**Answer:** The total dollar amount in the jar is $31."),
        "qwen": ("generated_answers_qwen.jsonl", "- Total value = \\$8 + \\$9.50 + \\$6 + \\$7.50", "Therefore, the total dollar amount in the jar is \\$29."),
    }
    audit = next(r for r in summary["rows"] if r["index"] == 1298)
    for model_id, (filename, start, end) in excerpts.items():
        raw = (source / filename).read_bytes()
        provenance[filename] = hashlib.sha256(raw).hexdigest()
        row = next(r for r in map(json.loads, raw.splitlines()) if r["index"] == 1298)
        revision = next(model[4] for model in MODELS if model[0] == model_id)
        if row["model_revision"] != revision or row["gold"] != audit["gold"]:
            raise ValueError("Response model or gold answer disagrees with audit")
        if "question" in response and response["question"] != row["question"]:
            raise ValueError("Response pair uses different questions")
        text = row["response"]
        excerpt = text[text.index(start):text.index(end) + len(end)]
        if excerpt not in text or row["prediction"] != audit[f"{model_id}_prediction"] or row["correct"] != audit[f"{model_id}_correct"]:
            raise ValueError("Response excerpt disagrees with saved audit")
        response.update({"question": row["question"], "gold": row["gold"]})
        response[model_id] = {"excerpt": excerpt, "prediction": row["prediction"], "correct": row["correct"], "source": filename,
            "generatedTokens": row["generated_tokens"], "tokenCap": row["max_new_tokens"]}
    evidence = {"models": models, "sample": {"dataset": "GSM8K", "trainExamples": 256, "testExamples": 64, "tokens": 7676,
        "seed": 43, "epochs": 1, "maxLength": 512, "probeParameters": 545149440,
        "trainIndices": manifest["train_indices"], "evalIndices": manifest["eval_indices"]},
        "rankControl": {"rank": 128, "parameters": 20075008, "largestJump": jump(rank), "finalAgreement": rank["layers"]["27"]["agreement"]},
        "generation": {key: summary[key] for key in ("sample_size", "scoring", "deepseek", "qwen", "paired_outcomes", "qwen_minus_deepseek_question_bootstrap_95_interval")},
        "response": response, "provenance": {"sourceDirectory": "results/mi300x-bf16-256", "sha256": provenance}}
    data_dir = output / "src/data"
    media_dir = output / "public/media/layer-probing"
    data_dir.mkdir(parents=True, exist_ok=True)
    media_dir.mkdir(parents=True, exist_ok=True)
    for name in PLOTS:
        shutil.copyfile(source / name, media_dir / name)
        provenance[name] = hashlib.sha256((source / name).read_bytes()).hexdigest()
    serialized = json.dumps(evidence, separators=(",", ":"), ensure_ascii=False) + "\n"
    (data_dir / "layer-probing.json").write_text(serialized)
    (media_dir / "evidence.json").write_text(serialized)
    print(f"Exported 56 layer measurements, audited response pair, and {len(PLOTS)} unchanged plots.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path(__file__).resolve().parents[2] / "Layer-Probing/results/mi300x-bf16-256")
    parser.add_argument("--output-root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    export(args.source, args.output_root)
