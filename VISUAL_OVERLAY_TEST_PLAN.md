# Visual Overlay End-to-End Test Plan

## Test Environment Setup

**Prerequisites:**
1. ✅ Backend code updated with multiple ACTION parsing fix (commit c6d86bf)
2. ✅ Backend parsing logic verified (12/12 unit tests passed)
3. 🔄 Backend server running locally
4. 🔄 Navigator browser extension loaded
5. 🔄 GitHub page open in browser

**Setup Steps:**
```bash
# 1. Restart backend (if not already running)
cd /home/user/mvp/backend/api_server
python main.py

# 2. Watch logs in separate terminal
docker logs -f navigator-backend-dev
# OR if running directly:
tail -f backend.log
```

---

## Test Cases (10+ End-to-End Tests)

### Category 1: Single ACTION Tests (Regression)

#### Test Case 1.1: Single ACTION - Settings Navigation
**Query:** `"how do I access settings?"`

**Expected Backend Response:**
```
Navigate to the settings page by clicking the gear icon.
ACTION:highlight_zone:arc-tr:button[aria-label*='Settings']:3000
```

**Expected Backend Logs:**
```
[ACTION] Parsed: type=highlight_zone, zone=arc-tr, selector=button[aria-label*='Settings'], duration=3000
```

**Expected Sidepanel Display:**
```
Navigate to the settings page by clicking the gear icon.
```
(NO "ACTION:..." text visible)

**Expected Visual:**
- ✅ Orange gradient overlay appears in arc-tr zone (top-right arc)
- ✅ Settings button/icon highlighted with white border
- ✅ Overlay fades after 3 seconds
- ✅ No console errors

**Result:** ⬜ PASS / ⬜ FAIL
**Notes:**

---

#### Test Case 1.2: Single ACTION - Issues Tab
**Query:** `"where can I find issues?"`

**Expected Backend Response:**
```
Click the Issues tab to view all issues.
ACTION:highlight_zone:arc-tl:a[data-tab-item='issues-tab']:2500
```

**Expected Backend Logs:**
```
[ACTION] Parsed: type=highlight_zone, zone=arc-tl, selector=a[data-tab-item='issues-tab'], duration=2500
```

**Expected Sidepanel Display:**
```
Click the Issues tab to view all issues.
```

**Expected Visual:**
- ✅ Orange gradient overlay in arc-tl zone (top-left arc)
- ✅ Issues tab highlighted
- ✅ Overlay fades after 2.5 seconds

**Result:** ⬜ PASS / ⬜ FAIL
**Notes:**

---

### Category 2: Multiple ACTION Tests (Primary Fix)

#### Test Case 2.1: Two ACTIONs - Create PR Workflow
**Query:** `"how to create PR?"`

**Expected Backend Response:**
```
To create a Pull Request (PR), first navigate to the Pull Requests tab.
ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item="pull-requests-tab"]:3000
Next, click the green "New pull request" button.
ACTION:highlight_zone:center:a[href*="/compare"]:2500
```

**Expected Backend Logs:**
```
[ACTION] Parsed: type=highlight_zone, zone=arc-tl, selector=.UnderlineNav-item[data-tab-item="pull-requests-tab"], duration=3000
[ACTION] Parsed: type=highlight_zone, zone=center, selector=a[href*="/compare"], duration=2500
```

**Expected Sidepanel Display:**
```
To create a Pull Request (PR), first navigate to the Pull Requests tab.
Next, click the green "New pull request" button.
```
(BOTH lines visible, NO "ACTION:..." strings)

**Expected Visual:**
- ✅ **FIRST overlay**: Orange gradient on PR tab (arc-tl zone) for 3 seconds
- ✅ **SECOND overlay**: Orange gradient on "New pull request" button (center zone) for 2.5 seconds
- ✅ Overlays appear in sequence (not simultaneously)
- ✅ Both text segments displayed in sidepanel

**Result:** ⬜ PASS / ⬜ FAIL
**Notes:**

---

#### Test Case 2.2: Two ACTIONs - View and Create Issue
**Query:** `"how do I create a new issue?"`

**Expected Backend Response:**
```
First, navigate to the Issues tab.
ACTION:highlight_zone:arc-tl:a[data-tab-item='issues-tab']:2500
Then click the "New issue" button.
ACTION:highlight_zone:center:a.btn-primary[href*='/issues/new']:2500
```

**Expected Backend Logs:**
```
[ACTION] Parsed: type=highlight_zone, zone=arc-tl, selector=a[data-tab-item='issues-tab'], duration=2500
[ACTION] Parsed: type=highlight_zone, zone=center, selector=a.btn-primary[href*='/issues/new'], duration=2500
```

**Expected Sidepanel Display:**
```
First, navigate to the Issues tab.
Then click the "New issue" button.
```

**Expected Visual:**
- ✅ First overlay on Issues tab
- ✅ Second overlay on "New issue" button
- ✅ Both overlays appear sequentially

**Result:** ⬜ PASS / ⬜ FAIL
**Notes:**

---

#### Test Case 2.3: Three ACTIONs - Multi-Step Workflow
**Query:** `"how do I review and merge a pull request?"`

**Expected Backend Response:**
```
First, go to the Pull Requests tab.
ACTION:highlight_zone:arc-tl:a[data-tab-item='pull-requests-tab']:2500
Then select the PR you want to review.
ACTION:highlight_zone:center:.js-issue-row:2500
Finally, click the Merge button at the bottom.
ACTION:highlight_zone:bottom:.merge-message:3000
```

**Expected Backend Logs:**
```
[ACTION] Parsed: type=highlight_zone, zone=arc-tl...
[ACTION] Parsed: type=highlight_zone, zone=center...
[ACTION] Parsed: type=highlight_zone, zone=bottom...
```

**Expected Sidepanel Display:**
```
First, go to the Pull Requests tab.
Then select the PR you want to review.
Finally, click the Merge button at the bottom.
```

**Expected Visual:**
- ✅ THREE overlays appear in sequence
- ✅ Each overlay targets correct zone
- ✅ All three text segments displayed

**Result:** ⬜ PASS / ⬜ FAIL
**Notes:**

---

### Category 3: Edge Cases

#### Test Case 3.1: Back-to-Back ACTIONs (No Text Between)
**Query:** `"show me the code and issues tabs"`

**Expected Backend Response:**
```
Here are the tabs you requested.
ACTION:highlight_zone:arc-tl:a[data-tab-item='code-tab']:2000
ACTION:highlight_zone:arc-tl:a[data-tab-item='issues-tab']:2000
```

**Expected Sidepanel Display:**
```
Here are the tabs you requested.
```

**Expected Visual:**
- ✅ TWO overlays on same zone (arc-tl)
- ✅ First highlights Code tab
- ✅ Second highlights Issues tab
- ✅ Both execute despite no text between them

**Result:** ⬜ PASS / ⬜ FAIL
**Notes:**

---

#### Test Case 3.2: ACTION at Start (No Text Before)
**Query:** `"highlight the star button"`

**Expected Backend Response:**
```
ACTION:highlight_zone:arc-tr:button.starred:2500
This will star the repository for you.
```

**Expected Sidepanel Display:**
```
This will star the repository for you.
```

**Expected Visual:**
- ✅ Overlay appears on star button
- ✅ Text displays after ACTION (not before)

**Result:** ⬜ PASS / ⬜ FAIL
**Notes:**

---

#### Test Case 3.3: Complex Selector with Special Characters
**Query:** `"where is the search box?"`

**Expected Backend Response:**
```
The search box is at the top.
ACTION:highlight_zone:arc-tl:input[type="text"][name="q"]:2500
```

**Expected Visual:**
- ✅ Search input field highlighted
- ✅ Selector with brackets and quotes parsed correctly

**Result:** ⬜ PASS / ⬜ FAIL
**Notes:**

---

### Category 4: Performance and Timing

#### Test Case 4.1: Different Duration Values
**Query:** `"show me quick and slow overlays"`

**Expected Backend Response:**
```
Fast overlay (1.5s).
ACTION:highlight_zone:center:.btn:1500
Slow overlay (5s).
ACTION:highlight_zone:bottom:.footer:5000
```

**Expected Visual:**
- ✅ First overlay fades after 1.5 seconds
- ✅ Second overlay fades after 5 seconds
- ✅ Timing is accurate

**Result:** ⬜ PASS / ⬜ FAIL
**Notes:**

---

### Category 5: Integration Tests

#### Test Case 5.1: Full PR Creation Flow
**Query:** `"walk me through creating and submitting a pull request"`

**Expected Backend Response:**
```
To create and submit a pull request:
1. Navigate to the Pull Requests tab
ACTION:highlight_zone:arc-tl:a[data-tab-item='pull-requests-tab']:3000
2. Click "New pull request"
ACTION:highlight_zone:center:a[href*='/compare']:2500
3. Select your branches and click "Create pull request"
ACTION:highlight_zone:center:.btn-primary:2500
4. Fill in the PR description
ACTION:highlight_zone:center:textarea#pull_request_body:2500
5. Submit by clicking "Create pull request" button
ACTION:highlight_zone:center:button[type='submit']:3000
```

**Expected Sidepanel Display:**
```
To create and submit a pull request:
1. Navigate to the Pull Requests tab
2. Click "New pull request"
3. Select your branches and click "Create pull request"
4. Fill in the PR description
5. Submit by clicking "Create pull request" button
```

**Expected Visual:**
- ✅ FIVE overlays appear in sequence
- ✅ Each step clearly highlighted
- ✅ All text preserved

**Result:** ⬜ PASS / ⬜ FAIL
**Notes:**

---

#### Test Case 5.2: Repository Navigation
**Query:** `"how do I navigate around a GitHub repository?"`

**Expected Backend Response:**
```
Key navigation tabs:
- Code: ACTION:highlight_zone:arc-tl:a[data-tab-item='code-tab']:2000
- Issues: ACTION:highlight_zone:arc-tl:a[data-tab-item='issues-tab']:2000
- Pull Requests: ACTION:highlight_zone:arc-tl:a[data-tab-item='pull-requests-tab']:2000
```

**Expected Visual:**
- ✅ THREE overlays on navigation tabs
- ✅ Sequential highlighting of each tab

**Result:** ⬜ PASS / ⬜ FAIL
**Notes:**

---

## Debugging Checklist

If tests fail, check the following:

### Backend Issues
- [ ] Backend logs show `[ACTION] Parsed` for each ACTION directive
- [ ] No `[ACTION] Parse error` messages in logs
- [ ] Backend is running the latest code (commit c6d86bf or later)

### Extension Issues
- [ ] Extension service worker console shows no errors (chrome://extensions → service worker)
- [ ] Content script injected successfully (check page console)
- [ ] ZoneGuide initialized (check for `window.__ZONEGUIDE__` in page console)

### Visual Issues
- [ ] Overlays appear but in wrong location → CSS selector issue
- [ ] No overlay appears → ZoneGuide not receiving message
- [ ] Text shows ACTION strings → Sidepanel not filtering (optional fix needed)

---

## Success Criteria

**Unit Tests (Backend Parsing):**
- ✅ 12/12 tests passed

**End-to-End Tests:**
- Target: At least 10/12 tests should pass
- Critical: Test Case 2.1 (Two ACTIONs - Create PR) MUST pass
- Critical: Test Case 2.3 (Three ACTIONs) MUST pass

**Overall System Health:**
- [ ] No errors in backend logs
- [ ] No errors in extension console
- [ ] No errors in page console
- [ ] Sidepanel displays clean text
- [ ] Visual overlays appear and fade correctly

---

## Test Execution Log

**Date:** ___________
**Tester:** ___________
**Backend Version:** commit c6d86bf
**Browser:** Chrome/Edge/Firefox ___________

**Summary:**
- Tests Passed: ___ / 12
- Tests Failed: ___ / 12
- Success Rate: ____%

**Critical Issues Found:**


**Notes:**


**Overall Status:** ⬜ PASS / ⬜ FAIL
