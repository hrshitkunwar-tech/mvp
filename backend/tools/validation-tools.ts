/**
 * Validation Tools
 *
 * Check conditions and constraints deterministically
 */

import {
  Tool,
  ToolResult,
  ValidatePreconditionInput,
  ValidatePreconditionOutput,
  ValidateSuccessConditionInput,
  ValidateSuccessConditionOutput,
} from './tool-contracts';
import { Precondition, SuccessCondition } from '../schemas/procedure.schema';
import { FindElementTool } from './observation-tools';

/**
 * Tool: Validate Precondition
 */
export class ValidatePreconditionTool implements Tool<ValidatePreconditionInput, ValidatePreconditionOutput> {
  name = 'validate_precondition';
  category = 'validation' as const;
  description = 'Validate that a precondition is satisfied';
  deterministic = true;

  private findElementTool = new FindElementTool();

  async execute(input: ValidatePreconditionInput): Promise<ToolResult<ValidatePreconditionOutput>> {
    const startTime = Date.now();

    try {
      const result = await this.checkPrecondition(input.precondition, input.ui_state);

      return {
        success: true,
        output: result,
        execution_time_ms: Date.now() - startTime,
        metadata: {
          precondition_type: input.precondition.type,
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

  private async checkPrecondition(
    precondition: Precondition,
    uiState: any
  ): Promise<ValidatePreconditionOutput> {
    switch (precondition.type) {
      case 'element_present':
        return await this.checkElementPresent(precondition, uiState);

      case 'element_state':
        return await this.checkElementState(precondition, uiState);

      case 'page_type':
        return this.checkPageType(precondition, uiState);

      case 'feature_visible':
        return this.checkFeatureVisible(precondition, uiState);

      default:
        return {
          satisfied: false,
          expected: precondition,
          actual: null,
          error_message: `Unknown precondition type: ${precondition.type}`,
        };
    }
  }

  private async checkElementPresent(precondition: Precondition, uiState: any): Promise<ValidatePreconditionOutput> {
    if (!precondition.element_selector) {
      return {
        satisfied: false,
        expected: 'element_selector required',
        actual: null,
        error_message: 'No element selector provided',
      };
    }

    const findResult = await this.findElementTool.execute({
      ui_state: uiState,
      selector: precondition.element_selector,
    });

    const found = findResult.success && findResult.output!.elements.length > 0;

    return {
      satisfied: found,
      expected: precondition.element_selector,
      actual: found ? findResult.output!.elements[0] : null,
      error_message: found ? undefined : 'Element not found',
    };
  }

  private async checkElementState(precondition: Precondition, uiState: any): Promise<ValidatePreconditionOutput> {
    if (!precondition.element_selector || !precondition.expected_state) {
      return {
        satisfied: false,
        expected: 'element_selector and expected_state required',
        actual: null,
        error_message: 'Missing required parameters',
      };
    }

    const findResult = await this.findElementTool.execute({
      ui_state: uiState,
      selector: precondition.element_selector,
    });

    if (!findResult.success || findResult.output!.elements.length === 0) {
      return {
        satisfied: false,
        expected: precondition.expected_state,
        actual: null,
        error_message: 'Element not found',
      };
    }

    const element = findResult.output!.elements[0];
    const actualState = element.state;
    const expectedState = precondition.expected_state;

    // Check each expected state property
    const stateMatches = Object.entries(expectedState).every(([key, value]) => {
      return actualState[key as keyof typeof actualState] === value;
    });

    return {
      satisfied: stateMatches,
      expected: expectedState,
      actual: actualState,
      error_message: stateMatches ? undefined : 'Element state does not match expected state',
    };
  }

  private checkPageType(precondition: Precondition, uiState: any): ValidatePreconditionOutput {
    const actual = uiState.interpretation.page_classification.page_type;
    const expected = precondition.expected_page_type;

    return {
      satisfied: actual === expected,
      expected,
      actual,
      error_message: actual === expected ? undefined : `Expected page type ${expected}, got ${actual}`,
    };
  }

  private checkFeatureVisible(precondition: Precondition, uiState: any): ValidatePreconditionOutput {
    const features = uiState.interpretation.features;
    const expectedFeature = precondition.expected_feature;

    const feature = features.find((f: any) => f.feature_name === expectedFeature);

    return {
      satisfied: !!feature,
      expected: expectedFeature,
      actual: feature || null,
      error_message: feature ? undefined : `Feature ${expectedFeature} not visible`,
    };
  }
}

/**
 * Tool: Validate Success Condition
 */
export class ValidateSuccessConditionTool
  implements Tool<ValidateSuccessConditionInput, ValidateSuccessConditionOutput>
{
  name = 'validate_success_condition';
  category = 'validation' as const;
  description = 'Validate that a success condition is met';
  deterministic = true;

  private findElementTool = new FindElementTool();

  async execute(input: ValidateSuccessConditionInput): Promise<ToolResult<ValidateSuccessConditionOutput>> {
    const startTime = Date.now();

    try {
      const result = await this.checkSuccessCondition(
        input.condition,
        input.ui_state,
        input.timeout_seconds
      );

      return {
        success: true,
        output: result,
        execution_time_ms: Date.now() - startTime,
        metadata: {
          condition_type: input.condition.type,
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

  private async checkSuccessCondition(
    condition: SuccessCondition,
    uiState: any,
    timeoutSeconds: number
  ): Promise<ValidateSuccessConditionOutput> {
    const startTime = Date.now();

    switch (condition.type) {
      case 'element_present':
        return await this.checkElementPresent(condition, uiState);

      case 'element_absent':
        return await this.checkElementAbsent(condition, uiState);

      case 'element_state':
        return await this.checkElementState(condition, uiState);

      case 'page_changed':
        return this.checkPageChanged(condition, uiState);

      default:
        return {
          satisfied: false,
          expected: condition,
          actual: null,
          timed_out: false,
          wait_time_seconds: (Date.now() - startTime) / 1000,
          error_message: `Unknown condition type: ${condition.type}`,
        };
    }
  }

  private async checkElementPresent(condition: SuccessCondition, uiState: any): Promise<ValidateSuccessConditionOutput> {
    if (!condition.element_selector) {
      return {
        satisfied: false,
        expected: 'element_selector required',
        actual: null,
        timed_out: false,
        wait_time_seconds: 0,
        error_message: 'No element selector provided',
      };
    }

    const findResult = await this.findElementTool.execute({
      ui_state: uiState,
      selector: condition.element_selector,
    });

    const found = findResult.success && findResult.output!.elements.length > 0;

    return {
      satisfied: found,
      expected: condition.element_selector,
      actual: found ? findResult.output!.elements[0] : null,
      timed_out: false,
      wait_time_seconds: 0,
      error_message: found ? undefined : 'Element not found',
    };
  }

  private async checkElementAbsent(condition: SuccessCondition, uiState: any): Promise<ValidateSuccessConditionOutput> {
    if (!condition.element_selector) {
      return {
        satisfied: false,
        expected: 'element_selector required',
        actual: null,
        timed_out: false,
        wait_time_seconds: 0,
        error_message: 'No element selector provided',
      };
    }

    const findResult = await this.findElementTool.execute({
      ui_state: uiState,
      selector: condition.element_selector,
    });

    const found = findResult.success && findResult.output!.elements.length > 0;

    return {
      satisfied: !found,
      expected: 'element absent',
      actual: found ? findResult.output!.elements[0] : 'element absent',
      timed_out: false,
      wait_time_seconds: 0,
      error_message: found ? 'Element should not be present' : undefined,
    };
  }

  private async checkElementState(condition: SuccessCondition, uiState: any): Promise<ValidateSuccessConditionOutput> {
    if (!condition.element_selector || !condition.expected_state) {
      return {
        satisfied: false,
        expected: 'element_selector and expected_state required',
        actual: null,
        timed_out: false,
        wait_time_seconds: 0,
        error_message: 'Missing required parameters',
      };
    }

    const findResult = await this.findElementTool.execute({
      ui_state: uiState,
      selector: condition.element_selector,
    });

    if (!findResult.success || findResult.output!.elements.length === 0) {
      return {
        satisfied: false,
        expected: condition.expected_state,
        actual: null,
        timed_out: false,
        wait_time_seconds: 0,
        error_message: 'Element not found',
      };
    }

    const element = findResult.output!.elements[0];
    const actualState = element.state;
    const expectedState = condition.expected_state;

    const stateMatches = Object.entries(expectedState).every(([key, value]) => {
      return actualState[key as keyof typeof actualState] === value;
    });

    return {
      satisfied: stateMatches,
      expected: expectedState,
      actual: actualState,
      timed_out: false,
      wait_time_seconds: 0,
      error_message: stateMatches ? undefined : 'Element state does not match',
    };
  }

  private checkPageChanged(condition: SuccessCondition, uiState: any): ValidateSuccessConditionOutput {
    const actualPageType = uiState.interpretation.page_classification.page_type;
    const actualUrl = uiState.viewport.url;

    let satisfied = false;
    let errorMessage: string | undefined;

    if (condition.expected_page_type) {
      satisfied = actualPageType === condition.expected_page_type;
      errorMessage = satisfied ? undefined : `Expected page type ${condition.expected_page_type}, got ${actualPageType}`;
    }

    if (condition.expected_url_pattern) {
      const regex = new RegExp(condition.expected_url_pattern);
      satisfied = regex.test(actualUrl);
      errorMessage = satisfied ? undefined : `URL does not match pattern ${condition.expected_url_pattern}`;
    }

    return {
      satisfied,
      expected: condition.expected_page_type || condition.expected_url_pattern,
      actual: { page_type: actualPageType, url: actualUrl },
      timed_out: false,
      wait_time_seconds: 0,
      error_message: errorMessage,
    };
  }
}
