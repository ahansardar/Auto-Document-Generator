from pydantic import BaseModel


class BoxCoords(BaseModel):
    x: float
    y: float
    width: float
    height: float


def browser_to_pdf_coords(x: float, y: float, width: float, height: float, page_height: float) -> BoxCoords:
    # Browser overlays and PyMuPDF page coordinates both use a top-left origin.
    return BoxCoords(x=x, y=y, width=width, height=height)


def pdf_to_browser_coords(x: float, y: float, width: float, height: float, page_height: float) -> BoxCoords:
    return BoxCoords(x=x, y=y, width=width, height=height)
