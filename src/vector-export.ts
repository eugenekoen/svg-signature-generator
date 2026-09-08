import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { DrawingEngine } from './drawing-engine';
import { ExportSettings } from './types';

/**
 * Builds clean, standalone SVG markup for the current drawing
 */
export function generateSvgMarkup(drawingEngine: DrawingEngine, settings: ExportSettings): string {
    const strokes = drawingEngine.getStrokes();
    let viewBox = `0 0 ${drawingEngine.viewBoxWidth} ${drawingEngine.viewBoxHeight}`;

    if (settings.trimPadding) {
        const bounds = drawingEngine.getContentBounds();
        if (bounds) {
            // Add a small 8px margin
            const margin = 8;
            const x = Math.max(0, bounds.minX - margin);
            const y = Math.max(0, bounds.minY - margin);
            const w = Math.min(drawingEngine.viewBoxWidth - x, bounds.width + margin * 2);
            const h = Math.min(drawingEngine.viewBoxHeight - y, bounds.height + margin * 2);
            viewBox = `${x} ${y} ${w} ${h}`;
        }
    }

    let pathsMarkup = '';
    for (const stroke of strokes) {
        const d = drawingEngine.generatePathData(stroke.points);
        pathsMarkup += `    <path d="${d}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" />\n`;
    }

    let backgroundMarkup = '';
    if (settings.background === 'white') {
        backgroundMarkup = `    <rect width="100%" height="100%" fill="#ffffff" />\n`;
    }

    let baselineMarkup = '';
    if (settings.includeBaseline) {
        const baselineY = Math.round(drawingEngine.viewBoxHeight * 0.72);
        baselineMarkup = `
    <!-- Baseline guide -->
    <g opacity="0.6">
      <line x1="40" y1="${baselineY}" x2="${drawingEngine.viewBoxWidth - 40}" y2="${baselineY}" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="4 4" />
      <line x1="42" y1="${baselineY - 14}" x2="54" y2="${baselineY - 2}" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" />
      <line x1="54" y1="${baselineY - 14}" x2="42" y2="${baselineY - 2}" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" />
      <text x="62" y="${baselineY - 4}" fill="#94a3b8" font-size="11" font-family="system-ui, -apple-system, sans-serif">Sign here</text>
    </g>\n`;
    }

    const staffComment = settings.staffName ? `Staff Member: ${settings.staffName}` : 'Staff Signature';
    const timestamp = new Date().toISOString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- 
  ${staffComment}
  Created: ${timestamp}
  Dimensions: 50mm x 25mm (5cm x 2.5cm)
  Generator: SVG Signature Generator
-->
<svg xmlns="http://www.w3.org/2000/svg" 
     width="50mm" 
     height="25mm" 
     viewBox="${viewBox}" 
     style="shape-rendering: geometricPrecision; text-rendering: geometricPrecision;">
${backgroundMarkup}${baselineMarkup}${pathsMarkup}</svg>`;
}

/**
 * Downloads the given SVG string as an .svg file
 */
export function downloadSvgFile(svgString: string, filename: string): void {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    triggerFileDownload(blob, filename.endsWith('.svg') ? filename : `${filename}.svg`);
}

/**
 * Generates and downloads a 100% vector PDF file (exact 50mm x 25mm dimensions)
 * without any rasterization.
 */
export async function downloadVectorPdf(
    drawingEngine: DrawingEngine,
    settings: ExportSettings,
    filename: string
): Promise<void> {
    const svgMarkup = generateSvgMarkup(drawingEngine, settings);

    // Parse SVG string into a DOM element
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
    const svgElement = doc.documentElement;

    // Create jsPDF document with exact dimensions 50mm x 25mm
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [50, 25],
        compress: true
    });

    // Temporarily attach to hidden container in the document so svg2pdf can compute styles/transforms
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-99999px';
    container.style.left = '-99999px';
    container.style.visibility = 'hidden';
    container.appendChild(svgElement);
    document.body.appendChild(container);

    try {
        await svg2pdf(svgElement, pdf, {
            x: 0,
            y: 0,
            width: 50,
            height: 25
        });

        const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
        pdf.save(safeFilename);
    } finally {
        document.body.removeChild(container);
    }
}

/**
 * Generates an A4 Office Signature Sheet PDF containing metadata and the exact 5cm x 2.5cm vector signature box.
 */
export async function downloadA4DocumentPdf(
    drawingEngine: DrawingEngine,
    settings: ExportSettings,
    filename: string
): Promise<void> {
    const svgMarkup = generateSvgMarkup(drawingEngine, { ...settings, background: 'transparent' });

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
    const svgElement = doc.documentElement;

    // A4 portrait is 210mm x 297mm
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const pageWidth = 210;
    const pageMargin = 20;

    // Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(15, 23, 42); // slate-900
    pdf.text('Electronic Signature Verification Sheet', pageMargin, 25);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139); // slate-500
    pdf.text('Official Office Document Verification & Signature Sample', pageMargin, 31);

    // Divider
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.5);
    pdf.line(pageMargin, 35, pageWidth - pageMargin, 35);

    // Metadata block
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(30, 41, 59);
    pdf.text('Staff Details & Specifications', pageMargin, 45);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(71, 85, 105);

    const staffName = settings.staffName || 'Office Staff Member';
    const dateStr = new Date().toLocaleString();

    pdf.text(`Staff Name: ${staffName}`, pageMargin, 52);
    pdf.text(`Date & Time: ${dateStr}`, pageMargin, 58);
    pdf.text(`Signature Box Dimensions: 50.0 mm × 25.0 mm (5.0 cm × 2.5 cm)`, pageMargin, 64);
    pdf.text(`Format: Native Vector (Lossless SVG-to-PDF)`, pageMargin, 70);

    // Signature Block Frame (Exact 50mm x 25mm)
    const sigX = pageMargin;
    const sigY = 82;
    const sigWidth = 50;
    const sigHeight = 25;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(30, 41, 59);
    pdf.text('Authorized Signature (1:1 Exact Physical Size: 5cm × 2.5cm):', pageMargin, 78);

    // Draw signature bounding box
    pdf.setDrawColor(203, 213, 225); // slate-300
    pdf.setLineWidth(0.3);
    pdf.rect(sigX, sigY, sigWidth, sigHeight);

    // Render vector signature inside the box
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-99999px';
    container.style.left = '-99999px';
    container.style.visibility = 'hidden';
    container.appendChild(svgElement);
    document.body.appendChild(container);

    try {
        await svg2pdf(svgElement, pdf, {
            x: sigX,
            y: sigY,
            width: sigWidth,
            height: sigHeight
        });
    } finally {
        document.body.removeChild(container);
    }

    // Under-box label
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Signatory acknowledgment of official office electronic signature record', pageMargin, 112);

    const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(safeFilename);
}

/**
 * Utility helper to trigger a browser download
 */
function triggerFileDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

