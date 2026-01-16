import streamlit as st
from utils.certificate import build_pdf

st.set_page_config(page_title="CyberDoom", layout="centered")

st.title("🛡️ CyberDoom: Guardia de Datos")

nombre = st.text_input("Nombre para el certificado")
score = st.number_input("Score", min_value=0, step=1)

if st.button("Generar certificado"):
    pdf = build_pdf(nombre, int(score))
    st.download_button(
        "⬇️ Descargar certificado",
        data=pdf,
        file_name="certificado_cyberdoom.pdf",
        mime="application/pdf"
    )