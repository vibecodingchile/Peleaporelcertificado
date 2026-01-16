from io import BytesIO
from reportlab.pdfgen import canvas

def build_pdf(nombre: str, score: int) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(72, 750, "Certificado de Finalizacion")

    c.setFont("Helvetica", 12)
    c.drawString(72, 710, f"Se certifica que {nombre}")
    c.drawString(72, 690, f"Completo CyberDoom con score {score}")

    c.showPage()
    c.save()
    return buffer.getvalue()