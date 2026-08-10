I think this is a much stronger example than loan approval because it demonstrates **provenance, explainability, fairness, data integration, and trust** 
in a single scenario. It also aligns naturally with the strengths of a provenance-semiring framework.

## Overall scenario

A company predicts which employees should be promoted.

The data are integrated from several HR systems. Some systems are highly trusted, while others are incomplete or known to contain bias.

The prediction itself is not the main focus. The focus is answering questions such as:

> **Why was Alice promoted while Bob was not?**

and

> **Did lower-quality or biased data sources influence this decision?**

---

# Data architecture

I would use **five tables**.

```text
                Employees
                    |
        +-----------+------------+
        |                        |
 Performance_Official      Performance_Manager
        |                        |
        +-----------+------------+
                    |
             EmployeeTraining
                    |
            PromotionHistory
```

This already contains both **vertical** and **horizontal** partitioning.

---

# Table 1 — Employees

Around 150 rows.

| EmpID | Gender | Age | Department | HireDate |
|------|--------|-----|------------|----------|
| E001 | F | 32 | Sales | 2019 |
| E002 | M | 40 | IT | 2015 |

Protected attributes (Gender, Age) are **never used** by the promotion model but are used for fairness analysis.

---

# Table 2 — Official Performance Reviews

Vertical partition.

Contains

| EmpID | Year | OfficialScore |
|------|------|---------------|
| E001 | 2025 | 91 |

Trust score

```text
Official HR

Trust = 0.98
```

---

# Table 3 — Manager Reviews

Another vertical partition.

| EmpID | Year | ManagerScore |
|------|------|--------------|
| E001 | 2025 | 83 |

Trust

```text
Manager evaluations

Trust = 0.70
```

Some managers are known to systematically underrate certain groups.

---

# Table 4 — Training

| EmpID | Course | Hours | Passed |
|------|--------|-------|--------|

Trust

```
0.95
```

---

# Table 5 — Promotion History

Horizontal partition.

Instead of one table,

```text
Promotion_2022

Promotion_2023

Promotion_2024

Promotion_2025
```

or

```text
Promotion_Europe

Promotion_US

Promotion_Asia
```

Each partition has approximately 30–50 records.

Your middleware reconstructs

```sql
PromotionHistory
```

using

```sql
UNION ALL
```

Now provenance records **which partition** contributed each tuple.

---

# Trust annotations

Now every relation has a source annotation.

For example

\[
Employees^{HR}
\]

\[
Performance^{Official}
\]

\[
Performance^{Manager}
\]

\[
Training^{LMS}
\]

where

\[
Trust(HR)=0.99
\]

\[
Trust(Official)=0.98
\]

\[
Trust(Manager)=0.70
\]

\[
Trust(LMS)=0.95
\]

The trust values are **not** part of the semiring itself.

They are metadata associated with provenance tokens.

---

# Query

Suppose HR computes

```sql
SELECT
    e.EmpID,
    AVG(o.Score,m.Score) AS Performance,
    SUM(t.Hours) AS TrainingHours
FROM ...
```

The provenance for Alice becomes

\[
e_{17}
o_{81}
m_{43}
t_{91}
\]

or

\[
e_{17}o_{81}m_{43}t_{91}
\]

depending on your semiring.

---

# Promotion recommendation

The ML model predicts

```text
Promote
```

because

```text
Performance = 88

Training = 74 h
```

---

# Provenance explanation

Instead of

> SHAP says Performance contributed 45%.

you show

```text
Performance

↓

Official Review
     HR_DB
     trust 0.98

+

Manager Review
     Portal
     trust 0.70

+

Training
     LMS
     trust 0.95
```

Now the audience immediately understands

> The prediction partly depends on a low-trust manager review.

---

# Fairness question

Now compute

```sql
Promotion rate
GROUP BY Gender
```

Suppose

```text
Women

41%

Men

63%
```

A manager asks

> Why?

---

# Semimodule explanation

For women

\[
p_3+p_8+p_{17}+...
\]

For men

\[
p_1+p_2+p_6+...
\]

Each token expands into the employee provenance.

---

# Interesting discovery

Suppose

70% of female employees have

```text
ManagerScore

↓

Source

Manager Portal
```

while

male employees mostly have

```text
Official Review
```

This is visible directly in provenance.

No ML explanation method normally shows this.

---

# Horizontal partition explanation

Suppose

PromotionHistory is

```text
Europe

US

Asia
```

Alice's provenance

\[
e_{17}
o_{81}
m_{43}
t_{91}
p^{Europe}_{17}
\]

Bob's provenance

\[
e_{44}
o_{99}
m_{87}
t_{31}
p^{US}_{5}
\]

Now users can even discover

> Most negative examples came from one regional HR system.

---

# Visualization

This is where I think your demo could be quite novel.

```text
Promotion Decision

        │

        ▼

Employee E17
```

Click

↓

```text
Employee E17

├── Official Review
│      trust 0.98
│
├── Manager Review
│      trust 0.70
│
├── Training
│      trust 0.95
│
└── Promotion History
       Europe
```

Click

↓

Manager Review

↓

```text
Manager Portal

↓

Regional HR System

↓

Imported CSV

↓

Manager A
```

Every edge comes directly from provenance.

---

## Why this example is particularly compelling

This scenario lets you demonstrate several dimensions simultaneously:

| Capability | Demonstrated by |
|------------|-----------------|
| **Semiring provenance** | Explains which tuples from Employees, Performance, Training, and PromotionHistory contribute to an employee's promotion recommendation. |
| **Semimodule provenance** | Explains aggregate statistics such as promotion rates by gender, department, or age group. |
| **Horizontal partitioning** | Shows provenance across yearly or regional PromotionHistory partitions reconstructed via `UNION ALL`. |
| **Vertical partitioning** | Shows how employee attributes are assembled from multiple normalized tables. |
| **Data integration** | Demonstrates provenance through joins across independent HR systems. |
| **Source trustworthiness** | Associates provenance tokens with source quality (e.g., trusted HR database vs. lower-trust manager portal). |
| **Fairness analysis** | Enables investigation of whether promotion disparities are associated with particular data sources or processing paths. |
| **Interactive drill-down** | Allows navigation from an aggregate disparity, to individual employees, to the exact tuples and source systems involved. |

## A possible extension: provenance × trust × fairness

To make the demonstration even more distinctive, consider visualizing three complementary layers:

1. **Provenance** (the semiring/semimodule explanation): *Which tuples contributed?*
2. **Trust** (source metadata): *How reliable are those contributing sources?*
3. **Fairness** (analytical metrics): *Do different demographic groups rely disproportionately on lower-trust sources?*

For example, if 80% of women's promotion recommendations depend on manager reviews (trust = 0.70), whereas 85% of men's recommendations rely on official HR evaluations (trust = 0.98), your system can explain not only that a disparity exists but also expose a plausible data-centric cause. This illustrates how provenance can connect fairness analysis to the underlying data integration process—an aspect that is rarely addressed by conventional XAI techniques.