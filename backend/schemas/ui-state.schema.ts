/**
 * UI State Schema
 *
 * Output from Vision Interpretation Layer
 * Pure perception - no reasoning or decisions
 */

export interface UIState {
  session_id: string;
  timestamp: number;
  viewport: ViewportMetadata;
  interpretation: UIInterpretation;
  raw_screenshot_url: string;
}

export interface ViewportMetadata {
  width: number;
  height: number;
  device_pixel_ratio: number;
  url: string;
  title: string;
  domain: string;
}

export interface UIInterpretation {
  page_classification: PageClassification;
  elements: UIElement[];
  features: VisibleFeature[];
  interpretation_confidence: number;
  model_version: string;
}

export interface PageClassification {
  page_type:
    | 'login'
    | 'dashboard'
    | 'form'
    | 'list'
    | 'detail'
    | 'settings'
    | 'modal'
    | 'unknown';
  product_area?: string; // e.g., "billing", "user-management"
  confidence: number;
}

export interface UIElement {
  id: string; // stable identifier for this element
  type: UIElementType;
  label: string; // visible text or aria-label
  role: string; // ARIA role or inferred role
  bounding_box: BoundingBox;
  state: ElementState;
  confidence: number;
  parent_id?: string;
  attributes: Record<string, string>; // key attributes from vision model
}

export type UIElementType =
  | 'button'
  | 'input'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'link'
  | 'text'
  | 'heading'
  | 'image'
  | 'icon'
  | 'menu'
  | 'tab'
  | 'modal'
  | 'notification'
  | 'unknown';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  center_x: number;
  center_y: number;
}

export interface ElementState {
  visible: boolean;
  enabled: boolean;
  focused: boolean;
  selected?: boolean;
  checked?: boolean;
  value?: string;
  error?: boolean;
}

export interface VisibleFeature {
  feature_id: string;
  feature_name: string;
  presence_confidence: number;
  location?: BoundingBox;
}

/**
 * Vision Model Request
 */
export interface VisionInterpretationRequest {
  screenshot_url: string;
  viewport: ViewportMetadata;
  context?: {
    previous_state?: UIState;
    expected_elements?: string[]; // hints for better accuracy
  };
}

/**
 * Vision Model Response
 */
export interface VisionInterpretationResponse {
  interpretation: UIInterpretation;
  processing_time_ms: number;
  model_version: string;
}
