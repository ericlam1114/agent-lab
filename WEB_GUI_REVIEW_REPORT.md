# Web GUI Review Report
## Pages: Dashboard (page.tsx) and Evaluations List (evals/page.tsx)

**Date:** January 10, 2026
**Reviewer:** QA Engineer
**Scope:** Accessibility, Error Handling, UI Best Practices

---

## Executive Summary

Both pages have solid foundations with proper dark mode support, responsive design, and basic error handling. However, there are **critical accessibility issues** and several **UI/UX concerns** that will impact browser testing and user interactions. Most issues are non-blocking but should be addressed to meet WCAG 2.1 AA standards.

**Critical Issues Found:** 5
**High Priority Issues:** 7
**Medium Priority Issues:** 6
**Recommendations:** 4

---

## ACCESSIBILITY ISSUES

### Critical Issues

#### 1. Missing Form Labels (Both Pages)
**Location:** `/src/app/evals/page.tsx` lines 113-120, 121-133

**Issue:**
```tsx
// Line 113-120 - Missing form/input label
<form onSubmit={handleSearch} className="flex-1 min-w-64">
  <input
    type="text"
    placeholder="Search by name..."
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
    className="w-full px-4 py-2 border border-zinc-300..."
  />
</form>

// Line 121-133 - Missing select label
<select
  value={statusFilter}
  onChange={(e) => { ... }}
  className="px-4 py-2 border border-zinc-300..."
>
  <option value="">All Status</option>
  ...
</select>
```

**Impact:** Screen readers cannot identify form purposes. Violates WCAG 2.1 SC 1.3.1 (Info and Relationships).

**Test Impact:** Automated accessibility testing will fail. Manual testing with assistive technology will reveal confusion.

---

#### 2. Missing ARIA Labels on Back Button
**Location:** `/src/app/evals/page.tsx` line 95-100

**Issue:**
```tsx
<Link
  href="/"
  className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
>
  ← Back
</Link>
```

**Problem:** The arrow character `←` is not semantic. Links should have clear text alternatives or ARIA labels.

**Impact:** Screen reader users may not understand the button's purpose. Violates WCAG 2.1 SC 1.1.1 (Non-text Content).

---

#### 3. Missing ARIA Labels on Status Badges
**Location:** `/src/app/page.tsx` lines 248-252 and `/src/app/evals/page.tsx` lines 194-198

**Issue:**
```tsx
<span
  className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(evalItem.status)}`}
>
  {evalItem.status}
</span>
```

**Problem:** Status badges are purely visual indicators. No ARIA labels or semantic HTML to describe their importance. Color is the only indicator.

**Impact:** Color-blind users cannot distinguish status. Users with cognitive disabilities may miss semantic context. Violates WCAG 2.1 SC 1.4.1 (Use of Color).

---

#### 4. Non-semantic Button Usage in Quick Actions
**Location:** `/src/app/page.tsx` line 193

**Issue:**
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
  Run New Eval
</button>
```

**Problem:** Button has no `onClick` handler implemented. Not functional. No aria-label or description of what happens.

**Impact:** Users cannot complete critical action. Testing will fail when trying to execute "Run New Eval" workflow.

---

#### 5. Missing Table Header Semantics
**Location:** `/src/app/evals/page.tsx` lines 138-157

**Issue:**
```tsx
<table className="w-full">
  <thead className="bg-zinc-50 dark:bg-zinc-700">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-semibold...">
        Name
      </th>
```

**Problem:** Table headers are correct HTML, but table is interactive (clickable rows). No ARIA roles defining interaction patterns.

**Impact:** Screen reader users won't understand the table is navigable. Keyboard navigation may be confusing.

---

### High Priority Issues

#### 6. Missing Keyboard Navigation on Interactive Rows
**Location:** `/src/app/page.tsx` lines 223-255 and `/src/app/evals/page.tsx` lines 172-208

**Issue:**
```tsx
<Link
  key={evalItem.id}
  href={`/evals/${evalItem.id}`}
  className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50..."
>
  {/* Content */}
</Link>
```

**Problem:** Entire rows are Links, but interior elements (passing rate, status) are not independently accessible. Keyboard focus management is unclear.

**Impact:** Keyboard-only users cannot easily navigate. Tab order may be confusing. VoiceOver/NVDA users will hear entire row content as one link.

---

#### 7. Loading State Not Announced
**Location:** `/src/app/page.tsx` lines 85-91 and `/src/app/evals/page.tsx` lines 159-164

**Issue:**
```tsx
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="text-zinc-500">Loading...</div>
    </div>
  );
}
```

**Problem:** Loading state replaces entire page. No ARIA live region. Screen readers may not announce change.

**Impact:** Screen reader users won't know page is loading. Testing with assistive tech will show lack of feedback.

---

#### 8. Error Message Not Announced
**Location:** `/src/app/page.tsx` lines 93-107

**Issue:**
```tsx
if (error) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="text-center">
        <div className="text-red-500 mb-4">{error}</div>
```

**Problem:** Error appears suddenly. No ARIA role="alert" to announce it. Color-only indication (red text) insufficient for color-blind users.

**Impact:** Assistive tech users won't be notified of error state. Screen reader users will only see red text when reading page. Testing error scenarios will be unreliable.

---

#### 9. Missing Focus Indicators on Buttons
**Location:** All button elements throughout both pages

**Issue:** Buttons and Links use Tailwind classes but no explicit `:focus-visible` styling defined.

```tsx
// Example - no focus states defined
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
  Retry
</button>
```

**Problem:** Default browser focus outline may not be visible. Keyboard users cannot see focus position.

**Impact:** Keyboard navigation testing will show poor focus visibility. Tab through page will be confusing.

---

#### 10. Chart Not Accessible
**Location:** `/src/app/page.tsx` lines 156-185

**Issue:**
```tsx
<ResponsiveContainer width="100%" height="100%">
  <BarChart data={chartData}>
    {/* Chart */}
  </BarChart>
</ResponsiveContainer>
```

**Problem:** Recharts chart is SVG-based. No data table alternative. No ARIA description of chart data.

**Impact:** Screen reader users cannot access chart data. Testing accessibility will fail for data visualization.

---

#### 11. Pagination Not Keyboard Accessible
**Location:** `/src/app/evals/page.tsx` lines 223-237

**Issue:**
```tsx
<button
  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 })))}
  disabled={pagination.page === 1}
  className="px-4 py-2 text-sm border border-zinc-300..."
>
  Previous
</button>
```

**Problem:** `disabled` attribute is used but no `aria-disabled="true"`. Styling for disabled state relies on opacity, which may not be sufficient.

**Impact:** Assistive tech may not properly announce disabled state. Users testing with keyboard may be confused about disabled vs. enabled buttons.

---

---

## ERROR HANDLING ISSUES

### Critical Issues

#### 12. Silent Error Handling in EvalListPage
**Location:** `/src/app/evals/page.tsx` lines 58-62

**Issue:**
```tsx
} catch (error) {
  console.error('Error fetching evals:', error);  // Only logged to console
} finally {
  setLoading(false);
}
```

**Problem:** Error is logged but NOT shown to user. Loading state is cleared anyway. Page shows empty state even on API failure.

**Impact:** Users cannot distinguish between "no data" and "API error". Testing cannot verify error handling. Silent failures are hard to debug.

---

#### 12b. Missing Error State in EvalListPage
**Location:** `/src/app/evals/page.tsx` - No error state variable

**Problem:** Unlike Dashboard, EvalListPage has no `error` state. Errors are silent.

**Impact:** Cannot test error scenarios. Cannot implement retry logic. User experience is broken on API failure.

---

### High Priority Issues

#### 13. Inadequate Error Messages
**Location:** `/src/app/page.tsx` lines 53, 98

**Issue:**
```tsx
if (!response.ok) throw new Error('Failed to fetch');
// Later...
setError(err instanceof Error ? err.message : 'Failed to load data');
```

**Problem:** Error messages are generic. No context about what failed or why.

**Impact:** Testing error scenarios will show unhelpful messages. Debugging real issues becomes difficult.

---

#### 14. No Network Error Detection
**Location:** Both pages - Missing network timeout handling

**Issue:**
```tsx
const response = await fetch('/api/evals?limit=10');
```

**Problem:** No timeout specified. No handling for network disconnections. No retry logic.

**Impact:** Page may hang indefinitely if network is slow. Testing network failures will timeout.

---

#### 15. Missing Validation for API Response
**Location:** Both pages - Direct data access without validation

**Issue:**
```tsx
const data = await response.json();
setEvals(data.evals);  // Assumes data.evals exists
setStats(data.stats);  // Assumes data.stats exists
```

**Problem:** No schema validation. If API returns unexpected shape, component crashes silently.

**Impact:** Testing with mock/invalid APIs will cause silent failures. Hard to trace issues.

---

#### 16. Chart Data Vulnerability
**Location:** `/src/app/page.tsx` lines 77-83

**Issue:**
```tsx
const chartData = evals
  .slice()
  .reverse()
  .map((e) => ({
    name: e.name.substring(0, 15),  // Truncation without validation
    passRate: e.totalTrials > 0 ? (e.passedTrials / e.totalTrials) * 100 : 0,
  }));
```

**Problem:** Data transformation assumes fields exist. No null checks. Substring without validation.

**Impact:** If API returns null names or missing fields, chart will break.

---

---

## UI/UX AND BEST PRACTICES ISSUES

### Critical Issues

#### 17. Unimplemented "Run New Eval" Button
**Location:** `/src/app/page.tsx` line 193

**Issue:**
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
  Run New Eval
</button>
```

**Problem:** No `onClick` handler. Button does nothing. Only visual UI, no functionality.

**Impact:** Critical user flow is blocked. Testing cannot proceed with "Run New Eval" workflow.

---

### High Priority Issues

#### 18. Missing Loading State for Search
**Location:** `/src/app/evals/page.tsx` lines 69-73, 111-134

**Issue:**
```tsx
const handleSearch = (e: React.FormEvent) => {
  e.preventDefault();
  setSearch(searchInput);  // Immediately updates search
  setPagination((p) => ({ ...p, page: 1 }));
  // No loading state or feedback
};
```

**Problem:** When user searches, there's no visual feedback. Loading indicator only appears after state updates.

**Impact:** Testing user interactions will show delayed/confusing UI updates. Users won't know if search is processing.

---

#### 19. Status Filter Not Resetting Search
**Location:** `/src/app/evals/page.tsx` lines 121-126

**Issue:**
```tsx
<select
  value={statusFilter}
  onChange={(e) => {
    setStatusFilter(e.target.value);
    setPagination((p) => ({ ...p, page: 1 }));
    // searchInput is not cleared
  }}
```

**Problem:** Changing status filter doesn't reset search input. Both filters are applied simultaneously. Confusing behavior.

**Impact:** Testing filtering will show unexpected results. Users may think filters are broken.

---

#### 20. No Loading Indicator for Status/Search Filters
**Location:** `/src/app/evals/page.tsx` - Missing loading state

**Issue:** When filters change, page content updates without clear loading feedback.

**Impact:** Testing filter interactions will show UI flickering or delays without explanation.

---

#### 21. Empty State Missing in Dashboard
**Location:** `/src/app/page.tsx` - No empty state for stats

**Issue:**
```tsx
// Stats shown even when no data
<div className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
  {stats?.total || 0}  // Shows "0" but no explanation
</div>
```

**Problem:** When no evals exist, stats cards show "0" with no message. Chart is conditionally hidden but stats are always shown.

**Impact:** Testing with empty data will show confusing UI. Inconsistent behavior between chart and stats.

---

#### 22. Date Formatting Inconsistency
**Location:** `/src/app/page.tsx` line 234 vs `/src/app/evals/page.tsx` line 191

**Issue:**
```tsx
// Dashboard - line 234
new Date(evalItem.createdAt).toLocaleString()

// Evals page - line 191
new Date(evalItem.createdAt).toLocaleDateString()
```

**Problem:** Different date formats on different pages. Inconsistent UX.

**Impact:** Testing will show different date displays. Users confused by inconsistency.

---

#### 23. No Hover State for Chart
**Location:** `/src/app/page.tsx` lines 156-185

**Issue:** Chart is not interactive. Tooltip only appears on hover but no visual indication that chart is hoverable.

**Impact:** Testing will show unclear UI. Users won't know they can hover for details.

---

### Medium Priority Issues

#### 24. Hard-coded Strings Not Internationalized
**Location:** Both pages - Multiple UI strings

**Issue:**
```tsx
<div className="text-sm text-zinc-500">Total Evaluations</div>
<div className="text-sm text-zinc-500">Completed</div>
// etc.
```

**Problem:** All strings are hard-coded. No i18n support. Will affect future localization.

**Impact:** Testing with different locales will fail. Limited global reach.

---

#### 25. No Skeleton Loader
**Location:** Both pages - Simple "Loading..." text

**Issue:**
```tsx
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
      <div className="text-zinc-500">Loading...</div>
    </div>
  );
}
```

**Problem:** Entire page is replaced with loading text. No skeleton preview of content.

**Impact:** Testing slow networks will show jarring page replacement. Poor perceived performance.

---

#### 26. Pagination State Not Preserved on Reload
**Location:** `/src/app/evals/page.tsx` - No URL state management

**Issue:** Pagination is in component state, not URL params.

```tsx
const [pagination, setPagination] = useState<Pagination>({
  page: 1,
  ...
});
```

**Problem:** User navigates to page 3, reloads browser, goes back to page 1. URL doesn't reflect pagination state.

**Impact:** Testing page navigation will fail on refresh. Bad UX for bookmarking/sharing.

---

#### 27. No Debouncing on Search Input
**Location:** `/src/app/evals/page.tsx` lines 117

**Issue:**
```tsx
onChange={(e) => setSearchInput(e.target.value)}
```

**Problem:** Every keystroke updates state. No debouncing before API call.

**Impact:** Testing typing in search will trigger multiple renders. Could cause performance issues.

---

#### 28. Hardcoded Responsive Breakpoints
**Location:** Both pages - Tailwind responsive classes

**Issue:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
```

**Problem:** Responsive breakpoints are implicit in Tailwind classes. Hard to test/modify globally.

**Impact:** Testing responsiveness requires knowing Tailwind internals. Mobile testing may show layout issues.

---

---

## IMPACT ON BROWSER TESTING

### Test Execution Issues

1. **Cannot test "Run New Eval" workflow** - Button is non-functional
2. **Accessibility tests will fail** - Missing ARIA labels, semantic HTML issues
3. **Error scenarios cannot be fully verified** - EvalListPage has no error UI
4. **Chart data testing is limited** - No table alternative for data verification
5. **Keyboard navigation testing will be difficult** - Poor focus management
6. **Search/filter feedback is unclear** - No loading states during transitions

### Console Errors Expected During Testing

- Silent errors from EvalListPage catch block
- Potential warnings about missing ARIA labels (depending on testing tools)
- React console warnings if component re-renders unexpectedly

### Recommended Testing Approach

Before functional testing:
1. Fix critical accessibility issues (#1-5) to enable assistive tech testing
2. Implement error state in EvalListPage (#12) to test error scenarios
3. Implement "Run New Eval" button (#17) to test critical workflow
4. Add loading states for search/filters (#18-20) for better test clarity

---

## SUMMARY TABLE

| # | Issue | Severity | Category | Impact on Testing |
|---|-------|----------|----------|-------------------|
| 1 | Missing form labels | Critical | Accessibility | Fails a11y tests |
| 2 | Missing back button ARIA label | Critical | Accessibility | Screen reader issues |
| 3 | Missing status badge ARIA | Critical | Accessibility | Color-blind users cannot see status |
| 4 | Non-functional "Run New Eval" button | Critical | Error Handling | Workflow blocked |
| 5 | Missing table header semantics | Critical | Accessibility | Screen reader confusion |
| 6 | No keyboard navigation on rows | High | Accessibility | Keyboard nav fails |
| 7 | Loading state not announced | High | Accessibility | Async feedback unclear |
| 8 | Error not announced | High | Accessibility | Error scenarios untestable |
| 9 | Missing focus indicators | High | Accessibility | Keyboard focus unclear |
| 10 | Chart not accessible | High | Accessibility | Data testing limited |
| 11 | Pagination disabled state issues | High | Accessibility | Button state confusion |
| 12 | Silent error in EvalListPage | Critical | Error Handling | Error scenarios hidden |
| 13 | Generic error messages | High | Error Handling | Debugging difficult |
| 14 | No network error detection | High | Error Handling | Timeout issues |
| 15 | No API response validation | High | Error Handling | Silent failures |
| 16 | Chart data vulnerability | High | Error Handling | Data transformation fragile |
| 17 | Unimplemented button | Critical | UI/UX | Feature blocked |
| 18 | No search loading state | High | UI/UX | Unclear feedback |
| 19 | Filter logic inconsistent | High | UI/UX | Confusing behavior |
| 20 | No filter loading indicator | High | UI/UX | Status unclear |
| 21 | No empty state messaging | High | UI/UX | Confusing 0 values |
| 22 | Date format inconsistency | High | UI/UX | Inconsistent display |
| 23 | Non-interactive chart | Medium | UI/UX | Unclear affordance |
| 24 | Hard-coded strings | Medium | UI/UX | No i18n support |
| 25 | No skeleton loader | Medium | UI/UX | Poor perceived perf |
| 26 | No URL state persistence | Medium | UI/UX | Pagination lost on reload |
| 27 | No search debouncing | Medium | UI/UX | Performance issue |
| 28 | Implicit responsive breakpoints | Medium | UI/UX | Mobile testing difficult |

---

## RECOMMENDATIONS FOR TESTING

### Before Running Tests

1. **Prioritize accessibility fixes** - Issues #1-11 block comprehensive testing with assistive technology
2. **Enable error UI** - Issue #12 prevents testing error scenarios
3. **Implement missing features** - Issue #17 blocks workflow testing

### Testing Checklist

- [ ] Run axe/WAVE accessibility scanner on both pages
- [ ] Test with keyboard-only navigation (Tab, Enter, Arrow keys)
- [ ] Test with screen reader (NVDA, JAWS, or VoiceOver)
- [ ] Test error scenarios (API failures, network issues)
- [ ] Test with slow 3G network simulation
- [ ] Test responsive design at breakpoints (320px, 768px, 1024px)
- [ ] Test dark mode color contrast (WCAG AA minimum)
- [ ] Test with color blindness simulators
- [ ] Verify all interactive elements have clear focus states
- [ ] Test pagination state preservation

### Browser Testing Focus Areas

1. **Accessibility Path** - Most critical given issues found
2. **Error Handling Path** - Need to implement error UI first
3. **Data Loading Path** - Verify loading/empty/error states
4. **User Interaction Path** - Search, filter, pagination workflows
5. **Responsive Design Path** - Mobile, tablet, desktop views

---

## CONCLUSION

Both pages have **solid foundation designs** with good dark mode support and responsive layouts. However, they have **critical gaps in accessibility and error handling** that will significantly impact browser testing. The most blocking issues are:

1. Silent error handling preventing error scenario testing
2. Non-functional "Run New Eval" button blocking workflow testing
3. Missing form accessibility labels preventing a11y testing

**Recommendation:** Address critical issues (#1-5, #12, #17) before comprehensive browser testing. These will enable proper test execution and provide better test reliability.

