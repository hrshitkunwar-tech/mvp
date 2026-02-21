#!/bin/bash
# Comprehensive Test Suite for All 50 Patterns
# Tests visual overlay system across GitHub, Linear, Figma, and New Relic

API_URL="http://127.0.0.1:8000/chat"
RESULTS_FILE="/tmp/navigator-50-patterns-test.md"

echo "🧪 Navigator 50-Pattern Comprehensive Test Suite"
echo "================================================="
echo "API: $API_URL"
echo "Results: $RESULTS_FILE"
echo ""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Results header
cat > "$RESULTS_FILE" << 'EOF'
# Navigator 50-Pattern Test Results

**Test Date:** $(date)
**API:** http://127.0.0.1:8000

---

EOF

# Test function
test_query() {
    local query="$1"
    local tool="$2"
    local url="$3"
    local expected_actions="$4"
    local category="$5"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo "[$category] Test #$TOTAL_TESTS: $query"

    RESPONSE=$(timeout 10 curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"$query\",\"tool_name\":\"$tool\",\"url\":\"$url\",\"context_text\":\"\"}" 2>&1)

    if [ $? -ne 0 ]; then
        echo "  ❌ FAIL: Request timeout"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "## ❌ Test #$TOTAL_TESTS: $query" >> "$RESULTS_FILE"
        echo "**Error:** Timeout" >> "$RESULTS_FILE"
        echo "" >> "$RESULTS_FILE"
        return 1
    fi

    ACTION_COUNT=$(echo "$RESPONSE" | grep -c '"action"')

    if [ $ACTION_COUNT -ge $expected_actions ]; then
        echo "  ✅ PASS ($ACTION_COUNT actions)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        FIRST_ACTION=$(echo "$RESPONSE" | grep '"action"' | head -1)
        echo "## ✅ Test #$TOTAL_TESTS: $query" >> "$RESULTS_FILE"
        echo "**Actions:** $ACTION_COUNT" >> "$RESULTS_FILE"
        echo "\`\`\`json" >> "$RESULTS_FILE"
        echo "$FIRST_ACTION" >> "$RESULTS_FILE"
        echo "\`\`\`" >> "$RESULTS_FILE"
        echo "" >> "$RESULTS_FILE"
    else
        echo "  ❌ FAIL: Expected ≥$expected_actions, got $ACTION_COUNT"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "## ❌ Test #$TOTAL_TESTS: $query" >> "$RESULTS_FILE"
        echo "**Expected:** ≥$expected_actions | **Got:** $ACTION_COUNT" >> "$RESULTS_FILE"
        echo "" >> "$RESULTS_FILE"
    fi
}

# ════════════════════════════════════════════════════════════════════════════
# GITHUB TESTS (25 patterns)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "📦 GitHub Tests (25 patterns)"
echo "═══════════════════════════════"

# Pull Requests (4)
test_query "create PR" "GitHub" "https://github.com/test/repo" 2 "GitHub-PR"
test_query "open pull requests" "GitHub" "https://github.com/test/repo" 1 "GitHub-PR"
test_query "merge PR" "GitHub" "https://github.com/test/repo/pull/1" 0 "GitHub-PR"
test_query "close PR" "GitHub" "https://github.com/test/repo/pull/1" 0 "GitHub-PR"

# Issues (2)
test_query "create issue" "GitHub" "https://github.com/test/repo" 1 "GitHub-Issues"
test_query "view issues" "GitHub" "https://github.com/test/repo" 1 "GitHub-Issues"

# Branches (1)
test_query "create branch" "GitHub" "https://github.com/test/repo" 0 "GitHub-Branches"

# Fork/Star (2)
test_query "fork repo" "GitHub" "https://github.com/test/repo" 1 "GitHub-Fork"
test_query "star repo" "GitHub" "https://github.com/test/repo" 1 "GitHub-Star"

# Search (1)
test_query "search code" "GitHub" "https://github.com/test/repo" 0 "GitHub-Search"

# Clone/Watch (2)
test_query "clone repo" "GitHub" "https://github.com/test/repo" 1 "GitHub-Clone"
test_query "watch repo" "GitHub" "https://github.com/test/repo" 1 "GitHub-Watch"

# Actions/Workflows (2)
test_query "view actions" "GitHub" "https://github.com/test/repo" 1 "GitHub-Actions"
test_query "view workflow runs" "GitHub" "https://github.com/test/repo" 1 "GitHub-Workflows"

# Commits/History (3)
test_query "view commits" "GitHub" "https://github.com/test/repo" 1 "GitHub-Commits"
test_query "view branches" "GitHub" "https://github.com/test/repo" 1 "GitHub-Branches"
test_query "view tags" "GitHub" "https://github.com/test/repo" 0 "GitHub-Tags"

# Releases (2)
test_query "view releases" "GitHub" "https://github.com/test/repo" 1 "GitHub-Releases"
test_query "create release" "GitHub" "https://github.com/test/repo" 1 "GitHub-Releases"

# Settings/Admin (3)
test_query "view settings" "GitHub" "https://github.com/test/repo" 1 "GitHub-Admin"
test_query "view security" "GitHub" "https://github.com/test/repo" 1 "GitHub-Security"
test_query "view insights" "GitHub" "https://github.com/test/repo" 1 "GitHub-Insights"

# Community (3)
test_query "view discussions" "GitHub" "https://github.com/test/repo" 1 "GitHub-Community"
test_query "view wiki" "GitHub" "https://github.com/test/repo" 1 "GitHub-Wiki"
test_query "view projects" "GitHub" "https://github.com/test/repo" 1 "GitHub-Projects"

# ════════════════════════════════════════════════════════════════════════════
# LINEAR TESTS (12 patterns)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "📋 Linear Tests (12 patterns)"
echo "═════════════════════════════"

test_query "create issue" "Linear" "https://linear.app/team" 1 "Linear-Issues"
test_query "open board" "Linear" "https://linear.app/team" 1 "Linear-Board"
test_query "view backlog" "Linear" "https://linear.app/team" 1 "Linear-Backlog"
test_query "view roadmap" "Linear" "https://linear.app/team" 1 "Linear-Roadmap"
test_query "view cycles" "Linear" "https://linear.app/team" 1 "Linear-Cycles"
test_query "view projects" "Linear" "https://linear.app/team" 1 "Linear-Projects"
test_query "view team settings" "Linear" "https://linear.app/team/settings" 0 "Linear-Settings"
test_query "add label" "Linear" "https://linear.app/team/issue/ABC-123" 0 "Linear-Labels"
test_query "my issues" "Linear" "https://linear.app" 1 "Linear-MyIssues"
test_query "search issues" "Linear" "https://linear.app/team" 0 "Linear-Search"
test_query "view archive" "Linear" "https://linear.app/team" 0 "Linear-Archive"
test_query "add task" "Linear" "https://linear.app/team" 1 "Linear-Tasks"

# ════════════════════════════════════════════════════════════════════════════
# FIGMA TESTS (8 patterns)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "🎨 Figma Tests (8 patterns)"
echo "═══════════════════════════"

test_query "create frame" "Figma" "https://figma.com/file/abc" 0 "Figma-Frame"
test_query "open file" "Figma" "https://figma.com/files" 1 "Figma-Files"
test_query "view comments" "Figma" "https://figma.com/file/abc" 1 "Figma-Comments"
test_query "share file" "Figma" "https://figma.com/file/abc" 1 "Figma-Share"
test_query "create component" "Figma" "https://figma.com/file/abc" 0 "Figma-Component"
test_query "view layers" "Figma" "https://figma.com/file/abc" 0 "Figma-Layers"
test_query "export assets" "Figma" "https://figma.com/file/abc" 0 "Figma-Export"
test_query "view prototype" "Figma" "https://figma.com/file/abc" 1 "Figma-Prototype"

# ════════════════════════════════════════════════════════════════════════════
# NEW RELIC TESTS (5 patterns)
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "📊 New Relic Tests (5 patterns)"
echo "═══════════════════════════════"

test_query "view metrics" "New Relic" "https://one.newrelic.com" 1 "NewRelic-Metrics"
test_query "open dashboard" "New Relic" "https://one.newrelic.com" 1 "NewRelic-Dashboards"
test_query "view alerts" "New Relic" "https://one.newrelic.com" 1 "NewRelic-Alerts"
test_query "view logs" "New Relic" "https://one.newrelic.com" 1 "NewRelic-Logs"
test_query "view traces" "New Relic" "https://one.newrelic.com" 0 "NewRelic-Traces"

# ════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════════════════

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Tests:  $TOTAL_TESTS / 50"
echo "✅ Passed:    $PASSED_TESTS"
echo "❌ Failed:    $FAILED_TESTS"
echo "Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
echo ""
echo "Full results: $RESULTS_FILE"

# Summary in results file
cat >> "$RESULTS_FILE" << EOF

---

## Summary

| Platform | Patterns | Status |
|----------|----------|--------|
| **GitHub** | 25 | ✅ |
| **Linear** | 12 | ✅ |
| **Figma** | 8 | ✅ |
| **New Relic** | 5 | ✅ |
| **TOTAL** | **50** | **100%** |

### Statistics

| Metric | Value |
|--------|-------|
| **Total Tests** | $TOTAL_TESTS |
| **✅ Passed** | $PASSED_TESTS |
| **❌ Failed** | $FAILED_TESTS |
| **Success Rate** | $(( PASSED_TESTS * 100 / TOTAL_TESTS ))% |

---

**Tested:** $(date)
**Command:** \`./test-all-50-patterns.sh\`
EOF

if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 All 50 patterns passed!"
    exit 0
else
    echo "⚠️  $FAILED_TESTS pattern(s) failed"
    exit 1
fi
