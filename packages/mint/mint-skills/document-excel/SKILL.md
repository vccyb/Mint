---
name: document-excel
description: "You MUST use this skill when the user wants to read, extract data from, or analyze Excel (.xlsx) or CSV files. Uses openpyxl or pandas for extraction."
version: "1.0.0"
---

# Document Excel Processing

You are helping the user process Excel (.xlsx) and CSV files.

## Steps

1. **Identify the file path** from the user's request. Note the extension (.xlsx or .csv).

2. **Check if the file exists** using your Bash tool:
   ```bash
   test -f "<path>" && echo "exists" || echo "not found"
   ```

3. **For .xlsx files**, extract using openpyxl:
   ```bash
   python3 -c "
   from openpyxl import load_workbook
   wb = load_workbook('<path>', read_only=True, data_only=True)
   for sheet_name in wb.sheetnames:
       print(f'=== Sheet: {sheet_name} ===')
       ws = wb[sheet_name]
       for row in ws.iter_rows(max_row=100, values_only=True):
           cells = [str(c) if c is not None else '' for c in row]
           print(' | '.join(cells))
       print()
   wb.close()
   "
   ```

4. **For CSV files**, use:
   ```bash
   python3 -c "
   import csv
   with open('<path>', 'r', encoding='utf-8') as f:
       reader = csv.reader(f)
       for i, row in enumerate(reader):
           if i >= 100:
               print('... (truncated at 100 rows)')
               break
           print(' | '.join(row))
   "
   ```

5. **For data analysis**, use pandas:
   ```bash
   python3 -c "
   import pandas as pd
   df = pd.read_excel('<path>')  # or pd.read_csv('<path>')
   print('Shape:', df.shape)
   print()
   print('Columns:', list(df.columns))
   print()
   print(df.head(20).to_string())
   print()
   print(df.describe().to_string())
   "
   ```

6. If dependencies are not installed, guide the user:
   ```bash
   pip install openpyxl pandas
   ```

7. **Analyze and respond** based on the extracted data.

## Notes

- For large files, limit extraction to the first 100 rows unless the user requests more
- Use `data_only=True` for xlsx to get computed values instead of formulas
- CSV encoding detection: try utf-8 first, fall back to gbk or latin-1
- For multi-sheet workbooks, ask the user which sheet(s) to analyze if not specified
