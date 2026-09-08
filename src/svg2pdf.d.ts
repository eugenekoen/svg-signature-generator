declare module 'svg2pdf.js' {
    import { jsPDF } from 'jspdf';

    export interface Svg2PdfOptions {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
    }

    export function svg2pdf(
        element: Element,
        pdf: jsPDF,
        options?: Svg2PdfOptions
    ): Promise<jsPDF>;
}

