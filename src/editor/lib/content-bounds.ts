/**
 * Visual content bounds measurement utilities.
 *
 * These functions produce a bounding rect that tightly hugs the actual
 * visual content of an element — unlike getBoundingClientRect(), which
 * returns the CSS layout box (which can be much larger than the visible
 * content, e.g. for full-width text blocks or padded containers).
 */

export interface ContentBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Small inset so the selection box doesn't overlap content exactly. */
const TIGHT_PADDING = 3;

/**
 * Measure the actual visual bounds of text nodes inside an element using
 * the Range API. Falls back to the element's own bounding rect if there
 * are no text nodes.
 */
export function getTextContentBounds(
  element: HTMLElement,
  containerRect: DOMRect
): ContentBounds {
  const elementRect = element.getBoundingClientRect();

  // Collect all text nodes within this element
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node: Text): number {
        return node.textContent?.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    }
  );

  let textNode = walker.nextNode();
  while (textNode) {
    textNodes.push(textNode as Text);
    textNode = walker.nextNode();
  }

  if (!textNodes.length) {
    return rectToContentBounds(elementRect);
  }

  // Build a single bounding box from all text range rects
  let minLeft = Number.POSITIVE_INFINITY;
  let minTop = Number.POSITIVE_INFINITY;
  let maxRight = Number.NEGATIVE_INFINITY;
  let maxBottom = Number.NEGATIVE_INFINITY;

  for (const node of textNodes) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = range.getClientRects();

    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i]!;
      if (rect.width === 0 && rect.height === 0) {
        continue;
      }

      minLeft = Math.min(minLeft, rect.left);
      minTop = Math.min(minTop, rect.top);
      maxRight = Math.max(maxRight, rect.right);
      maxBottom = Math.max(maxBottom, rect.bottom);
    }
  }

  // If we didn't find any measurable text rects, fall back
  if (!Number.isFinite(minLeft)) {
    return rectToContentBounds(elementRect);
  }

  // Clamp to the element's bounding rect
  const clampedLeft = Math.max(minLeft, elementRect.left);
  const clampedTop = Math.max(minTop, elementRect.top);
  const clampedRight = Math.min(maxRight, elementRect.right);
  const clampedBottom = Math.min(maxBottom, elementRect.bottom);

  return applyTightPadding({
    left: clampedLeft,
    top: clampedTop,
    width: Math.max(0, clampedRight - clampedLeft),
    height: Math.max(0, clampedBottom - clampedTop),
  });
}

/**
 * Measure the actual visual bounds of an image element.
 * Uses the image's intrinsic size relative to layout to avoid
 * over-wide selection boxes.
 */
export function getImageContentBounds(
  element: HTMLElement,
  containerRect: DOMRect
): ContentBounds {
  const elementRect = element.getBoundingClientRect();

  // If the element itself is an img, check natural vs rendered size
  if (element instanceof HTMLImageElement) {
    return getImgContentBounds(element, elementRect);
  }

  // Otherwise, look for an img child
  const img = element.querySelector<HTMLImageElement>("img");
  if (img) {
    const imgRect = img.getBoundingClientRect();
    return applyTightPadding({
      left: imgRect.left,
      top: imgRect.top,
      width: imgRect.width,
      height: imgRect.height,
    });
  }

  return rectToContentBounds(elementRect);
}

function getImgContentBounds(
  img: HTMLImageElement,
  elementRect: DOMRect
): ContentBounds {
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;

  // If image hasn't loaded or has no natural size, use element rect
  if (!naturalWidth || !naturalHeight) {
    return rectToContentBounds(elementRect);
  }

  const renderedWidth = elementRect.width;
  const renderedHeight = elementRect.height;

  // Compute the actual displayed image dimensions based on object-fit
  const computedStyle = getComputedStyle(img);
  const objectFit = computedStyle.objectFit || "fill";

  let displayWidth = renderedWidth;
  let displayHeight = renderedHeight;

  if (objectFit === "contain") {
    const scaleX = renderedWidth / naturalWidth;
    const scaleY = renderedHeight / naturalHeight;
    const scale = Math.min(scaleX, scaleY);
    displayWidth = naturalWidth * scale;
    displayHeight = naturalHeight * scale;
  } else if (objectFit === "cover") {
    // cover fills the box, so use the full element rect
    return rectToContentBounds(elementRect);
  }
  // "fill" or "none": use element rect as-is

  if (displayWidth === renderedWidth && displayHeight === renderedHeight) {
    return rectToContentBounds(elementRect);
  }

  // Center the tight bounds within the element rect
  const offsetX = (renderedWidth - displayWidth) / 2;
  const offsetY = (renderedHeight - displayHeight) / 2;

  return applyTightPadding({
    left: elementRect.left + offsetX,
    top: elementRect.top + offsetY,
    width: displayWidth,
    height: displayHeight,
  });
}

/**
 * Measure the actual visual bounds of a generic block element.
 * Uses scrollWidth/scrollHeight to detect when content is
 * smaller than the layout box.
 */
export function getBlockContentBounds(
  element: HTMLElement,
  containerRect: DOMRect
): ContentBounds {
  const elementRect = element.getBoundingClientRect();

  // Use scroll dimensions to measure actual content extent.
  // scrollWidth/Height are in the element's local coordinate space
  // and represent the full content size including overflow.
  const scrollW = element.scrollWidth;
  const scrollH = element.scrollHeight;
  const clientW = element.clientWidth;
  const clientH = element.clientHeight;

  // If content is smaller than the box, tighten
  let contentWidth = clientW;
  let contentHeight = clientH;

  if (scrollW < clientW && scrollW > 0) {
    contentWidth = scrollW;
  }

  if (scrollH < clientH && scrollH > 0) {
    contentHeight = scrollH;
  }

  if (contentWidth === clientW && contentHeight === clientH) {
    return rectToContentBounds(elementRect);
  }

  // Center the tighter content within the element rect
  const offsetX = (clientW - contentWidth) / 2;
  const offsetY = (clientH - contentHeight) / 2;

  return applyTightPadding({
    left: elementRect.left + offsetX,
    top: elementRect.top + offsetY,
    width: contentWidth,
    height: contentHeight,
  });
}

/**
 * Dispatcher: picks the right measurement strategy based on the
 * element's `data-editable` attribute. Falls back to the element's
 * bounding rect if the type is unknown.
 */
export function getVisualContentBounds(element: HTMLElement): ContentBounds {
  const editableType = element.getAttribute("data-editable");
  const elementRect = element.getBoundingClientRect();

  switch (editableType) {
    case "text":
      return getTextContentBounds(element, elementRect);
    case "image":
      return getImageContentBounds(element, elementRect);
    case "block":
      return getBlockContentBounds(element, elementRect);
    default:
      return rectToContentBounds(elementRect);
  }
}

function rectToContentBounds(rect: DOMRect): ContentBounds {
  return applyTightPadding({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  });
}

function applyTightPadding(bounds: ContentBounds): ContentBounds {
  return {
    left: bounds.left - TIGHT_PADDING,
    top: bounds.top - TIGHT_PADDING,
    width: bounds.width + TIGHT_PADDING * 2,
    height: bounds.height + TIGHT_PADDING * 2,
  };
}
