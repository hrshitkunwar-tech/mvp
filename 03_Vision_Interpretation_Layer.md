# Vision Interpretation Layer

## Purpose
Convert raw screenshots into structured, machine-readable UI state.

## Inputs
- Screenshot images
- Viewport metadata
- Session ID
- Timestamp

## Outputs
- UI elements (type, label, bounding box, confidence)
- Page classification
- Visible feature flags

## Guarantees
- Stateless
- Confidence-scored
- No reasoning or decision-making