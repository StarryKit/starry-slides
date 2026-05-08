import { Toaster, toast } from "sonner";
import { SlidesEditor } from "../index";
import { useSlidesData } from "./use-slides-data";

function StatusScreen({ title, body }: { title: string; body: string }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px",
        background: "#f4efe8",
        color: "#241d16",
        fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
      }}
    >
      <section
        style={{
          maxWidth: "720px",
          padding: "32px",
          borderRadius: "24px",
          background: "rgba(255, 255, 255, 0.82)",
          boxShadow: "0 24px 80px rgba(74, 53, 31, 0.12)",
        }}
      >
        <h1 style={{ margin: "0 0 12px", fontSize: "40px", lineHeight: 1.05 }}>{title}</h1>
        <p style={{ margin: 0, fontSize: "20px", lineHeight: 1.5 }}>{body}</p>
      </section>
    </main>
  );
}

function App() {
  const {
    deckTitle,
    slides,
    errorMessage,
    isLoading,
    isSaving,
    saveSlides,
    saveDeckTitle,
    exportPdf,
    exportHtml,
  } = useSlidesData();

  if (isLoading) {
    return (
      <StatusScreen
        title="Loading generated deck"
        body="The app is importing the latest generated slides."
      />
    );
  }

  if (errorMessage) {
    return <StatusScreen title="Generated deck required" body={errorMessage} />;
  }

  return (
    <>
      <Toaster position="top-center" richColors closeButton />
      <SlidesEditor
        slides={slides}
        deckTitle={deckTitle}
        isSaving={isSaving}
        onSlidesChange={saveSlides}
        onDeckTitleChange={saveDeckTitle}
        onExportPdf={(request) => {
          const toastId = toast.loading("Exporting PDF...");
          void exportPdf(request)
            .then(() => {
              toast.success("PDF export is ready.", { id: toastId });
            })
            .catch((error) => {
              toast.error("PDF export failed.", {
                id: toastId,
                description: error instanceof Error ? error.message : String(error),
              });
            });
        }}
        onExportHtml={() => {
          const toastId = toast.loading("Exporting HTML...");
          void exportHtml()
            .then(() => {
              toast.success("HTML export is ready.", { id: toastId });
            })
            .catch((error) => {
              toast.error("HTML export failed.", {
                id: toastId,
                description: error instanceof Error ? error.message : String(error),
              });
            });
        }}
      />
    </>
  );
}

export default App;
