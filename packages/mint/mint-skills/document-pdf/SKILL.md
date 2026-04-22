---
name: document-pdf
description: "You MUST use this skill when the user wants to read, extract text from, or analyze PDF files. Uses pdftotext or python pdfplumber for extraction."
version: "1.0.0"
---

# Document PDF Processing

You are helping the user process PDF documents.

## Steps

1. **Identify the PDF file path** from the user's request. If the path is relative, resolve it relative to the project root.

2. **Check if the file exists** using your Bash tool:
   ```bash
   test -f "<path>" && echo "exists" || echo "not found"
   ```

3. **Extract text content** using the best available method:

   **Method A: pdftotext (preferred)**
   ```bash
   pdftotext "<path>" -
   ```

   **Method B: python with pdfplumber**
   ```bash
   python3 -c "
   import pdfplumber
   with pdfplumber.open('<path>') as pdf:
       for page in pdf.pages:
           text = page.extract_text()
           if text:
               print(text)
   "
   ```

   **Method C: python with PyPDF2 (fallback)**
   ```bash
   python3 -c "
   from PyPDF2 import PdfReader
   reader = PdfReader('<path>')
   for page in reader.pages:
       text = page.extract_text()
       if text:
           print(text)
   "
   ```

4. If no PDF tool is installed, guide the user:
   ```bash
   pip install pdfplumber
   # or
   brew install poppler  # for pdftotext
   ```

5. **Analyze and respond** based on the extracted text. The user may want:
   - Summary of the document
   - Key information extraction
   - Translation
   - Answering specific questions about the content

## Notes

- For large PDFs, only extract the first 50 pages unless the user requests more
- If the PDF contains scanned images (no extractable text), inform the user that OCR is needed
- Always preserve the structure of the original document when summarizing
