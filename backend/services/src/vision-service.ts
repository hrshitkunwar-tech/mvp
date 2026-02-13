/**
 * Vision Interpretation Service
 *
 * Wrapper around vision model APIs (GPT-4V, Claude Vision, etc.)
 * Converts screenshots → structured UI state
 */

import {
  VisionInterpretationRequest,
  VisionInterpretationResponse,
  UIInterpretation,
  UIElement,
  PageClassification,
  VisibleFeature,
} from '../schemas/ui-state.schema';

export class VisionInterpretationService {
  private apiKey: string;
  private modelEndpoint: string;
  private modelVersion: string;

  constructor(config: { apiKey: string; modelEndpoint: string; modelVersion: string }) {
    this.apiKey = config.apiKey;
    this.modelEndpoint = config.modelEndpoint;
    this.modelVersion = config.modelVersion;
  }

  /**
   * Main interpretation method
   */
  async interpret(request: VisionInterpretationRequest): Promise<VisionInterpretationResponse> {
    const startTime = Date.now();

    try {
      const prompt = this.buildInterpretationPrompt(request);

      const visionModelResponse = await this.callVisionModel({
        image_url: request.screenshot_url,
        prompt,
        context: request.context,
      });

      const interpretation = this.parseVisionModelResponse(visionModelResponse);

      return {
        interpretation,
        processing_time_ms: Date.now() - startTime,
        model_version: this.modelVersion,
      };
    } catch (error) {
      console.error('Vision interpretation failed:', error);
      throw new Error(`Vision interpretation failed: ${error}`);
    }
  }

  /**
   * Build structured prompt for vision model
   */
  private buildInterpretationPrompt(request: VisionInterpretationRequest): string {
    const basePrompt = `You are a UI perception system. Analyze this screenshot and extract structured UI state.

Your task is PERCEPTION ONLY - no reasoning, no recommendations, no decisions.

Extract the following information:

1. PAGE CLASSIFICATION
   - Identify the page type: login, dashboard, form, list, detail, settings, modal, or unknown
   - Identify the product area if recognizable (e.g., "billing", "user-management")
   - Provide confidence score (0-1)

2. UI ELEMENTS
   For each interactive or important UI element, extract:
   - Unique ID (stable identifier)
   - Type (button, input, checkbox, radio, select, link, text, heading, image, icon, menu, tab, modal, notification)
   - Label (visible text or aria-label)
   - Role (ARIA role or inferred role)
   - Bounding box (x, y, width, height in pixels)
   - State (visible, enabled, focused, selected, checked, value, error)
   - Confidence score (0-1)
   - Parent ID if nested
   - Key HTML attributes

3. VISIBLE FEATURES
   - Feature flags or product features that are visible
   - Each with ID, name, confidence, and optional location

4. INTERPRETATION CONFIDENCE
   - Overall confidence in this interpretation (0-1)

CRITICAL RULES:
- Return ONLY factual observations from the image
- Do NOT infer user intent
- Do NOT recommend actions
- Do NOT make decisions
- Use confidence scores to indicate uncertainty
- Stable element IDs should be based on label + role + position

Return your analysis as a JSON object matching this TypeScript interface:

interface UIInterpretation {
  page_classification: {
    page_type: string;
    product_area?: string;
    confidence: number;
  };
  elements: Array<{
    id: string;
    type: string;
    label: string;
    role: string;
    bounding_box: { x: number; y: number; width: number; height: number; center_x: number; center_y: number };
    state: {
      visible: boolean;
      enabled: boolean;
      focused: boolean;
      selected?: boolean;
      checked?: boolean;
      value?: string;
      error?: boolean;
    };
    confidence: number;
    parent_id?: string;
    attributes: Record<string, string>;
  }>;
  features: Array<{
    feature_id: string;
    feature_name: string;
    presence_confidence: number;
    location?: { x: number; y: number; width: number; height: number; center_x: number; center_y: number };
  }>;
  interpretation_confidence: number;
}`;

    // Add context hints if available
    if (request.context?.expected_elements && request.context.expected_elements.length > 0) {
      return `${basePrompt}\n\nHINTS: Look carefully for these elements: ${request.context.expected_elements.join(', ')}`;
    }

    return basePrompt;
  }

  /**
   * Call vision model API
   */
  private async callVisionModel(params: {
    image_url: string;
    prompt: string;
    context?: any;
  }): Promise<any> {
    // Example using OpenAI GPT-4V API
    const response = await fetch(this.modelEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelVersion,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: params.prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: params.image_url,
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0, // Deterministic
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Parse vision model response into structured format
   */
  private parseVisionModelResponse(response: string): UIInterpretation {
    try {
      const parsed = JSON.parse(response);

      // Validate and normalize the response
      return {
        page_classification: this.normalizePageClassification(parsed.page_classification),
        elements: parsed.elements.map((el: any) => this.normalizeElement(el)),
        features: parsed.features.map((feat: any) => this.normalizeFeature(feat)),
        interpretation_confidence: parsed.interpretation_confidence || 0.8,
        model_version: this.modelVersion,
      };
    } catch (error) {
      console.error('Failed to parse vision model response:', error);
      throw new Error('Invalid vision model response format');
    }
  }

  private normalizePageClassification(classification: any): PageClassification {
    return {
      page_type: classification.page_type || 'unknown',
      product_area: classification.product_area,
      confidence: classification.confidence || 0.5,
    };
  }

  private normalizeElement(element: any): UIElement {
    const bbox = element.bounding_box || {};

    return {
      id: element.id || this.generateElementId(element),
      type: element.type || 'unknown',
      label: element.label || '',
      role: element.role || 'unknown',
      bounding_box: {
        x: bbox.x || 0,
        y: bbox.y || 0,
        width: bbox.width || 0,
        height: bbox.height || 0,
        center_x: bbox.center_x || bbox.x + bbox.width / 2,
        center_y: bbox.center_y || bbox.y + bbox.height / 2,
      },
      state: {
        visible: element.state?.visible ?? true,
        enabled: element.state?.enabled ?? true,
        focused: element.state?.focused ?? false,
        selected: element.state?.selected,
        checked: element.state?.checked,
        value: element.state?.value,
        error: element.state?.error,
      },
      confidence: element.confidence || 0.8,
      parent_id: element.parent_id,
      attributes: element.attributes || {},
    };
  }

  private normalizeFeature(feature: any): VisibleFeature {
    return {
      feature_id: feature.feature_id || feature.feature_name.toLowerCase().replace(/\s/g, '_'),
      feature_name: feature.feature_name,
      presence_confidence: feature.presence_confidence || 0.8,
      location: feature.location,
    };
  }

  /**
   * Generate stable element ID from element properties
   */
  private generateElementId(element: any): string {
    const parts = [
      element.type || 'unknown',
      element.label || '',
      element.role || '',
      Math.floor(element.bounding_box?.x || 0),
      Math.floor(element.bounding_box?.y || 0),
    ];

    return parts
      .join('_')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_');
  }
}

/**
 * Factory function to create vision service instance
 */
export function createVisionService(provider: 'openai' | 'anthropic' | 'google'): VisionInterpretationService {
  switch (provider) {
    case 'openai':
      return new VisionInterpretationService({
        apiKey: process.env.OPENAI_API_KEY!,
        modelEndpoint: 'https://api.openai.com/v1/chat/completions',
        modelVersion: 'gpt-4-vision-preview',
      });

    case 'anthropic':
      return new VisionInterpretationService({
        apiKey: process.env.ANTHROPIC_API_KEY!,
        modelEndpoint: 'https://api.anthropic.com/v1/messages',
        modelVersion: 'claude-3-opus-20240229',
      });

    case 'google':
      return new VisionInterpretationService({
        apiKey: process.env.GOOGLE_API_KEY!,
        modelEndpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent',
        modelVersion: 'gemini-pro-vision',
      });

    default:
      throw new Error(`Unsupported vision provider: ${provider}`);
  }
}
