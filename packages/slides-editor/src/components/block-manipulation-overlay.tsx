import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { SNAP_GUIDE_COLOR } from "../lib/block-snap-constants";
import type { ResizeHandleCorner, ResizeHandlePosition } from "../lib/block-snap-types";

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SnapGuide {
  orientation: "vertical" | "horizontal";
  start: Point;
  end: Point;
  variant: "alignment" | "spacing";
}

interface BlockManipulationOverlayProps {
  selectionBounds: Rect;
  snapGuides: SnapGuide[];
  resizeHandles: Array<{
    position: ResizeHandlePosition;
    x: number;
    y: number;
  }>;
  rotationZones: Array<{
    corner: ResizeHandleCorner;
    x: number;
    y: number;
  }>;
  onResizeHandleMouseDown: (
    position: ResizeHandlePosition,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => void;
  onCornerRotationZoneMouseDown: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

// Rotation cursor SVGs — one per corner (provided by Mine77)
// Each has a white outline with drop shadow + black inner arrow
function makeRotationCursor(svgBody: string) {
  return encodeURIComponent(
    `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="none">${svgBody}</g></svg>`
  );
}

const ROTATION_CURSOR_TOP_LEFT = makeRotationCursor(
  `<path d="M9.25586 18.0001H10C10 16.7304 9.98325 15.7073 10.2217 14.8174L10.3477 14.4024C11.0437 12.3601 12.7151 10.7853 14.8174 10.2217L15.1572 10.1436C15.9666 9.98704 16.8889 10.0001 18 10.0001V9.25591C18.0006 7.85135 19.5606 7.03837 20.7041 7.78814L20.8135 7.86529V7.86627L24.4014 10.6104C25.316 11.3106 25.3174 12.689 24.4014 13.3897L20.8135 16.1338V16.1348C19.6622 17.0148 18.0006 16.1934 18 14.7442V14.0001C16.4717 14.0001 16.1053 14.0173 15.8525 14.085C14.9903 14.3163 14.3162 14.9903 14.085 15.8526C14.0172 16.1054 14 16.4717 14 18.0001H14.7441V19.0001H13.0059C13.0025 18.7242 13 18.3961 13 18.0001C13 16.541 13.0085 16.0068 13.1191 15.5938C13.4429 14.3864 14.3864 13.4429 15.5938 13.1192C16.0067 13.0085 16.5409 13.0001 18 13.0001C18.3961 13.0001 18.7241 13.0028 19 13.0059V14.7442C19.0002 15.3652 19.7126 15.7172 20.2061 15.3399L23.7939 12.5958C24.1864 12.2956 24.1862 11.7046 23.7939 11.4044L20.2061 8.66021C19.7127 8.28343 19.0003 8.63508 19 9.25591V11.003C18.6975 10.9998 18.3665 11.0001 18 11.0001C16.6696 11.0001 15.8076 10.9916 15.0762 11.1876C13.1786 11.6962 11.6962 13.1787 11.1875 15.0762C10.9915 15.8076 11 16.6697 11 18.0001C11 18.3665 11.0007 18.6976 11.0039 19.0001H9.25586C8.63503 19.0004 8.28338 19.7127 8.66016 20.2061L11.4043 23.794C11.7045 24.1862 12.2956 24.1864 12.5957 23.794L15.3398 20.2061C15.7171 19.7127 15.3652 19.0003 14.7441 19.0001V18.0001C16.1933 18.0006 17.0147 19.6623 16.1348 20.8135H16.1338L13.3897 24.4014C12.6889 25.3174 11.3105 25.3161 10.6104 24.4014L7.86621 20.8135H7.86524C6.98648 19.663 7.8061 18.0007 9.25586 18.0001Z" fill="#fff" filter="url(#rtl-shadow)"/><path d="M19 9.2559C19.0003 8.63502 19.7127 8.28335 20.2061 8.6602L23.794 11.4043C24.1862 11.7046 24.1864 12.2956 23.794 12.5957L20.2061 15.3399C19.7127 15.7171 19.0003 15.3652 19 14.7442V13.0059C18.7242 13.0027 18.3961 13 18 13C16.5409 13 16.0068 13.0085 15.5938 13.1192C14.3864 13.4429 13.4429 14.3864 13.1192 15.5938C13.0085 16.0068 13 16.5409 13 18C13 18.3961 13.0026 18.7242 13.0059 19H14.7442C15.3652 19.0003 15.7171 19.7127 15.3399 20.2061L12.5957 23.794C12.2956 24.1864 11.7046 24.1862 11.4043 23.794L8.6602 20.2061C8.28335 19.7127 8.63503 19.0003 9.2559 19H11.0039C11.0007 18.6976 11 18.3665 11 18C11 16.6696 10.9916 15.8076 11.1875 15.0762C11.6962 13.1786 13.1786 11.6962 15.0762 11.1875C15.8076 10.9916 16.6696 11 18 11C18.3665 11 18.6976 10.9997 19 11.003V9.2559Z" fill="#000"/><defs><filter id="rtl-shadow" x="6.503" y="7.503" width="19.585" height="19.585" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation=".5"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1"/><feBlend mode="normal" in="SourceGraphic" in2="effect1" result="shape"/></filter></defs>`
);

const ROTATION_CURSOR_TOP_RIGHT = makeRotationCursor(
  `<path d="M22.7441 18.0001H22C22 16.7304 22.0168 15.7073 21.7783 14.8174L21.6523 14.4024C20.9563 12.3601 19.2849 10.7853 17.1826 10.2217L16.8428 10.1436C16.0334 9.98704 15.1111 10.0001 14 10.0001V9.25591C13.9994 7.85135 12.4394 7.03837 11.2959 7.78814L11.1865 7.86529V7.86627L7.59863 10.6104C6.68398 11.3106 6.68261 12.689 7.59863 13.3897L11.1865 16.1338V16.1348C12.3378 17.0148 13.9994 16.1934 14 14.7442V14.0001C15.5283 14.0001 15.8947 14.0173 16.1475 14.085C17.0097 14.3163 17.6838 14.9903 17.915 15.8526C17.9828 16.1054 18 16.4717 18 18.0001H17.2559V19.0001H18.9941C18.9975 18.7242 19 18.3961 19 18.0001C19 16.541 18.9915 16.0068 18.8809 15.5938C18.5571 14.3864 17.6136 13.4429 16.4062 13.1192C15.9933 13.0085 15.4591 13.0001 14 13.0001C13.6039 13.0001 13.2759 13.0028 13 13.0059V14.7442C12.9998 15.3652 12.2874 15.7172 11.7939 15.3399L8.20605 12.5958C7.81365 12.2956 7.81382 11.7046 8.20605 11.4044L11.7939 8.66021C12.2873 8.28343 12.9997 8.63508 13 9.25591V11.003C13.3025 10.9998 13.6335 11.0001 14 11.0001C15.3304 11.0001 16.1924 10.9916 16.9238 11.1876C18.8214 11.6962 20.3038 13.1787 20.8125 15.0762C21.0085 15.8076 21 16.6697 21 18.0001C21 18.3665 20.9993 18.6976 20.9961 19.0001H22.7441C23.365 19.0004 23.7166 19.7127 23.3398 20.2061L20.5957 23.794C20.2955 24.1862 19.7044 24.1864 19.4043 23.794L16.6602 20.2061C16.2829 19.7127 16.6348 19.0003 17.2559 19.0001V18.0001C15.8067 18.0006 14.9853 19.6623 15.8652 20.8135H15.8662L18.6103 24.4014C19.3111 25.3174 20.6895 25.3161 21.3896 24.4014L24.1338 20.8135H24.1348C25.0135 19.663 24.1939 18.0007 22.7441 18.0001Z" fill="#fff" filter="url(#rtr-shadow)"/><path d="M13 9.2559C12.9997 8.63502 12.2873 8.28335 11.7939 8.6602L8.20604 11.4043C7.81381 11.7046 7.81363 12.2956 8.20604 12.5957L11.7939 15.3399C12.2873 15.7171 12.9997 15.3652 13 14.7442V13.0059C13.2758 13.0027 13.6039 13 14 13C15.4591 13 15.9932 13.0085 16.4062 13.1192C17.6136 13.4429 18.5571 14.3864 18.8808 15.5938C18.9915 16.0068 19 16.5409 19 18C19 18.3961 18.9974 18.7242 18.9941 19H17.2558C16.6348 19.0003 16.2829 19.7127 16.6601 20.2061L19.4043 23.794C19.7044 24.1864 20.2954 24.1862 20.5957 23.794L23.3398 20.2061C23.7166 19.7127 23.365 19.0003 22.7441 19H20.9961C20.9993 18.6976 21 18.3665 21 18C21 16.6696 21.0084 15.8076 20.8125 15.0762C20.3038 13.1786 18.8214 11.6962 16.9238 11.1875C16.1924 10.9916 15.3304 11 14 11C13.6335 11 13.3024 10.9997 13 11.003V9.2559Z" fill="#000"/><defs><filter id="rtr-shadow" x="5.912" y="7.503" width="19.585" height="19.585" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation=".5"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1"/><feBlend mode="normal" in="SourceGraphic" in2="effect1" result="shape"/></filter></defs>`
);

const ROTATION_CURSOR_BOTTOM_RIGHT = makeRotationCursor(
  `<path d="M22.7441 13.9999H22C22 15.2696 22.0168 16.2927 21.7783 17.1826L21.6523 17.5976C20.9563 19.6399 19.2849 21.2147 17.1826 21.7783L16.8428 21.8564C16.0334 22.013 15.1111 21.9999 14 21.9999V22.7441C13.9994 24.1486 12.4394 24.9616 11.2959 24.2119L11.1865 24.1347V24.1337L7.59863 21.3896C6.68398 20.6894 6.68261 19.311 7.59863 18.6103L11.1865 15.8662V15.8652C12.3378 14.9852 13.9994 15.8066 14 17.2558V17.9999C15.5283 17.9999 15.8947 17.9827 16.1475 17.915C17.0097 17.6837 17.6838 17.0097 17.915 16.1474C17.9828 15.8946 18 15.5283 18 13.9999H17.2559V12.9999H18.9941C18.9975 13.2758 19 13.6039 19 13.9999C19 15.459 18.9915 15.9932 18.8809 16.4062C18.5571 17.6136 17.6136 18.5571 16.4062 18.8808C15.9933 18.9915 15.4591 18.9999 14 18.9999C13.6039 18.9999 13.2759 18.9972 13 18.9941V17.2558C12.9998 16.6348 12.2874 16.2828 11.7939 16.6601L8.20605 19.4042C7.81365 19.7044 7.81382 20.2954 8.20605 20.5956L11.7939 23.3398C12.2873 23.7166 12.9997 23.3649 13 22.7441V20.997C13.3025 21.0002 13.6335 20.9999 14 20.9999C15.3304 20.9999 16.1924 21.0084 16.9238 20.8124C18.8214 20.3038 20.3038 18.8213 20.8125 16.9238C21.0085 16.1924 21 15.3303 21 13.9999C21 13.6335 20.9993 13.3024 20.9961 12.9999H22.7441C23.365 12.9996 23.7166 12.2873 23.3398 11.7939L20.5957 8.206C20.2955 7.81377 19.7044 7.81359 19.4043 8.206L16.6602 11.7939C16.2829 12.2873 16.6348 12.9997 17.2559 12.9999V13.9999C15.8067 13.9994 14.9853 12.3377 15.8652 11.1865H15.8662L18.6103 7.59858C19.3111 6.68256 20.6895 6.68393 21.3896 7.59858L24.1338 11.1865H24.1348C25.0135 12.337 24.1939 13.9993 22.7441 13.9999Z" fill="#fff" filter="url(#rbr-shadow)"/><path d="M13 22.7441C12.9997 23.365 12.2873 23.7166 11.7939 23.3398L8.20604 20.5957C7.81381 20.2954 7.81363 19.7044 8.20604 19.4043L11.7939 16.6601C12.2873 16.2829 12.9997 16.6348 13 17.2558V18.9941C13.2758 18.9973 13.6039 19 14 19C15.4591 19 15.9932 18.9915 16.4062 18.8808C17.6136 18.5571 18.5571 17.6136 18.8808 16.4062C18.9915 15.9932 19 15.4591 19 14C19 13.6039 18.9974 13.2758 18.9941 13H17.2558C16.6348 12.9997 16.2829 12.2873 16.6601 11.7939L19.4043 8.20604C19.7044 7.81363 20.2954 7.81381 20.5957 8.20604L23.3398 11.7939C23.7166 12.2873 23.365 12.9997 22.7441 13H20.9961C20.9993 13.3024 21 13.6335 21 14C21 15.3304 21.0084 16.1924 20.8125 16.9238C20.3038 18.8214 18.8214 20.3038 16.9238 20.8125C16.1924 21.0084 15.3304 21 14 21C13.6335 21 13.3024 21.0003 13 20.997V22.7441Z" fill="#000"/><defs><filter id="rbr-shadow" x="5.912" y="6.912" width="19.585" height="19.585" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation=".5"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1"/><feBlend mode="normal" in="SourceGraphic" in2="effect1" result="shape"/></filter></defs>`
);

const ROTATION_CURSOR_BOTTOM_LEFT = makeRotationCursor(
  `<path d="M9.25586 13.9999H10C10 15.2696 9.98325 16.2927 10.2217 17.1826L10.3477 17.5976C11.0437 19.6399 12.7151 21.2147 14.8174 21.7783L15.1572 21.8564C15.9666 22.013 16.8889 21.9999 18 21.9999V22.7441C18.0006 24.1486 19.5606 24.9616 20.7041 24.2119L20.8135 24.1347V24.1337L24.4014 21.3896C25.316 20.6894 25.3174 19.311 24.4014 18.6103L20.8135 15.8662V15.8652C19.6622 14.9852 18.0006 15.8066 18 17.2558V17.9999C16.4717 17.9999 16.1053 17.9827 15.8525 17.915C14.9903 17.6837 14.3162 17.0097 14.085 16.1474C14.0172 15.8946 14 15.5283 14 13.9999H14.7441V12.9999H13.0059C13.0025 13.2758 13 13.6039 13 13.9999C13 15.459 13.0085 15.9932 13.1191 16.4062C13.4429 17.6136 14.3864 18.5571 15.5938 18.8808C16.0067 18.9915 16.5409 18.9999 18 18.9999C18.3961 18.9999 18.7241 18.9972 19 18.9941V17.2558C19.0002 16.6348 19.7126 16.2828 20.2061 16.6601L23.7939 19.4042C24.1864 19.7044 24.1862 20.2954 23.7939 20.5956L20.2061 23.3398C19.7127 23.7166 19.0003 23.3649 19 22.7441V20.997C18.6975 21.0002 18.3665 20.9999 18 20.9999C16.6696 20.9999 15.8076 21.0084 15.0762 20.8124C13.1786 20.3038 11.6962 18.8213 11.1875 16.9238C10.9915 16.1924 11 15.3303 11 13.9999C11 13.6335 11.0007 13.3024 11.0039 12.9999H9.25586C8.63503 12.9996 8.28338 12.2873 8.66016 11.7939L11.4043 8.206C11.7045 7.81377 12.2956 7.81359 12.5957 8.206L15.3398 11.7939C15.7171 12.2873 15.3652 12.9997 14.7441 12.9999V13.9999C16.1933 13.9994 17.0147 12.3377 16.1348 11.1865H16.1338L13.3897 7.59858C12.6889 6.68256 11.3105 6.68393 10.6104 7.59858L7.86621 11.1865H7.86524C6.98648 12.337 7.8061 13.9993 9.25586 13.9999Z" fill="#fff" filter="url(#rbl-shadow)"/><path d="M19 22.7441C19.0003 23.365 19.7127 23.7166 20.2061 23.3398L23.794 20.5957C24.1862 20.2954 24.1864 19.7044 23.794 19.4043L20.2061 16.6601C19.7127 16.2829 19.0003 16.6348 19 17.2558V18.9941C18.7242 18.9973 18.3961 19 18 19C16.5409 19 16.0068 18.9915 15.5938 18.8808C14.3864 18.5571 13.4429 17.6136 13.1192 16.4062C13.0085 15.9932 13 15.4591 13 14C13 13.6039 13.0026 13.2758 13.0059 13H14.7442C15.3652 12.9997 15.7171 12.2873 15.3399 11.7939L12.5957 8.20604C12.2956 7.81363 11.7046 7.81381 11.4043 8.20604L8.6602 11.7939C8.28335 12.2873 8.63503 12.9997 9.2559 13H11.0039C11.0007 13.3024 11 13.6335 11 14C11 15.3304 10.9916 16.1924 11.1875 16.9238C11.6962 18.8214 13.1786 20.3038 15.0762 20.8125C15.8076 21.0084 16.6696 21 18 21C18.3665 21 18.6976 21.0003 19 20.997V22.7441Z" fill="#000"/><defs><filter id="rbl-shadow" x="6.503" y="6.912" width="19.585" height="19.585" filterUnits="userSpaceOnUse"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation=".5"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1"/><feBlend mode="normal" in="SourceGraphic" in2="effect1" result="shape"/></filter></defs>`
);

const ROTATION_CURSORS: Record<ResizeHandleCorner, string> = {
  "top-left": ROTATION_CURSOR_TOP_LEFT,
  "top-right": ROTATION_CURSOR_TOP_RIGHT,
  "bottom-right": ROTATION_CURSOR_BOTTOM_RIGHT,
  "bottom-left": ROTATION_CURSOR_BOTTOM_LEFT,
};

function BlockManipulationOverlay({
  selectionBounds: _selectionBounds,
  snapGuides,
  resizeHandles,
  rotationZones,
  onResizeHandleMouseDown,
  onCornerRotationZoneMouseDown,
}: BlockManipulationOverlayProps) {
  const handleClassName =
    "absolute z-[5] size-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-foreground shadow-[0_2px_8px_rgba(0,0,0,0.16)] transition-colors before:absolute before:inset-[3px] before:rounded-full before:bg-white/90 hover:bg-foreground/80";

  return (
    <>
      {snapGuides.map((guide, index) => {
        const lineWidth = guide.variant === "spacing" ? "2px" : "1px";
        const capLength = 14;
        const capThickness = guide.variant === "spacing" ? 2 : 1;
        const isVertical = guide.orientation === "vertical";
        const lineStyle: CSSProperties = isVertical
          ? {
              left: `${guide.start.x}px`,
              top: `${Math.min(guide.start.y, guide.end.y)}px`,
              width: "0",
              height: `${Math.max(Math.abs(guide.end.y - guide.start.y), 32)}px`,
              borderLeftWidth: lineWidth,
              borderLeftStyle: "solid",
              borderLeftColor: SNAP_GUIDE_COLOR,
              opacity: guide.variant === "spacing" ? 0.9 : 0.82,
            }
          : {
              left: `${Math.min(guide.start.x, guide.end.x)}px`,
              top: `${guide.start.y}px`,
              width: `${Math.max(Math.abs(guide.end.x - guide.start.x), 32)}px`,
              height: "0",
              borderTopWidth: lineWidth,
              borderTopStyle: "solid",
              borderTopColor: SNAP_GUIDE_COLOR,
              opacity: guide.variant === "spacing" ? 0.9 : 0.82,
            };
        const capStyle: CSSProperties = isVertical
          ? {
              width: `${capLength}px`,
              height: `${capThickness}px`,
              left: `${-capLength / 2}px`,
              backgroundColor: SNAP_GUIDE_COLOR,
            }
          : {
              width: `${capThickness}px`,
              height: `${capLength}px`,
              top: `${-capLength / 2}px`,
              backgroundColor: SNAP_GUIDE_COLOR,
            };
        return (
          <div
            key={`${guide.orientation}-${guide.start.x}-${guide.start.y}-${guide.end.x}-${guide.end.y}-${guide.variant}-${index}`}
            className="pointer-events-none absolute z-[4]"
            data-testid={`snap-guide-${guide.orientation}`}
            data-variant={guide.variant}
            style={lineStyle}
          >
            {guide.variant === "spacing" ? (
              <>
                <span
                  className="absolute"
                  data-testid="snap-guide-cap"
                  style={
                    isVertical
                      ? {
                          ...capStyle,
                          top: "0",
                        }
                      : {
                          ...capStyle,
                          left: "0",
                        }
                  }
                />
                <span
                  className="absolute"
                  data-testid="snap-guide-cap"
                  style={
                    isVertical
                      ? {
                          ...capStyle,
                          bottom: "0",
                        }
                      : {
                          ...capStyle,
                          right: "0",
                        }
                  }
                />
              </>
            ) : null}
          </div>
        );
      })}
      {rotationZones.map((zone) => (
        <button
          key={zone.corner}
          type="button"
          className="absolute z-[4] size-[50px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent"
          data-testid={`block-rotation-zone-${zone.corner}`}
          aria-label={`Rotate selected element from ${zone.corner}`}
          style={{
            left: `${zone.x}px`,
            top: `${zone.y}px`,
            cursor: `url("data:image/svg+xml,${ROTATION_CURSORS[zone.corner]}") 12 12, grab`,
          }}
          onMouseDown={onCornerRotationZoneMouseDown}
        />
      ))}
      {resizeHandles.map((handle) => (
        <button
          key={handle.position}
          type="button"
          className={`${handleClassName} ${getResizeHandleCursorClassName(handle.position)}`}
          data-testid={`block-resize-handle-${handle.position}`}
          aria-label={`Resize selected element from ${handle.position}`}
          style={{
            left: `${handle.x}px`,
            top: `${handle.y}px`,
          }}
          onMouseDown={(event) => {
            if (event.button !== 0) return;
            onResizeHandleMouseDown(handle.position, event);
          }}
        />
      ))}
    </>
  );
}

function getResizeHandleCursorClassName(position: ResizeHandlePosition) {
  if (position === "top-center" || position === "bottom-center") {
    return "cursor-ns-resize";
  }

  if (position === "left-center" || position === "right-center") {
    return "cursor-ew-resize";
  }

  return position === "top-left" || position === "bottom-right"
    ? "cursor-nwse-resize"
    : "cursor-nesw-resize";
}

export { BlockManipulationOverlay };
