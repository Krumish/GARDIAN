import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import React from "react";
import { createRoot } from "react-dom/client";
import PrintableReport from "./PrintableReport";

export async function generateTransmittalPDFBlob(reports) {
  // 1. Mount PrintableReport into an off-screen div
  const container = document.createElement("div");
  
  // FIXED: Removed 'visibility: hidden;' because html2canvas will draw a blank box if it is hidden!
  // It is already invisible to the user because of the -99999px position.
  container.style.cssText = `
    position: absolute;
    top: -99999px;
    left: -99999px;
    width: 816px;
    background: white;
    z-index: -1;
  `;
  document.body.appendChild(container);

  // 2. Render component and wait for images/fonts to load
  await new Promise((resolve) => {
    const root = createRoot(container);
    root.render(React.createElement(PrintableReport, { reports }));
    // Wait slightly longer just to be safe with React 18's async rendering
    setTimeout(resolve, 1500);
  });

  try {
    const pdf = new jsPDF({ unit: "px", format: "letter", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    
    // Look for individual pages/reports, or fallback to the whole container if the class is missing
    let children = container.querySelectorAll(".report-container");
    if (children.length === 0) {
      console.warn("Class '.report-container' not found. Capturing the entire component instead.");
      children = [container.firstElementChild || container];
    }

    for (let i = 0; i < children.length; i++) {
      const canvas = await html2canvas(children[i], {
        scale: 2, // High resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const ratio = canvas.width / canvas.height;
      const imgW = pageW - 40; // 20px padding on each side
      const imgH = imgW / ratio;
      const finalH = imgH > pageH - 40 ? pageH - 40 : imgH;
      const finalW = finalH * ratio;
      const xOffset = (pageW - finalW) / 2;

      // Only add a new page if it's the second child or beyond
      if (i > 0) pdf.addPage();
      
      pdf.addImage(imgData, "JPEG", xOffset, 20, finalW, finalH);
    }

    return pdf.output("blob");
  } finally {
    // Clean up the hidden div after generating the PDF
    document.body.removeChild(container);
  }
}