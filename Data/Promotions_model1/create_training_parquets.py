import pandas as pd
from pathlib import Path
import random


# ============================================================
# Configuration
# ============================================================

input_file = Path("Data/Promotions_model1/employees.parquet")
output_dir = Path("Data/Promotions_model1")

output_dir.mkdir(parents=True, exist_ok=True)

# Fixed seed makes the generated data reproducible
random.seed(42)


# ============================================================
# Read Employees.parquet
# ============================================================

employees = pd.read_parquet(input_file)

required_columns = ["empId", "name"]

missing = [c for c in required_columns if c not in employees.columns]

if missing:
    raise ValueError(
        f"Employees.parquet is missing columns: {missing}"
    )


# ============================================================
# Create ordering based on Employees.parquet
# ============================================================

employee_order = {
    emp_id: position
    for position, emp_id in enumerate(employees["empId"])
}

employee_names = (
    employees
    .drop_duplicates("empId")
    .set_index("empId")["name"]
)


# ============================================================
# 1. Training_actions
# ============================================================
#
# 4 existing actions + 5 new actions
# ============================================================

training_actions = pd.DataFrame([
    # Existing actions
    {
        "actionId": "act-001",
        "name": "CRM",
        "hours": 8,
        "prov": "a1"
    },
    {
        "actionId": "act-002",
        "name": "Business communication",
        "hours": 6,
        "prov": "a2"
    },
    {
        "actionId": "act-003",
        "name": "Digital Marketing",
        "hours": 6,
        "prov": "a3"
    },
    {
        "actionId": "act-004",
        "name": "Conflict resolution",
        "hours": 6,
        "prov": "a4"
    },

    # New actions
    {
        "actionId": "act-005",
        "name": "Leadership",
        "hours": 8,
        "prov": "a5"
    },
    {
        "actionId": "act-006",
        "name": "Data analysis",
        "hours": 10,
        "prov": "a6"
    },
    {
        "actionId": "act-007",
        "name": "Project management",
        "hours": 12,
        "prov": "a7"
    },
    {
        "actionId": "act-008",
        "name": "Cybersecurity awareness",
        "hours": 6,
        "prov": "a8"
    },
    {
        "actionId": "act-009",
        "name": "Time management",
        "hours": 6,
        "prov": "a9"
    }
])

training_actions.to_parquet(
    output_dir / "Training_actions.parquet",
    index=False
)


# ============================================================
# 2. Employees_training_actions
# ============================================================
#
# Business sector:
# emp-201 ... emp-260
#
# Every employee participates in 1 to 6 training actions.
#
# The five existing records are preserved exactly.
# ============================================================

existing_training_actions = [
    {
        "empId": "emp-201",
        "date": "Jan, 2025",
        "actionId": "act-003",
        "prov": "t1"
    },
    {
        "empId": "emp-201",
        "date": "Mar, 2025",
        "actionId": "act-001",
        "prov": "t2"
    },
    {
        "empId": "emp-202",
        "date": "Jan, 2025",
        "actionId": "act-003",
        "prov": "t3"
    },
    {
        "empId": "emp-202",
        "date": "Mar, 2025",
        "actionId": "act-001",
        "prov": "t4"
    },
    {
        "empId": "emp-202",
        "date": "Apr, 2025",
        "actionId": "act-002",
        "prov": "t5"
    }
]


# Convert existing records to DataFrame
training_action_records = existing_training_actions.copy()


# Months available for generated records
months = [
    "Jan, 2025",
    "Feb, 2025",
    "Mar, 2025",
    "Apr, 2025",
    "May, 2025",
    "Jun, 2025",
    "Jul, 2025",
    "Aug, 2025",
    "Sep, 2025",
    "Oct, 2025",
    "Nov, 2025",
    "Dec, 2025"
]

action_ids = [
    f"act-{i:03d}"
    for i in range(1, 10)
]


# Business employees
business_ids = [
    f"emp-{i}"
    for i in range(201, 261)
]


# Existing number of actions per employee
existing_counts = {}

for record in existing_training_actions:
    emp_id = record["empId"]
    existing_counts[emp_id] = existing_counts.get(emp_id, 0) + 1


# Next provenance identifier
next_prov = 6


# Generate additional actions
for emp_id in business_ids:

    existing_count = existing_counts.get(emp_id, 0)

    # Desired total number of actions: 1 to 6.
    #
    # If an employee already has actions, make sure the
    # desired total is at least the number already present.
    desired_count = random.randint(
        max(1, existing_count),
        6
    )

    additional_count = desired_count - existing_count

    # Existing action/date combinations for this employee
    existing_combinations = {
        (r["actionId"], r["date"])
        for r in training_action_records
        if r["empId"] == emp_id
    }

    attempts = 0

    while additional_count > 0:

        action_id = random.choice(action_ids)
        date = random.choice(months)

        # Avoid duplicate employee/action/date combinations
        if (action_id, date) not in existing_combinations:

            training_action_records.append({
                "empId": emp_id,
                "date": date,
                "actionId": action_id,
                "prov": f"t{next_prov}"
            })

            next_prov += 1
            additional_count -= 1

            existing_combinations.add(
                (action_id, date)
            )

        attempts += 1

        if attempts > 1000:
            raise RuntimeError(
                f"Could not generate training actions for {emp_id}"
            )


training_action_data = pd.DataFrame(
    training_action_records
)


# Add names from Employees.parquet
training_action_data["name"] = (
    training_action_data["empId"]
    .map(employee_names)
)


# Check that all employees exist
if training_action_data["name"].isna().any():

    missing_ids = (
        training_action_data.loc[
            training_action_data["name"].isna(),
            "empId"
        ]
        .unique()
        .tolist()
    )

    raise ValueError(
        "The following empId values were not found in "
        f"Employees.parquet: {missing_ids}"
    )


# Put columns in desired order
employees_training_actions = training_action_data[
    ["empId", "name", "date", "actionId", "prov"]
].copy()


# Order according to Employees.parquet
employees_training_actions["_employee_order"] = (
    employees_training_actions["empId"]
    .map(employee_order)
)

employees_training_actions = (
    employees_training_actions
    .sort_values(
        "_employee_order",
        kind="stable"
    )
    .drop(columns="_employee_order")
)


# Save
employees_training_actions.to_parquet(
    output_dir / "Employees_training_actions.parquet",
    index=False
)


# ============================================================
# 3. Employees_training
# ============================================================
#
# Industrial sector:
# emp-101 ... emp-200
#
# Exceptions:
# emp-120
# emp-150
#
# Therefore:
# 100 employees - 2 exceptions = 98 records
#
# 4 existing records + 94 generated records.
# ============================================================


# Existing records -- DO NOT MODIFY
existing_training = [
    {
        "empId": "emp-101",
        "training program": "Safety protocols",
        "year": 2025,
        "hours": 16,
        "prov": "p1"
    },
    {
        "empId": "emp-102",
        "training program": "Lean Manufacturing",
        "year": 2025,
        "hours": 20,
        "prov": "p2"
    },
    {
        "empId": "emp-103",
        "training program": "Safety protocols",
        "year": 2025,
        "hours": 16,
        "prov": "p3"
    },
    {
        "empId": "emp-104",
        "training program": "Automation",
        "year": 2025,
        "hours": 20,
        "prov": "p4"
    }
]


# 12 training programs
training_programs = [
    {
        "name": "Safety protocols",
        "hours": 16
    },
    {
        "name": "Lean Manufacturing",
        "hours": 20
    },
    {
        "name": "Automation",
        "hours": 20
    },
    {
        "name": "Quality management",
        "hours": 16
    },
    {
        "name": "Advanced Excel",
        "hours": 12
    },
    {
        "name": "Leadership",
        "hours": 16
    },
    {
        "name": "Project management",
        "hours": 20
    },
    {
        "name": "Data analysis",
        "hours": 16
    },
    {
        "name": "Cybersecurity awareness",
        "hours": 8
    },
    {
        "name": "Workplace safety",
        "hours": 12
    },
    {
        "name": "First aid",
        "hours": 8
    },
    {
        "name": "Time management",
        "hours": 8
    }
]


# Industrial employees
industrial_ids = [
    f"emp-{i}"
    for i in range(101, 191)
]


# Employees with no training record
training_exceptions = {
    "emp-120",
    "emp-150"
}


# Validate that we have exactly 98 employees
industrial_training_ids = [
    emp_id
    for emp_id in industrial_ids
    if emp_id not in training_exceptions
]

if len(industrial_training_ids) != 88:
    raise ValueError(
        "Expected 98 industrial employees with training, "
        f"but found {len(industrial_training_ids)}"
    )


# Existing employees
existing_training_ids = {
    record["empId"]
    for record in existing_training
}


# Generate the 94 missing records
training_records = existing_training.copy()

next_training_prov = 5

for emp_id in industrial_training_ids:

    # Skip employees already represented by the four
    # existing records
    if emp_id in existing_training_ids:
        continue

    program = random.choice(training_programs)

    training_records.append({
        "empId": emp_id,
        "training program": program["name"],
        "year": 2025,
        "hours": program["hours"],
        "prov": f"p{next_training_prov}"
    })

    next_training_prov += 1


# Verify exactly 98 records
if len(training_records) != 88:
    raise ValueError(
        f"Expected 98 training records, "
        f"but generated {len(training_records)}"
    )


# Add names from Employees.parquet
training_data = pd.DataFrame(training_records)

training_data["name"] = (
    training_data["empId"]
    .map(employee_names)
)


# Check that all names exist
if training_data["name"].isna().any():

    missing_ids = (
        training_data.loc[
            training_data["name"].isna(),
            "empId"
        ]
        .unique()
        .tolist()
    )

    raise ValueError(
        "The following empId values were not found in "
        f"Employees.parquet: {missing_ids}"
    )


# Put columns in desired order
employees_training = training_data[
    [
        "empId",
        "name",
        "training program",
        "year",
        "hours",
        "prov"
    ]
].copy()


# Order according to Employees.parquet
employees_training["_employee_order"] = (
    employees_training["empId"]
    .map(employee_order)
)

employees_training = (
    employees_training
    .sort_values(
        "_employee_order",
        kind="stable"
    )
    .drop(columns="_employee_order")
)


# Save
employees_training.to_parquet(
    output_dir / "Employees_training.parquet",
    index=False
)


# ============================================================
# Validation / Summary
# ============================================================

print()
print("Generated files:")
print(
    output_dir / "Training_actions.parquet"
)
print(
    output_dir / "Employees_training_actions.parquet"
)
print(
    output_dir / "Employees_training.parquet"
)

print()
print("Statistics:")
print(
    f"Training actions: "
    f"{len(training_actions)}"
)

print(
    f"Industrial training records: "
    f"{len(employees_training)}"
)

print(
    f"Business training-action records: "
    f"{len(employees_training_actions)}"
)


# Check business employee participation
action_counts = (
    employees_training_actions
    .groupby("empId")
    .size()
)

print()
print("Business employee action counts:")
print(action_counts.to_string())

if not action_counts.between(1, 6).all():
    raise ValueError(
        "At least one business employee has an invalid "
        "number of training actions."
    )


# Check industrial exceptions
for emp_id in training_exceptions:
    if emp_id in set(employees_training["empId"]):
        raise ValueError(
            f"{emp_id} should not have a training record."
        )

print()
print("Validation successful.")