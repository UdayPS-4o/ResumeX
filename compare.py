import sys
import fitz  # PyMuPDF
from PIL import Image, ImageChops

def pdf_to_image(pdf_path, dpi=150):
    doc = fitz.open(pdf_path)
    page = doc.load_page(0)
    pix = page.get_pixmap(dpi=dpi)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    doc.close()
    return img

def compare():
    orig_pdf = r"C:\Users\udayps\Downloads\Resume__Uday_PS (1).pdf"
    modern_pdf = r"modern.pdf"
    
    img1 = pdf_to_image(orig_pdf)
    img2 = pdf_to_image(modern_pdf)
    
    # Make them the same size
    max_w = max(img1.width, img2.width)
    max_h = max(img1.height, img2.height)
    
    bg1 = Image.new("RGB", (max_w, max_h), (255, 255, 255))
    bg1.paste(img1, (0, 0))
    
    bg2 = Image.new("RGB", (max_w, max_h), (255, 255, 255))
    bg2.paste(img2, (0, 0))
    
    # Create side-by-side
    combined = Image.new("RGB", (max_w * 2, max_h), (255, 255, 255))
    combined.paste(bg1, (0, 0))
    combined.paste(bg2, (max_w, 0))
    combined.save("comparison.png")
    
    # Create diff
    diff = ImageChops.difference(bg1, bg2)
    diff.save("diff.png")
    print("Created comparison.png and diff.png")

if __name__ == "__main__":
    compare()
