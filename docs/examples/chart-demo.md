---
stats:
  revenue:
    Jan: 12
    Feb: 18
    Mar: 15
    Apr: 22
    May: 28
  time_spent:
    Writing: 45
    Editing: 30
    Research: 15
    Review: 10
  weekly_words:
    - day: Mon
      words: 800
    - day: Tue
      words: 1200
    - day: Wed
      words: 950
    - day: Thu
      words: 1400
    - day: Fri
      words: 600
---

# Writing Dashboard

## Revenue by month (default size)

<!-- chart-source: revenue -->

| month | revenue |
| ----- | ------- |
| Jan   | 12      |
| Feb   | 18      |
| Mar   | 15      |
| Apr   | 22      |
| May   | 28      |

```chart
type: bar
source: table:revenue
x: month
y: revenue
title: Monthly revenue ($k)
```

## Revenue by month (wide)

```chart
type: bar
source: table:revenue
x: month
y: revenue
title: Monthly revenue ($k) — wide
width: 500
height: 200
```

## Revenue by month (compact)

```chart
type: bar
source: table:revenue
x: month
y: revenue
title: Monthly revenue ($k) — compact
width: 200
height: 120
```

## Revenue trend (line, default)

```chart
type: line
source: frontmatter:stats.revenue
title: Revenue over time
```

## Revenue trend (line, tall)

```chart
type: line
source: frontmatter:stats.revenue
title: Revenue over time — tall
width: 400
height: 300
```

## Weekly writing output

```chart
type: line
source: frontmatter:stats.weekly_words
x: day
y: words
title: Words per day
```

## Time breakdown (pie, default)

```chart
type: pie
source: frontmatter:stats.time_spent
title: How I spend my time
```

## Time breakdown (pie, large)

```chart
type: pie
source: frontmatter:stats.time_spent
title: How I spend my time — large
width: 400
height: 280
```

## Project progress

<!-- chart-source: projects -->

| project    | completion |
| ---------- | ---------- |
| Novel      | 75         |
| Blog       | 90         |
| Newsletter | 40         |
| Thesis     | 55         |

```chart
type: bar
source: table:projects
x: project
y: completion
title: Project completion (%)
width: 400
height: 220
```
