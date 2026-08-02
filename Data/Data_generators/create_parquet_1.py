import pandas as pd

# Sample employee data
employees = pd.DataFrame({
    "employee_id": [1, 2, 3, 4],
    "first_name": ["Alice", "Bob", "Charlie", "Diana"],
    "last_name": ["Smith", "Jones", "Brown", "Wilson"],
    "department": ["HR", "IT", "Finance", "Marketing"],
    "salary": [60000, 75000, 82000, 68000],
    "hire_date": pd.to_datetime([
        "2022-01-15",
        "2021-06-01",
        "2020-09-20",
        "2023-03-10"
    ])
})

# Write to a Parquet file
employees.to_parquet(
    "employees.parquet",
    engine="pyarrow",
    index=False
)

print("Created employees.parquet")