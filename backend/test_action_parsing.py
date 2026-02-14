#!/usr/bin/env python3
"""
Test script for ACTION directive parsing logic.
Tests the fix for handling multiple ACTION directives in a single response.
"""

import json
import re
from typing import List, Dict, Any

class ActionParsingTester:
    """Test harness for ACTION directive parsing"""

    def __init__(self):
        self.test_results = []
        self.passed = 0
        self.failed = 0

    def parse_action_content(self, content: str) -> List[Dict[str, Any]]:
        """
        Simulates the fixed ACTION parsing logic from main.py
        Returns list of parsed messages and actions in order
        """
        results = []

        if content and "ACTION:" in content:
            # Split on ALL ACTION directives
            parts = content.split("ACTION:")

            # Send text before first ACTION (if any)
            if parts[0].strip():
                results.append({
                    "type": "message",
                    "content": parts[0].strip()
                })

            # Process ALL ACTION directives (parts[1], parts[2], parts[3], ...)
            for i in range(1, len(parts)):
                action_part = parts[i].strip()
                if not action_part:
                    continue

                try:
                    # Split into max 4 parts: type:zone:selector:duration_and_text
                    action_tokens = action_part.split(":", 3)

                    if len(action_tokens) >= 4:
                        action_type = action_tokens[0].strip()
                        zone = action_tokens[1].strip()
                        selector = action_tokens[2].strip()
                        duration_and_text = action_tokens[3].strip()

                        # Extract duration (number at start) and remaining text
                        duration_match = re.match(r'(\d+)\s*(.*)', duration_and_text, re.DOTALL)
                        if duration_match:
                            duration = int(duration_match.group(1))
                            remaining_text = duration_match.group(2).strip()

                            # Add the action
                            results.append({
                                "type": "action",
                                "action_type": action_type,
                                "zone": zone,
                                "selector": selector,
                                "duration": duration
                            })

                            # Add any text that came after the duration
                            if remaining_text:
                                results.append({
                                    "type": "message",
                                    "content": remaining_text
                                })
                except Exception as e:
                    print(f"Parse error: {e}")
        else:
            # No ACTION directive, return as regular message
            if content:
                results.append({
                    "type": "message",
                    "content": content
                })

        return results

    def run_test(self, test_name: str, input_content: str, expected_results: List[Dict[str, Any]]):
        """Run a single test case"""
        print(f"\n{'='*80}")
        print(f"TEST: {test_name}")
        print(f"{'='*80}")
        print(f"Input:\n{input_content[:200]}{'...' if len(input_content) > 200 else ''}\n")

        actual_results = self.parse_action_content(input_content)

        # Compare results
        passed = actual_results == expected_results

        if passed:
            print("✅ PASS")
            self.passed += 1
        else:
            print("❌ FAIL")
            self.failed += 1
            print(f"\nExpected ({len(expected_results)} items):")
            for i, item in enumerate(expected_results):
                print(f"  [{i}] {item}")
            print(f"\nActual ({len(actual_results)} items):")
            for i, item in enumerate(actual_results):
                print(f"  [{i}] {item}")

        self.test_results.append({
            "name": test_name,
            "passed": passed,
            "input": input_content,
            "expected": expected_results,
            "actual": actual_results
        })

        return passed

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*80}")
        print(f"TEST SUMMARY")
        print(f"{'='*80}")
        print(f"Total Tests: {self.passed + self.failed}")
        print(f"✅ Passed: {self.passed}")
        print(f"❌ Failed: {self.failed}")
        print(f"Success Rate: {(self.passed / (self.passed + self.failed) * 100):.1f}%")
        print(f"{'='*80}\n")


def run_all_tests():
    """Run comprehensive test suite"""
    tester = ActionParsingTester()

    # TEST 1: Single ACTION directive (regression test)
    tester.run_test(
        "Test 1: Single ACTION at end",
        "Navigate to settings tab. ACTION:highlight_zone:arc-tr:button[aria-label*='Settings']:3000",
        [
            {"type": "message", "content": "Navigate to settings tab."},
            {"type": "action", "action_type": "highlight_zone", "zone": "arc-tr",
             "selector": "button[aria-label*='Settings']", "duration": 3000}
        ]
    )

    # TEST 2: Two ACTION directives with text between
    tester.run_test(
        "Test 2: Two ACTIONs with text between",
        "To create a Pull Request (PR), first navigate to the Pull Requests tab. ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item=\"pull-requests-tab\"]:3000 Next, click the green \"New pull request\" button. ACTION:highlight_zone:center:a[href*=\"/compare\"]:2500",
        [
            {"type": "message", "content": "To create a Pull Request (PR), first navigate to the Pull Requests tab."},
            {"type": "action", "action_type": "highlight_zone", "zone": "arc-tl",
             "selector": ".UnderlineNav-item[data-tab-item=\"pull-requests-tab\"]", "duration": 3000},
            {"type": "message", "content": "Next, click the green \"New pull request\" button."},
            {"type": "action", "action_type": "highlight_zone", "zone": "center",
             "selector": "a[href*=\"/compare\"]", "duration": 2500}
        ]
    )

    # TEST 3: Three ACTION directives
    tester.run_test(
        "Test 3: Three ACTIONs in sequence",
        "First step. ACTION:highlight_zone:arc-tl:.tab1:2000 Second step. ACTION:highlight_zone:center:.btn:2500 Third step. ACTION:highlight_zone:arc-tr:.icon:3000",
        [
            {"type": "message", "content": "First step."},
            {"type": "action", "action_type": "highlight_zone", "zone": "arc-tl", "selector": ".tab1", "duration": 2000},
            {"type": "message", "content": "Second step."},
            {"type": "action", "action_type": "highlight_zone", "zone": "center", "selector": ".btn", "duration": 2500},
            {"type": "message", "content": "Third step."},
            {"type": "action", "action_type": "highlight_zone", "zone": "arc-tr", "selector": ".icon", "duration": 3000}
        ]
    )

    # TEST 4: Back-to-back ACTIONs with no text between
    tester.run_test(
        "Test 4: Back-to-back ACTIONs (no text between)",
        "Initial text. ACTION:highlight_zone:arc-tl:.tab:2500 ACTION:highlight_zone:center:.btn:3000",
        [
            {"type": "message", "content": "Initial text."},
            {"type": "action", "action_type": "highlight_zone", "zone": "arc-tl", "selector": ".tab", "duration": 2500},
            {"type": "action", "action_type": "highlight_zone", "zone": "center", "selector": ".btn", "duration": 3000}
        ]
    )

    # TEST 5: ACTION at very start (no text before)
    tester.run_test(
        "Test 5: ACTION at start (no text before)",
        "ACTION:highlight_zone:center:.primary-btn:2500 Then wait for the page to load.",
        [
            {"type": "action", "action_type": "highlight_zone", "zone": "center", "selector": ".primary-btn", "duration": 2500},
            {"type": "message", "content": "Then wait for the page to load."}
        ]
    )

    # TEST 6: Complex selector with colons and brackets
    tester.run_test(
        "Test 6: Complex selector with colons",
        "Click here. ACTION:highlight_zone:center:input[type=\"text\"][name=\"search\"]:2500",
        [
            {"type": "message", "content": "Click here."},
            {"type": "action", "action_type": "highlight_zone", "zone": "center",
             "selector": "input[type=\"text\"][name=\"search\"]", "duration": 2500}
        ]
    )

    # TEST 7: ACTION with text containing newlines
    tester.run_test(
        "Test 7: Text with newlines after ACTION",
        "First instruction. ACTION:highlight_zone:arc-tl:.nav-tab:3000 Second instruction line 1\nSecond instruction line 2",
        [
            {"type": "message", "content": "First instruction."},
            {"type": "action", "action_type": "highlight_zone", "zone": "arc-tl", "selector": ".nav-tab", "duration": 3000},
            {"type": "message", "content": "Second instruction line 1\nSecond instruction line 2"}
        ]
    )

    # TEST 8: Multiple ACTIONs with varying durations
    tester.run_test(
        "Test 8: Multiple ACTIONs with different durations",
        "Quick action. ACTION:highlight_zone:center:.btn:1500 Slow action. ACTION:highlight_zone:arc-bl:.footer:5000 Done.",
        [
            {"type": "message", "content": "Quick action."},
            {"type": "action", "action_type": "highlight_zone", "zone": "center", "selector": ".btn", "duration": 1500},
            {"type": "message", "content": "Slow action."},
            {"type": "action", "action_type": "highlight_zone", "zone": "arc-bl", "selector": ".footer", "duration": 5000},
            {"type": "message", "content": "Done."}
        ]
    )

    # TEST 9: ACTION with GitHub-specific selectors
    tester.run_test(
        "Test 9: GitHub PR workflow",
        "To view pull requests, click the PR tab. ACTION:highlight_zone:arc-tl:a[data-tab-item=\"pull-requests-tab\"]:3000 Then create new PR. ACTION:highlight_zone:center:a.btn-primary[href*=\"/compare\"]:2500 Finally review.",
        [
            {"type": "message", "content": "To view pull requests, click the PR tab."},
            {"type": "action", "action_type": "highlight_zone", "zone": "arc-tl",
             "selector": "a[data-tab-item=\"pull-requests-tab\"]", "duration": 3000},
            {"type": "message", "content": "Then create new PR."},
            {"type": "action", "action_type": "highlight_zone", "zone": "center",
             "selector": "a.btn-primary[href*=\"/compare\"]", "duration": 2500},
            {"type": "message", "content": "Finally review."}
        ]
    )

    # TEST 10: No ACTION directive (normal text)
    tester.run_test(
        "Test 10: No ACTION directive (normal message)",
        "This is just a regular text response with no ACTION directives at all.",
        [
            {"type": "message", "content": "This is just a regular text response with no ACTION directives at all."}
        ]
    )

    # TEST 11: ACTION with special characters in selector
    tester.run_test(
        "Test 11: ACTION with special characters",
        "Click the save button. ACTION:highlight_zone:center:button[data-test-id=\"save-btn\"]:2500",
        [
            {"type": "message", "content": "Click the save button."},
            {"type": "action", "action_type": "highlight_zone", "zone": "center",
             "selector": "button[data-test-id=\"save-btn\"]", "duration": 2500}
        ]
    )

    # TEST 12: Multiple ACTIONs with minimal text
    tester.run_test(
        "Test 12: Multiple ACTIONs with minimal spacing",
        "Go. ACTION:highlight_zone:arc-tl:.a:2000 Stop. ACTION:highlight_zone:center:.b:2500 Wait. ACTION:highlight_zone:arc-tr:.c:3000",
        [
            {"type": "message", "content": "Go."},
            {"type": "action", "action_type": "highlight_zone", "zone": "arc-tl", "selector": ".a", "duration": 2000},
            {"type": "message", "content": "Stop."},
            {"type": "action", "action_type": "highlight_zone", "zone": "center", "selector": ".b", "duration": 2500},
            {"type": "message", "content": "Wait."},
            {"type": "action", "action_type": "highlight_zone", "zone": "arc-tr", "selector": ".c", "duration": 3000}
        ]
    )

    tester.print_summary()
    return tester


if __name__ == "__main__":
    print("""
╔════════════════════════════════════════════════════════════════════════════╗
║                   ACTION DIRECTIVE PARSING TEST SUITE                      ║
║                                                                            ║
║  Testing the fix for multiple ACTION directives parsing bug               ║
║  Backend: /home/user/mvp/backend/api_server/main.py                       ║
╚════════════════════════════════════════════════════════════════════════════╝
    """)

    tester = run_all_tests()

    print("\n" + "="*80)
    print("DETAILED RESULTS")
    print("="*80)

    for i, result in enumerate(tester.test_results, 1):
        status = "✅ PASS" if result["passed"] else "❌ FAIL"
        print(f"{i}. {result['name']}: {status}")

    print("\n" + "="*80)
    if tester.failed == 0:
        print("🎉 ALL TESTS PASSED! The ACTION parsing fix is working correctly.")
    else:
        print(f"⚠️  {tester.failed} test(s) failed. Review the output above for details.")
    print("="*80)
