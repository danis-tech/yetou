"""Aperçus publics des photos : résolution réduite + filigrane incrusté.

Le site public ne reçoit jamais le fichier original d'une photo : seulement cet
aperçu, généré à partir de l'original. « Enregistrer l'image sous » ne donne
donc qu'une image réduite et marquée. L'original ne sort qu'après achat, par
un lien signé et temporaire (PurchaseViewSet.download).
"""

import io
import logging
import math

from django.core.files.base import ContentFile
from PIL import Image, ImageDraw, ImageFont, ImageOps

logger = logging.getLogger(__name__)

PREVIEW_MAX_SIDE = 1600      # px : assez pour juger une image, inutilisable en impression
PREVIEW_QUALITY = 78
WATERMARK_TEXT = "Pixia"


def _font(size: int):
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # Pillow < 10.1
        return ImageFont.load_default()


def watermark(img: Image.Image) -> Image.Image:
    """Incruste un filigrane « Pixia » en diagonale, répété sur toute l'image,
    plus un bandeau lisible en bas : impossible à recadrer sans le garder."""
    base = img.convert("RGBA")
    w, h = base.size
    size = max(28, int(min(w, h) / 9))
    font = _font(size)

    # Motif répété sur un calque plus grand, tourné puis recadré au centre.
    diag = int(math.hypot(w, h))
    layer = Image.new("RGBA", (diag, diag), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    step_x, step_y = int(size * 4.2), int(size * 2.4)
    for row, y in enumerate(range(0, diag, step_y)):
        offset = (row % 2) * step_x // 2
        for x in range(-step_x + offset, diag, step_x):
            draw.text((x, y), WATERMARK_TEXT, font=font, fill=(255, 255, 255, 58),
                      stroke_width=max(1, size // 18), stroke_fill=(0, 0, 0, 38))
    layer = layer.rotate(-24, resample=Image.BICUBIC)
    left, top = (diag - w) // 2, (diag - h) // 2
    base.alpha_composite(layer.crop((left, top, left + w, top + h)))

    # Bandeau bas : mention explicite (ASCII : la police intégrée à Pillow n'a
    # pas tous les caractères accentués).
    band_h = max(26, h // 20)
    band = Image.new("RGBA", (w, band_h), (20, 35, 58, 150))
    ImageDraw.Draw(band).text(
        (band_h // 2, band_h // 2), "Pixia  |  Achetez l'image pour l'obtenir sans filigrane",
        font=_font(int(band_h * 0.45)), fill=(255, 255, 255, 235), anchor="lm",
    )
    base.alpha_composite(band, (0, h - band_h))
    return base.convert("RGB")


def build_preview(media) -> bool:
    """Génère (ou régénère) l'aperçu filigrané d'une photo. Renvoie True si fait."""
    if media.type != "photo" or not media.file:
        return False
    try:
        with media.file.open("rb") as fh:
            img = Image.open(fh)
            img = ImageOps.exif_transpose(img)
            img.thumbnail((PREVIEW_MAX_SIDE, PREVIEW_MAX_SIDE), Image.LANCZOS)
            img = watermark(img)
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=PREVIEW_QUALITY, optimize=True, progressive=True)
    except Exception:
        logger.exception("Aperçu impossible pour le média %s", media.pk)
        return False

    source = media.file.name
    media.preview.save(f"preview-{media.pk}.jpg", ContentFile(out.getvalue()), save=False)
    media.preview_source = source
    type(media).objects.filter(pk=media.pk).update(preview=media.preview.name, preview_source=source)
    return True
