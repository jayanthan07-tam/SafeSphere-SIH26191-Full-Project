from __future__ import annotations

from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet


def report_to_pdf(title: str, scope: dict, content: dict) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    story = [Paragraph(title, styles["Title"]), Spacer(1, 10)]
    if scope:
        story.append(Paragraph("Scope", styles["Heading2"]))
        rows = [[str(k), str(v)] for k, v in scope.items()]
        t = Table(rows, colWidths=[140, 360])
        t.setStyle(TableStyle([("GRID", (0,0), (-1,-1), 0.25, colors.grey), ("VALIGN", (0,0), (-1,-1), "TOP")]))
        story += [t, Spacer(1, 12)]
    story.append(Paragraph("Report Content", styles["Heading2"]))
    for key, value in content.items():
        story.append(Paragraph(f"<b>{key}</b>", styles["BodyText"]))
        story.append(Paragraph(str(value).replace("&", "&amp;").replace("<", "&lt;"), styles["BodyText"]))
        story.append(Spacer(1, 6))
    story.append(Spacer(1, 12))
    story.append(Paragraph("Decision-support output. Verify source data, field conditions and authority approvals before operational decisions.", styles["Italic"]))
    doc.build(story)
    return buffer.getvalue()
