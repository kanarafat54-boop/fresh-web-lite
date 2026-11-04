"""Fresh Astra Vision v0.1: from-scratch synthetic shape and colour perception CNN."""
from __future__ import annotations
import torch
from torch import nn

SHAPES = ("circle", "square", "triangle")
COLOURS = ("blue", "green", "red", "yellow")
MODEL_ID = "fresh-astra-vision-0.1"
IMAGE_SIZE = 32

class FreshAstraVisionCNN(nn.Module):
    """Small two-head CNN. Random initialization only; no imported model weights."""
    def __init__(self) -> None:
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Conv2d(3, 16, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(16, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1)), nn.Flatten(),
        )
        self.shared = nn.Sequential(nn.Linear(64, 64), nn.ReLU())
        self.shape_head = nn.Linear(64, len(SHAPES))
        self.colour_head = nn.Linear(64, len(COLOURS))

    def forward(self, images: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        features = self.shared(self.encoder(images))
        return self.shape_head(features), self.colour_head(features)

def image_to_tensor(image) -> torch.Tensor:
    from PIL import Image
    import numpy as np
    if not isinstance(image, Image.Image):
        raise TypeError("Expected a PIL image")
    resized = image.convert("RGB").resize((IMAGE_SIZE, IMAGE_SIZE), Image.Resampling.BILINEAR)
    array = np.asarray(resized, dtype=np.float32) / 255.0
    return torch.from_numpy(array).permute(2, 0, 1).contiguous()
