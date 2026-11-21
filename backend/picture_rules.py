
MAX_PICTURE_BYTES = 5 * 1024 * 1024

def content_type_for_extension(extension):
    content_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }

    return content_types.get(extension.lower())


def matches_image_signature(content, extension):
    if extension.lower() in (".jpg", ".jpeg"):
        return content.startswith(b"\xff\xd8\xff")

    if extension.lower() == ".png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")

    if extension.lower() == ".webp":
        return (
            len(content) >= 12
            and content[:4] == b"RIFF"
            and content[8:12] == b"WEBP"
        )

    return False
