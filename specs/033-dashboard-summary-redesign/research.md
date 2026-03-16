# Research: Dashboard Summary Redesign

## R1: Available Data Shape (No Backend Changes)

**Decision**: All data needed for the redesign is already returned by `DashboardService.getDashboardData()`. No backend modifications required.

**Data fields used by new features:**

| New Feature | Data Source | Field(s) |
|-------------|------------|----------|
| Top-Rated Hero Card | `dashboardData.itemSummaries` | `itemId`, `weightedAverage` — find max `weightedAverage`, tie-break by lowest `itemId` |
| Ratings Progress | `dashboardData.statistics` | `totalRatings`, `totalUsers`, `totalItems` — expected = users × items |
| Global Average | `dashboardData.globalAverage` | Already computed; `null` when no ratings |
| Max Rating Scale | `dashboardData.ratingConfiguration` | `maxRating` field (default 4) |
| Most Divisive | `dashboardData.mostControversial` | `itemId`, `standardDeviation`, `averageRating` — rename label only |
| Personality Summary | `dashboardData.userSummaries[].personality` | Aggregate counts by personality ID; look up display info via `PERSONALITY_CONTENT` |

**Rationale**: Backend already computes weighted averages, global average, controversial items, and user personality assignments. All frontend derivations are trivial (max of array, sum/group-by).

**Alternatives considered**: Adding a dedicated backend endpoint for "summary highlights" — rejected because all data is already available in the single dashboard response.

## R2: Color Strategy for Stat Cards

**Decision**: Use the existing `--chart-1` through `--chart-5` CSS variables defined in `globals.css` for stat card accent colors. These are purpose-built for data visualization and have both light and dark mode variants.

**Color assignments:**

| Card | CSS Variable | Light Mode (OKLCH) | Purpose |
|------|-------------|-------------------|---------|
| Hero (Top-Rated) | `--primary` at low opacity | Theme primary tint | Hero prominence |
| People | `--chart-2` | Teal/green | People = growth/community |
| Bottles/Items | `--chart-4` | Amber/gold | Items = bottles/wine = gold |
| Ratings Progress | `--primary` | Theme primary | Progress bar fill |
| Avg Rating | `--chart-1` | Orange/warm | Rating = warm score |
| Most Divisive | `--chart-5` | Red-orange | Divisive = conflict/heat |

**Rationale**: Chart variables are already defined for both light and dark themes in `globals.css`, avoiding the need for custom complementary colors. They provide sufficient variety (5 distinct hues) to differentiate cards.

**Alternatives considered**: Custom hex colors per card — rejected because it bypasses the theme system and creates maintenance burden. Using only `--primary` and `--accent` — rejected because only 2 hues is insufficient to differentiate 4+ cards.

## R3: Personality Strip Colors

**Decision**: Define a static color map in `PersonalitySummaryStrip.jsx` that assigns a Tailwind color class to each personality ID. Use soft background tints (e.g., `bg-amber-100 dark:bg-amber-900/30`) for personality pills.

**Color assignments:**

| Personality | Color Family | Rationale |
|-------------|-------------|-----------|
| golden-retriever | Amber/Yellow | Warm, positive — matches "golden" |
| simon-cowell | Slate/Cool Gray | Critical, sharp — cool tone |
| broken-record | Violet/Purple | Repetitive/unique — distinctive |
| love-hate-critic | Rose/Red | Passionate extremes |
| speedrun | Cyan/Teal | Fast, electric |
| novelist | Indigo/Blue | Thoughtful, literary |
| rollercoaster | Orange | Energetic ups and downs |
| diplomat | Emerald/Green | Balanced, neutral |
| ghost | Gray | Invisible, silent |
| philosopher | Sky/Light Blue | Contemplative |
| explorer | Lime/Green | Adventurous |

**Rationale**: Each personality already has a distinct character; colors reinforce that identity. Using Tailwind's built-in color palette with light/dark variants ensures theme compatibility.

**Alternatives considered**: Using chart variables for personalities — rejected because 11 personalities exceed 5 chart colors, requiring duplication.

## R4: StatisticsCard Enhancement Approach

**Decision**: Add an optional `accentColor` prop to `StatisticsCard` that applies a subtle left-border or background tint. This avoids creating a separate component while keeping backward compatibility.

**Implementation**: The `accentColor` prop accepts a CSS class string (e.g., `"bg-chart-2/10 border-l-4 border-l-chart-2"`) applied to the card wrapper. When not provided, the card renders exactly as before.

**Rationale**: Minimal change to existing component; all current usage remains unaffected.

**Alternatives considered**: Creating new card variants (HeroCard, ProgressCard, etc.) — rejected because `StatisticsCard` already supports `progressPercentage`, `subtitle`, `onClick`, and `tooltipMessage`, which cover all the behaviors needed. Adding color is one more optional prop.

## R5: Top-Rated Item Derivation

**Decision**: Compute on the frontend inside `DashboardPage.jsx` by finding the item with the highest `weightedAverage` from `itemSummaries`. Tie-break by lowest `itemId`.

**Implementation**:
```
const topRated = itemSummaries
  .filter(item => item.numberOfRaters > 0)
  .sort((a, b) => b.weightedAverage - a.weightedAverage || a.itemId - b.itemId)[0] || null;
```

**Rationale**: Simple derivation from existing data; no backend change needed.

## R6: Expected Ratings Calculation

**Decision**: `expectedRatings = statistics.totalUsers × statistics.totalItems`. Progress percentage = `(totalRatings / expectedRatings) × 100`. Subtitle format: `"{pct}% complete · {remaining} to go"`.

**Edge cases**:
- `expectedRatings === 0` → show "0" with subtitle "No ratings possible yet"
- `percentage >= 100` → subtitle "100% complete" (no "to go" portion)

**Rationale**: Straightforward multiplication using two existing fields. The `calculateRatingsProgress()` function already exists in `DashboardPage.jsx` and can be extended to return the additional computed values.
