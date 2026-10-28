print("1. STARTING", flush=True)
import sys
import os
import asyncio

print("2. BEFORE BACKEND IMPORT", flush=True)
from backend.main import upload_document, get_content
from backend.storage import store
print("3. AFTER BACKEND IMPORT", flush=True)

class FakeUpload:
    def __init__(self, filename, data):
        self.filename = filename
        self.data = data
    async def read(self):
        return self.data

async def run_tests():
    print("Testing image upload...")
    # Read sample image
    with open("frontend/src/assets/hero.png", "rb") as f:
        img_bytes = f.read()

    fake = FakeUpload("test_banner.png", img_bytes)
    result = await upload_document(
        file=fake,
        title="Test Hero Image",
        channel="Global Marketing Landing Page",
        content_type="web",
        creator_id="usr_creator",
        creator_name="Alex Morgan",
        ocr_text=""
    )

    print("Created Item ID:", result.id)
    print("Is Image:", result.is_image)
    print("Image URL:", result.image_url)
    print("Extracted Text:", repr(result.versions[0].extracted_text))
    print("Findings Count:", len(result.findings))

    assert result.is_image is True, "Expected is_image=True"
    assert result.image_url is not None and result.image_url.startswith("/uploads/"), "Expected /uploads/ URL"
    assert "PNG" not in result.versions[0].extracted_text[:4], "Raw binary PNG bytes should NOT be in extracted_text!"
    assert len(result.findings) > 0, "Expected at least 1 visual/accessibility finding"

    # Verify get_content endpoint
    content_pack = get_content(result.id)
    assert content_pack["content"].image_url == result.image_url
    print("get_content verified successfully!")

    # Test with OCR text provided
    fake_ocr = FakeUpload("marketing_graphic.png", img_bytes)
    ocr_result = await upload_document(
        file=fake_ocr,
        title="Graphic with Slogan",
        channel="Social Media",
        content_type="social",
        creator_id="usr_creator",
        creator_name="Alex Morgan",
        ocr_text="CloudSync provides cheap enterprise cloud sync and is the #1 tool in the world."
    )
    print("OCR Item ID:", ocr_result.id)
    print("OCR Findings Count:", len(ocr_result.findings))
    categories = [f.category for f in ocr_result.findings]
    print("Categories flagged:", categories)
    assert "terminology" in categories, "Should flag CloudSync / cheap"
    assert "claims" in categories, "Should flag #1 claim"
    assert "accessibility" in categories, "Should flag accessibility alt-text requirement"
    print("All assertions passed successfully!")

if __name__ == "__main__":
    asyncio.run(run_tests())
