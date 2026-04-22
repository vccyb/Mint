---
name: document-ppt
description: "You MUST use this skill when the user wants to read, extract text from, or analyze PowerPoint (.pptx) presentations. Uses python-pptx for extraction."
version: "1.0.0"
---

# Document PowerPoint Processing

You are helping the user process PowerPoint (.pptx) presentations.

## Steps

1. **Identify the .pptx file path** from the user's request.

2. **Check if the file exists** using your Bash tool:
   ```bash
   test -f "<path>" && echo "exists" || echo "not found"
   ```

3. **Extract text content** using python-pptx:
   ```bash
   python3 -c "
   from pptx import Presentation
   from pptx.util import Inches
   prs = Presentation('<path>')
   for slide_num, slide in enumerate(prs.slides, 1):
       print(f'=== Slide {slide_num} ===')
       for shape in slide.shapes:
           if shape.has_text_frame:
               for para in shape.text_frame.paragraphs:
                   text = para.text.strip()
                   if text:
                       print(text)
       print()
   "
   ```

4. **For tables in slides**, use:
   ```bash
   python3 -c "
   from pptx import Presentation
   prs = Presentation('<path>')
   for slide_num, slide in enumerate(prs.slides, 1):
       for shape in slide.shapes:
           if shape.has_table:
               print(f'=== Slide {slide_num} - Table ===')
               table = shape.table
               for row in table.rows:
                   cells = [cell.text.strip() for cell in row.cells]
                   print(' | '.join(cells))
               print()
   "
   ```

5. If python-pptx is not installed, guide the user:
   ```bash
   pip install python-pptx
   ```

6. **Analyze and respond** based on the extracted content.

## Notes

- Only .pptx format is supported (not .ppt)
- Speaker notes can be extracted with `slide.notes_slide.notes_text_frame.text`
- Images, charts, and embedded media cannot be extracted as text
