export interface Point {
    x: number;
    y: number;
    pressure?: number;
    time: number;
}

export interface Stroke {
    points: Point[];
    color: string;
    width: number;
}

export interface SignatureRecord {
    id: string;
    staffName: string;
    createdAt: number;
    widthMm: number; // 50
    heightMm: number; // 25
    viewBox: string; // "0 0 500 250"
    strokes: Stroke[];
    svgString: string;
    penColor: string;
    strokeWidth: number;
    thumbnailDataUrl?: string;
}

export interface ExportSettings {
    background: 'transparent' | 'white';
    includeBaseline: boolean;
    trimPadding: boolean;
    staffName: string;
}

