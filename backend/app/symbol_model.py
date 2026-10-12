from __future__ import annotations

import io
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from PIL import Image, ImageOps
from skimage.feature import hog


DEFAULT_MODEL_PATH = Path(__file__).resolve().parents[1] / "model_artifacts" / "hog_random_forest_model.pkl"


class SymbolModel:
    def __init__(self, model_path: Path = DEFAULT_MODEL_PATH) -> None:
        artifact = joblib.load(model_path)
        if not isinstance(artifact, dict) or "model" not in artifact:
            raise ValueError("The symbol model artifact must contain a 'model' estimator")

        self.classifier = artifact["model"]
        self.image_size = int(artifact.get("image_size", 96))
        self.classes = [str(value) for value in artifact.get("classes", self.classifier.classes_)]
        self.hog_parameters = dict(artifact.get("hog_parameters", {}))
        feature_count = int(getattr(self.classifier, "n_features_in_", 0))
        probe = self._features(Image.new("L", (self.image_size, self.image_size), color=0))
        if feature_count and probe.shape[1] != feature_count:
            raise ValueError(f"HOG feature count {probe.shape[1]} does not match model input {feature_count}")

    def _features(self, image: Image.Image) -> np.ndarray:
        grayscale = ImageOps.grayscale(image).resize((self.image_size, self.image_size), Image.Resampling.LANCZOS)
        pixels = np.asarray(grayscale, dtype=np.float32) / 255.0
        features = hog(pixels, feature_vector=True, **self.hog_parameters)
        return np.asarray(features, dtype=np.float32).reshape(1, -1)

    def predict(self, image_bytes: bytes, top_k: int = 3) -> dict[str, Any]:
        try:
            image = Image.open(io.BytesIO(image_bytes))
        except Exception as error:
            raise ValueError("The uploaded file is not a readable image") from error

        probabilities = self.classifier.predict_proba(self._features(image))[0]
        ranked_indexes = np.argsort(probabilities)[::-1][:top_k]
        candidates = [
            {"symbol": self.classes[int(index)], "confidence": round(float(probabilities[index]), 6)}
            for index in ranked_indexes
        ]
        return {"symbol": candidates[0]["symbol"], "confidence": candidates[0]["confidence"], "candidates": candidates}

    def metadata(self) -> dict[str, Any]:
        return {
            "image_size": self.image_size,
            "classes": self.classes,
            "n_estimators": int(getattr(self.classifier, "n_estimators", 0)),
            "hog_parameters": self.hog_parameters,
        }
