#!/bin/bash
# Visual Overlay Test Suite
# Tests the Navigator API with various queries to verify ACTION directives are sent correctly

API_URL="http://127.0.0.1:8000/chat"
RESULTS_FILE="/tmp/navigator-test-results.md"

echo "🧪 Navigator Visual Overlay Test Suite"
echo "========================================"
echo ""
echo "Testing API: $API_URL"
echo "Results: $RESULTS_FILE"
echo ""

# Clear previous results
cat > "$RESULTS_FILE" << 'EOF'
# Navigator Visual Overlay Test Results

**Test Date:** $(date)
**API:** http://127.0.0.1:8000

---

EOF

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test a query
test_query() {
    local query="$1"
    local tool="$2"
    local url="$3"
    local expected_actions="$4"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test #$TOTAL_TESTS: $query"
    echo "Tool: $tool"
    echo "URL: $url"
    echo "Expected actions: $expected_actions"
    echo ""

    # Make request
    RESPONSE=$(timeout 10 curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"$query\",\"tool_name\":\"$tool\",\"url\":\"$url\",\"context_text\":\"\"}" 2>&1)

    if [ $? -ne 0 ]; then
        echo "❌ FAIL: Request timeout or error"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "## Test #$TOTAL_TESTS: $query ❌" >> "$RESULTS_FILE"
        echo "**Tool:** $tool" >> "$RESULTS_FILE"
        echo "**Error:** Request failed or timeout" >> "$RESULTS_FILE"
        echo "" >> "$RESULTS_FILE"
        return 1
    fi

    # Check if response contains actions
    ACTION_COUNT=$(echo "$RESPONSE" | grep -c '"action"')

    echo "Response length: $(echo "$RESPONSE" | wc -c) bytes"
    echo "Action directives found: $ACTION_COUNT"

    if [ $ACTION_COUNT -ge $expected_actions ]; then
        echo "✅ PASS: Found $ACTION_COUNT action(s) (expected ≥ $expected_actions)"
        PASSED_TESTS=$((PASSED_TESTS + 1))

        # Extract actions
        ACTIONS=$(echo "$RESPONSE" | grep '"action"' | head -5)

        echo "" >> "$RESULTS_FILE"
        echo "## Test #$TOTAL_TESTS: $query ✅" >> "$RESULTS_FILE"
        echo "**Tool:** $tool" >> "$RESULTS_FILE"
        echo "**Actions Found:** $ACTION_COUNT" >> "$RESULTS_FILE"
        echo "\`\`\`json" >> "$RESULTS_FILE"
        echo "$ACTIONS" >> "$RESULTS_FILE"
        echo "\`\`\`" >> "$RESULTS_FILE"
        echo "" >> "$RESULTS_FILE"
    else
        echo "❌ FAIL: Expected ≥ $expected_actions actions, found $ACTION_COUNT"
        FAILED_TESTS=$((FAILED_TESTS + 1))

        echo "" >> "$RESULTS_FILE"
        echo "## Test #$TOTAL_TESTS: $query ❌" >> "$RESULTS_FILE"
        echo "**Tool:** $tool" >> "$RESULTS_FILE"
        echo "**Expected:** ≥ $expected_actions actions" >> "$RESULTS_FILE"
        echo "**Found:** $ACTION_COUNT actions" >> "$RESULTS_FILE"
        echo "" >> "$RESULTS_FILE"
    fi

    # Show sample of first action
    if [ $ACTION_COUNT -gt 0 ]; then
        FIRST_ACTION=$(echo "$RESPONSE" | grep '"action"' | head -1)
        echo "First action: $FIRST_ACTION"
    fi

    echo ""
}

# ── GitHub Tests ─────────────────────────────────────────────────────────────

echo "📦 GitHub Tests"
echo "───────────────"

test_query "how to create PR?" "GitHub" "https://github.com/test/repo" 2
test_query "create pull request" "GitHub" "https://github.com/test/repo" 2
test_query "open pull requests" "GitHub" "https://github.com/test/repo" 1
test_query "view PRs" "GitHub" "https://github.com/test/repo" 1
test_query "create issue" "GitHub" "https://github.com/test/repo" 1
test_query "open issues" "GitHub" "https://github.com/test/repo" 1
test_query "create branch" "GitHub" "https://github.com/test/repo" 0
test_query "merge PR" "GitHub" "https://github.com/test/repo" 0

# ── Linear Tests ─────────────────────────────────────────────────────────────

echo "📋 Linear Tests"
echo "───────────────"

test_query "create issue" "Linear" "https://linear.app/team/issues" 1
test_query "open backlog" "Linear" "https://linear.app/team/issues" 1
test_query "view board" "Linear" "https://linear.app/team/issues" 1
test_query "add task" "Linear" "https://linear.app/team/issues" 1

# ── Figma Tests ──────────────────────────────────────────────────────────────

echo "🎨 Figma Tests"
echo "──────────────"

test_query "open file" "Figma" "https://figma.com/files" 1
test_query "view comments" "Figma" "https://figma.com/file/abc" 1
test_query "share file" "Figma" "https://figma.com/file/abc" 1

# ── New Relic Tests ──────────────────────────────────────────────────────────

echo "📊 New Relic Tests"
echo "──────────────────"

test_query "view metrics" "New Relic" "https://one.newrelic.com" 1
test_query "open dashboard" "New Relic" "https://one.newrelic.com" 1

# ── Summary ──────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Tests:  $TOTAL_TESTS"
echo "✅ Passed:    $PASSED_TESTS"
echo "❌ Failed:    $FAILED_TESTS"
echo "Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
echo ""
echo "Full results saved to: $RESULTS_FILE"

# Append summary to results file
cat >> "$RESULTS_FILE" << EOF

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | $TOTAL_TESTS |
| **✅ Passed** | $PASSED_TESTS |
| **❌ Failed** | $FAILED_TESTS |
| **Success Rate** | $(( PASSED_TESTS * 100 / TOTAL_TESTS ))% |

---

**Test completed:** $(date)
EOF

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 All tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed. Check $RESULTS_FILE for details."
    exit 1
fi
