---
name: document-word
description: "You MUST use this skill when the user wants to read, extract text from, or analyze Word (.docx) documents. Uses python-docx for extraction."
version: "1.0.0"
---

# Document Word Processing

You are helping the user process Word (.docx) documents.

## Steps

1. **Identify the .docx file path** from the user's request.

2. **Check if the file exists** using your Bash tool:
   ```bash
   test -f "<path>" && echo "exists" || echo "not found"
   ```

3. **Extract text content** using python-docx:
   ```bash
   python3 -c "
   from docx import Document
   doc = Document('<path>')
   for para in doc.paragraphs:
       if para.text.strip():
           print(para.text)
   "
   ```

4. **For tables**, use:
   ```bash
   python3 -c "
   from docx import Document
   doc = Document('<path>')
   for table in doc.tables:
       for row in table.rows:
           cells = [cell.text.strip() for cell in row.cells]
           print(' | '.join(cells))
       print('---')
   "
   ```

5. If python-docx is not installed, guide the user:
   ```bash
   pip install python-docx
   ```

6. **Analyze and respond** based on the extracted content.

## Notes

- .doc format is not supported by python-docx — only .docx
- For documents with complex formatting, extracted text may lose some structure
- Headers, footers, and comments are not extracted by default
