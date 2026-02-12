/**
 * Observation Tools
 *
 * Extract information from UI state without side effects
 */

import {
  Tool,
  ToolResult,
  FindElementInput,
  FindElementOutput,
  GetElementStateInput,
  GetElementStateOutput,
  DetectPageTypeInput,
  DetectPageTypeOutput,
  CompareUIStatesInput,
  CompareUIStatesOutput,
} from './tool-contracts';
import { UIState, UIElement } from '../schemas/ui-state.schema';
import { ElementSelector } from '../schemas/procedure.schema';

/**
 * Tool: Find Element
 *
 * Locate UI elements using flexible selectors
 */
export class FindElementTool implements Tool<FindElementInput, FindElementOutput> {
  name = 'find_element';
  category = 'observation' as const;
  description = 'Find UI elements matching a selector';
  deterministic = true;

  async execute(input: FindElementInput): Promise<ToolResult<FindElementOutput>> {
    const startTime = Date.now();

    try {
      const matches = this.findMatches(input.ui_state, input.selector, input.options);

      return {
        success: true,
        output: {
          elements: matches.elements,
          match_confidence: matches.confidence,
          search_strategy_used: matches.strategy,
        },
        execution_time_ms: Date.now() - startTime,
        metadata: {
          elements_searched: input.ui_state.interpretation.elements.length,
          matches_found: matches.elements.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        execution_time_ms: Date.now() - startTime,
        metadata: {},
      };
    }
  }

  private findMatches(
    uiState: UIState,
    selector: ElementSelector,
    options?: { return_multiple?: boolean; min_confidence?: number }
  ): { elements: UIElement[]; confidence: number; strategy: string } {
    const minConfidence = options?.min_confidence ?? 0.7;
    let matches: Array<{ element: UIElement; score: number }> = [];
    let strategy = '';

    // Strategy 1: By label
    if (selector.by_label) {
      strategy = 'label';
      const threshold = selector.label_similarity_threshold ?? 0.8;
      const allowPartial = selector.allow_partial_match ?? false;

      matches = uiState.interpretation.elements
        .map((el) => ({
          element: el,
          score: this.calculateLabelSimilarity(el.label, selector.by_label!, allowPartial),
        }))
        .filter((m) => m.score >= threshold && m.element.confidence >= minConfidence);
    }

    // Strategy 2: By role
    if (selector.by_role && matches.length === 0) {
      strategy = 'role';
      matches = uiState.interpretation.elements
        .filter((el) => el.role === selector.by_role && el.confidence >= minConfidence)
        .map((el) => ({ element: el, score: 1.0 }));
    }

    // Strategy 3: By type
    if (selector.by_type && matches.length === 0) {
      strategy = 'type';
      matches = uiState.interpretation.elements
        .filter((el) => el.type === selector.by_type && el.confidence >= minConfidence)
        .map((el) => ({ element: el, score: 0.9 }));
    }

    // Strategy 4: By attributes
    if (selector.by_attributes && matches.length === 0) {
      strategy = 'attributes';
      matches = uiState.interpretation.elements
        .filter((el) => {
          return Object.entries(selector.by_attributes!).every(
            ([key, value]) => el.attributes[key] === value
          );
        })
        .filter((el) => el.confidence >= minConfidence)
        .map((el) => ({ element: el, score: 0.95 }));
    }

    // Sort by score
    matches.sort((a, b) => b.score - a.score);

    // Return single or multiple
    const elements = options?.return_multiple
      ? matches.map((m) => m.element)
      : matches.length > 0
      ? [matches[0].element]
      : [];

    const confidence = matches.length > 0 ? matches[0].score : 0;

    return { elements, confidence, strategy };
  }

  private calculateLabelSimilarity(actual: string, expected: string, allowPartial: boolean): number {
    const actualLower = actual.toLowerCase().trim();
    const expectedLower = expected.toLowerCase().trim();

    // Exact match
    if (actualLower === expectedLower) return 1.0;

    // Partial match
    if (allowPartial && actualLower.includes(expectedLower)) return 0.9;
    if (allowPartial && expectedLower.includes(actualLower)) return 0.85;

    // Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(actualLower, expectedLower);
    const maxLength = Math.max(actualLower.length, expectedLower.length);
    return 1 - distance / maxLength;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

/**
 * Tool: Get Element State
 */
export class GetElementStateTool implements Tool<GetElementStateInput, GetElementStateOutput> {
  name = 'get_element_state';
  category = 'observation' as const;
  description = 'Get current state of a UI element';
  deterministic = true;

  async execute(input: GetElementStateInput): Promise<ToolResult<GetElementStateOutput>> {
    const startTime = Date.now();

    try {
      const element = input.ui_state.interpretation.elements.find((el) => el.id === input.element_id);

      if (!element) {
        return {
          success: false,
          error: `Element not found: ${input.element_id}`,
          execution_time_ms: Date.now() - startTime,
          metadata: {},
        };
      }

      return {
        success: true,
        output: {
          element,
          state: element.state,
          confidence: element.confidence,
        },
        execution_time_ms: Date.now() - startTime,
        metadata: { element_id: input.element_id },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        execution_time_ms: Date.now() - startTime,
        metadata: {},
      };
    }
  }
}

/**
 * Tool: Detect Page Type
 */
export class DetectPageTypeTool implements Tool<DetectPageTypeInput, DetectPageTypeOutput> {
  name = 'detect_page_type';
  category = 'observation' as const;
  description = 'Detect current page type from UI state';
  deterministic = true;

  async execute(input: DetectPageTypeInput): Promise<ToolResult<DetectPageTypeOutput>> {
    const startTime = Date.now();

    try {
      const classification = input.ui_state.interpretation.page_classification;

      return {
        success: true,
        output: {
          page_type: classification.page_type,
          confidence: classification.confidence,
          features_detected: input.ui_state.interpretation.features.map((f) => f.feature_name),
        },
        execution_time_ms: Date.now() - startTime,
        metadata: {},
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        execution_time_ms: Date.now() - startTime,
        metadata: {},
      };
    }
  }
}

/**
 * Tool: Compare UI States
 */
export class CompareUIStatesTool implements Tool<CompareUIStatesInput, CompareUIStatesOutput> {
  name = 'compare_ui_states';
  category = 'observation' as const;
  description = 'Compare two UI states to detect changes';
  deterministic = true;

  async execute(input: CompareUIStatesInput): Promise<ToolResult<CompareUIStatesOutput>> {
    const startTime = Date.now();

    try {
      const changes = this.detectChanges(input.state_before, input.state_after, input.focus_area, input.element_id);

      const similarity = this.calculateSimilarity(input.state_before, input.state_after);

      return {
        success: true,
        output: {
          changed: changes.length > 0,
          changes,
          similarity_score: similarity,
        },
        execution_time_ms: Date.now() - startTime,
        metadata: {
          changes_detected: changes.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        execution_time_ms: Date.now() - startTime,
        metadata: {},
      };
    }
  }

  private detectChanges(
    before: UIState,
    after: UIState,
    focusArea?: string,
    elementId?: string
  ): Array<any> {
    const changes: Array<any> = [];

    // Page change
    if (before.interpretation.page_classification.page_type !== after.interpretation.page_classification.page_type) {
      changes.push({
        change_type: 'page_changed',
        description: `Page type changed from ${before.interpretation.page_classification.page_type} to ${after.interpretation.page_classification.page_type}`,
        before_value: before.interpretation.page_classification.page_type,
        after_value: after.interpretation.page_classification.page_type,
      });
    }

    // Element changes
    const beforeElements = new Map(before.interpretation.elements.map((el) => [el.id, el]));
    const afterElements = new Map(after.interpretation.elements.map((el) => [el.id, el]));

    // Elements added
    for (const [id, element] of afterElements) {
      if (!beforeElements.has(id)) {
        changes.push({
          change_type: 'element_added',
          description: `Element added: ${element.label}`,
          element_id: id,
          after_value: element,
        });
      }
    }

    // Elements removed
    for (const [id, element] of beforeElements) {
      if (!afterElements.has(id)) {
        changes.push({
          change_type: 'element_removed',
          description: `Element removed: ${element.label}`,
          element_id: id,
          before_value: element,
        });
      }
    }

    // Elements changed
    for (const [id, beforeElement] of beforeElements) {
      const afterElement = afterElements.get(id);
      if (afterElement) {
        const stateChanges = this.compareElementStates(beforeElement, afterElement);
        if (stateChanges.length > 0) {
          changes.push({
            change_type: 'element_state_changed',
            description: `Element state changed: ${beforeElement.label}`,
            element_id: id,
            before_value: beforeElement.state,
            after_value: afterElement.state,
          });
        }
      }
    }

    return changes;
  }

  private compareElementStates(before: UIElement, after: UIElement): string[] {
    const changes: string[] = [];

    if (before.state.visible !== after.state.visible) changes.push('visibility');
    if (before.state.enabled !== after.state.enabled) changes.push('enabled');
    if (before.state.focused !== after.state.focused) changes.push('focus');
    if (before.state.selected !== after.state.selected) changes.push('selected');
    if (before.state.checked !== after.state.checked) changes.push('checked');
    if (before.state.value !== after.state.value) changes.push('value');

    return changes;
  }

  private calculateSimilarity(before: UIState, after: UIState): number {
    const beforeIds = new Set(before.interpretation.elements.map((el) => el.id));
    const afterIds = new Set(after.interpretation.elements.map((el) => el.id));

    const intersection = new Set([...beforeIds].filter((id) => afterIds.has(id)));
    const union = new Set([...beforeIds, ...afterIds]);

    return intersection.size / union.size;
  }
}
