from pydantic import BaseModel


class BoxCoords(BaseModel):
    x: float
    y: float
    width: float
    height: float


def browser_to_pdf_coords(x: float, y: float, width: float, height: float, page_height: float) -> BoxCoords:
    # Browser overlays use top-left origin. PDFs use bottom-left origin, so only y is flipped.
    return BoxCoords(x=x, y=page_height - y - height, width=width, height=height)


def pdf_to_browser_coords(x: float, y: float, width: float, height: float, page_height: float) -> BoxCoords:
    # This is the inverse of browser_to_pdf_coords and keeps stored layout portable across zoom levels.
    return BoxCoords(x=x, y=page_height - y - height, width=width, height=height)
