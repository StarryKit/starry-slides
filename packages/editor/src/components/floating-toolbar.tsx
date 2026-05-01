import { useEffect, useRef } from "react";

const TOOLBAR_FADE_MS = 140;

const TOOLBAR_ACTIONS = [
  {
    title: "Bold",
    icon: (
      <path
        d="M6 4.5h4.3c2.1 0 3.7 1.2 3.7 3.1 0 1.2-.6 2.1-1.8 2.7 1.6.5 2.4 1.6 2.4 3.1 0 2.2-1.7 3.6-4.3 3.6H6zm2 1.7v3.3h2c1.2 0 2-.6 2-1.7 0-1-.7-1.6-2-1.6zm0 5v3.6h2.4c1.4 0 2.2-.7 2.2-1.8s-.8-1.8-2.2-1.8z"
        fill="currentColor"
      />
    ),
  },
  {
    title: "Italic",
    icon: <path d="M8 4.5v1.5h2.1l-2.2 8H5.8V15h6.2v-1.5H9.9l2.2-8H14V4.5z" fill="currentColor" />,
  },
  {
    title: "Underline",
    icon: (
      <path
        d="M6 4.5v5.1c0 2.4 1.6 4 4 4s4-1.6 4-4V4.5h-2v5c0 1.4-.8 2.3-2 2.3s-2-.9-2-2.3v-5zm-1 11v1.5h10V15.5z"
        fill="currentColor"
      />
    ),
  },
  {
    title: "Text color",
    icon: (
      <path
        d="M9.2 4.5 5 15h2.1l.9-2.4h4l.9 2.4H15L10.8 4.5zm-.5 6.4L10 7.1l1.3 3.8zm-4.2 5.6h11v1.5h-11z"
        fill="currentColor"
      />
    ),
  },
  {
    title: "Alignment",
    icon: (
      <path
        d="M4 5h12v1.5H4zm2 3.25h8v1.5H6zM4 11.5h12V13H4zm2 3.25h8v1.5H6z"
        fill="currentColor"
      />
    ),
  },
];

function FloatingToolbar() {
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = toolbarRef.current;
    if (!node) {
      return;
    }

    node.animate(
      [
        {
          opacity: 0,
          filter: "blur(6px)",
        },
        {
          opacity: 1,
          filter: "blur(0px)",
        },
      ],
      {
        duration: TOOLBAR_FADE_MS,
        easing: "ease",
        fill: "both",
      }
    );

    return () => {
      const currentNode = toolbarRef.current;
      const stagePanel = currentNode?.closest(".hse-stage-panel");
      if (!(currentNode instanceof HTMLElement) || !(stagePanel instanceof HTMLElement)) {
        return;
      }

      const toolbarRect = currentNode.getBoundingClientRect();
      const stageRect = stagePanel.getBoundingClientRect();
      const ghost = currentNode.cloneNode(true);

      if (!(ghost instanceof HTMLElement)) {
        return;
      }

      ghost.classList.add("hse-floating-toolbar-ghost");
      ghost.setAttribute("aria-hidden", "true");
      ghost.style.left = `${toolbarRect.left - stageRect.left}px`;
      ghost.style.top = `${toolbarRect.top - stageRect.top}px`;
      ghost.style.width = `${toolbarRect.width}px`;
      ghost.style.height = `${toolbarRect.height}px`;

      stagePanel.appendChild(ghost);

      const animation = ghost.animate(
        [
          {
            opacity: 1,
            filter: "blur(0px)",
          },
          {
            opacity: 0,
            filter: "blur(6px)",
          },
        ],
        {
          duration: TOOLBAR_FADE_MS,
          easing: "ease",
          fill: "forwards",
        }
      );

      void animation.finished.finally(() => {
        ghost.remove();
      });
    };
  }, []);

  return (
    <div className="hse-floating-toolbar" ref={toolbarRef}>
      <div className="hse-floating-toolbar-actions" aria-label="Basic formatting toolbar">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.title}
            className="hse-floating-toolbar-button"
            type="button"
            title={`${action.title} UI placeholder`}
            aria-label={action.title}
          >
            <svg aria-hidden="true" viewBox="0 0 20 20">
              {action.icon}
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

export { FloatingToolbar };
