import { baseStyles, wrapHtml } from "./shared.mjs";

export function buildImageSlide() {
  return wrapHtml(
    `${baseStyles("linear-gradient(145deg, #f7f2ea 0%, #f4fbff 48%, #eff6ff 100%)")}
    .header {
      margin-bottom: 28px;
    }
    .header .kicker {
      background: rgba(124, 58, 237, 0.1);
      color: #6d28d9;
    }
    .header h1 {
      margin-top: 18px;
      max-width: 1140px;
      font-size: 74px;
      line-height: 1.02;
      letter-spacing: -0.03em;
    }
    .header p {
      margin-top: 18px;
      max-width: 960px;
      font-size: 24px;
      line-height: 1.5;
      color: rgba(31, 41, 55, 0.74);
    }
    .gallery {
      display: grid;
      grid-template-columns: 1.25fr 0.9fr;
      gap: 24px;
      height: 760px;
    }
    .hero-image,
    .stack-card {
      position: relative;
      overflow: hidden;
      border-radius: 34px;
      background: rgba(255, 255, 255, 0.78);
      border: 1px solid rgba(255, 255, 255, 0.88);
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
    }
    .hero-image img,
    .stack-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .caption {
      position: absolute;
      left: 22px;
      right: 22px;
      bottom: 22px;
      padding: 18px 20px;
      border-radius: 22px;
      background: rgba(15, 23, 42, 0.66);
      color: #f8fafc;
      backdrop-filter: blur(10px);
    }
    .caption strong {
      display: block;
      margin-bottom: 8px;
      font-size: 22px;
    }
    .caption span {
      font-size: 18px;
      line-height: 1.45;
      color: rgba(226, 232, 240, 0.86);
    }
    .stack {
      display: grid;
      grid-template-rows: 1fr 1fr;
      gap: 24px;
    }`,
    `
      <div class="header">
        <div class="kicker" data-editable="text">Images</div>
        <h1 data-editable="text">Image-heavy slides expose sizing, cropping, and selection behavior around data-editable image nodes</h1>
        <p data-editable="text">The images here are inline data URIs, so the generated deck remains self-contained and portable. That keeps the fixture stable for tests and demo environments.</p>
      </div>
      <div class="gallery">
        <figure class="hero-image" data-editable="block">
          <img
            data-editable="image"
            alt="Illustrated browser editing canvas"
            src="data:image/svg+xml;utf8,${encodeURIComponent(`
              <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 760'>
                <defs>
                  <linearGradient id='bg' x1='0' x2='1' y1='0' y2='1'>
                    <stop offset='0%' stop-color='#0f172a'/>
                    <stop offset='100%' stop-color='#1d4ed8'/>
                  </linearGradient>
                </defs>
                <rect width='1200' height='760' rx='48' fill='url(#bg)'/>
                <rect x='92' y='88' width='1016' height='584' rx='30' fill='#f8fafc' opacity='0.96'/>
                <rect x='140' y='148' width='216' height='456' rx='24' fill='#e2e8f0'/>
                <rect x='394' y='148' width='566' height='456' rx='28' fill='#ffffff'/>
                <rect x='988' y='148' width='80' height='456' rx='20' fill='#dbeafe'/>
                <rect x='444' y='204' width='356' height='42' rx='21' fill='#0f172a'/>
                <rect x='444' y='278' width='434' height='24' rx='12' fill='#94a3b8'/>
                <rect x='444' y='324' width='396' height='24' rx='12' fill='#cbd5e1'/>
                <rect x='444' y='388' width='438' height='142' rx='30' fill='#dbeafe'/>
                <circle cx='1032' cy='202' r='18' fill='#1d4ed8'/>
                <circle cx='1032' cy='252' r='18' fill='#38bdf8'/>
                <circle cx='1032' cy='302' r='18' fill='#7dd3fc'/>
              </svg>
            `)}"
          />
          <figcaption class="caption" data-editable="block">
            <strong data-editable="text">Product mockup</strong>
            <span data-editable="text">A synthetic image that represents the iframe editor, sidebar, and inspector working together.</span>
          </figcaption>
        </figure>
        <div class="stack">
          <figure class="stack-card" data-editable="block">
            <img
              data-editable="image"
              alt="Collaboration illustration"
              src="data:image/svg+xml;utf8,${encodeURIComponent(`
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 760 360'>
                  <defs>
                    <linearGradient id='g1' x1='0' x2='1' y1='0' y2='1'>
                      <stop offset='0%' stop-color='#f59e0b'/>
                      <stop offset='100%' stop-color='#ef4444'/>
                    </linearGradient>
                  </defs>
                  <rect width='760' height='360' rx='36' fill='#fff7ed'/>
                  <circle cx='168' cy='182' r='92' fill='url(#g1)' opacity='0.9'/>
                  <rect x='288' y='88' width='352' height='56' rx='28' fill='#1f2937'/>
                  <rect x='288' y='164' width='268' height='26' rx='13' fill='#94a3b8'/>
                  <rect x='288' y='208' width='308' height='26' rx='13' fill='#cbd5e1'/>
                  <rect x='288' y='252' width='224' height='26' rx='13' fill='#e2e8f0'/>
                </svg>
              `)}"
            />
            <figcaption class="caption" data-editable="block">
              <strong data-editable="text">Workflow illustration</strong>
              <span data-editable="text">Demonstrates another aspect ratio and image crop behavior.</span>
            </figcaption>
          </figure>
          <figure class="stack-card" data-editable="block">
            <img
              data-editable="image"
              alt="Metrics dashboard illustration"
              src="data:image/svg+xml;utf8,${encodeURIComponent(`
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 760 360'>
                  <rect width='760' height='360' rx='36' fill='#eff6ff'/>
                  <rect x='72' y='76' width='616' height='208' rx='28' fill='#ffffff'/>
                  <rect x='112' y='118' width='94' height='126' rx='22' fill='#93c5fd'/>
                  <rect x='234' y='142' width='94' height='102' rx='22' fill='#60a5fa'/>
                  <rect x='356' y='96' width='94' height='148' rx='22' fill='#3b82f6'/>
                  <rect x='478' y='164' width='94' height='80' rx='22' fill='#1d4ed8'/>
                  <rect x='600' y='128' width='48' height='116' rx='18' fill='#1e3a8a'/>
                </svg>
              `)}"
            />
            <figcaption class="caption" data-editable="block">
              <strong data-editable="text">Metric art</strong>
              <span data-editable="text">Useful for testing images beside text-dense captions and different crop regions.</span>
            </figcaption>
          </figure>
        </div>
      </div>
    `
  );
}
