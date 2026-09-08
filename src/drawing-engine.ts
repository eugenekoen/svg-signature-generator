import { Point, Stroke } from './types';

export interface DrawingEngineOptions {
    svgElement: SVGSVGElement;
    containerElement: HTMLElement;
    widthMm?: number;
    heightMm?: number;
    viewBoxWidth?: number;
    viewBoxHeight?: number;
    penColor?: string;
    penWidth?: number;
    onChange?: () => void;
}

export class DrawingEngine {
    public svgElement: SVGSVGElement;
    public containerElement: HTMLElement;
    public readonly viewBoxWidth: number = 500;
    public readonly viewBoxHeight: number = 250;
    public penColor: string = '#0f172a'; // Slate-900 / Deep ink black
    public penWidth: number = 3.0; // Scaled for 500x250 coordinate space

    private strokes: Stroke[] = [];
    private redoStack: Stroke[] = [];
    private currentStroke: Stroke | null = null;
    public isDrawing: boolean = false;
    private activePointerId: number | null = null;
    private onChangeCallback?: () => void;

    // Layer groups inside the SVG
    private backgroundGroup!: SVGGElement;
    private baselineGroup!: SVGGElement;
    private strokesGroup!: SVGGElement;
    private currentStrokePath: SVGPathElement | null = null;

    public showBaseline: boolean = true;

    constructor(options: DrawingEngineOptions) {
        this.svgElement = options.svgElement;
        this.containerElement = options.containerElement;
        if (options.viewBoxWidth) this.viewBoxWidth = options.viewBoxWidth;
        if (options.viewBoxHeight) this.viewBoxHeight = options.viewBoxHeight;
        if (options.penColor) this.penColor = options.penColor;
        if (options.penWidth) this.penWidth = options.penWidth;
        this.onChangeCallback = options.onChange;

        this.initSvgStructure();
        this.attachEventListeners();
        this.render();
    }

    private initSvgStructure(): void {
        this.svgElement.setAttribute('viewBox', `0 0 ${this.viewBoxWidth} ${this.viewBoxHeight}`);
        this.svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        this.svgElement.style.pointerEvents = 'all';
        this.svgElement.style.cursor = 'crosshair';
        this.svgElement.innerHTML = '';

        this.backgroundGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.backgroundGroup.setAttribute('id', 'bg-layer');

        // Solid interactive hit-box rect to guarantee mouse clicks register anywhere on the canvas
        const hitBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        hitBox.setAttribute('width', this.viewBoxWidth.toString());
        hitBox.setAttribute('height', this.viewBoxHeight.toString());
        hitBox.setAttribute('fill', '#ffffff');
        hitBox.setAttribute('pointer-events', 'all');
        hitBox.style.cursor = 'crosshair';
        this.backgroundGroup.appendChild(hitBox);

        this.baselineGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.baselineGroup.setAttribute('id', 'baseline-layer');
        this.baselineGroup.style.pointerEvents = 'none'; // do not block strokes

        this.strokesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.strokesGroup.setAttribute('id', 'strokes-layer');
        this.strokesGroup.style.pointerEvents = 'none';

        this.svgElement.appendChild(this.backgroundGroup);
        this.svgElement.appendChild(this.baselineGroup);
        this.svgElement.appendChild(this.strokesGroup);

        this.updateBaseline();
    }

    public setShowBaseline(show: boolean): void {
        this.showBaseline = show;
        this.updateBaseline();
    }

    private updateBaseline(): void {
        this.baselineGroup.innerHTML = '';
        if (!this.showBaseline) return;

        // Standard signature baseline at 72% of height (Y = 180 out of 250)
        const baselineY = Math.round(this.viewBoxHeight * 0.72);

        // Subtle guide line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '40');
        line.setAttribute('y1', baselineY.toString());
        line.setAttribute('x2', (this.viewBoxWidth - 40).toString());
        line.setAttribute('y2', baselineY.toString());
        line.setAttribute('stroke', '#94a3b8'); // Slate 400
        line.setAttribute('stroke-width', '1.2');
        line.setAttribute('stroke-dasharray', '4 4');
        line.setAttribute('opacity', '0.6');

        // Faint "X" sign mark on the left
        const xMark1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        xMark1.setAttribute('x1', '42');
        xMark1.setAttribute('y1', (baselineY - 14).toString());
        xMark1.setAttribute('x2', '54');
        xMark1.setAttribute('y2', (baselineY - 2).toString());
        xMark1.setAttribute('stroke', '#94a3b8');
        xMark1.setAttribute('stroke-width', '1.5');
        xMark1.setAttribute('stroke-linecap', 'round');
        xMark1.setAttribute('opacity', '0.6');

        const xMark2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        xMark2.setAttribute('x1', '54');
        xMark2.setAttribute('y1', (baselineY - 14).toString());
        xMark2.setAttribute('x2', '42');
        xMark2.setAttribute('y2', (baselineY - 2).toString());
        xMark2.setAttribute('stroke', '#94a3b8');
        xMark2.setAttribute('stroke-width', '1.5');
        xMark2.setAttribute('stroke-linecap', 'round');
        xMark2.setAttribute('opacity', '0.6');

        // "Sign Here" subtle label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '62');
        text.setAttribute('y', (baselineY - 4).toString());
        text.setAttribute('fill', '#94a3b8');
        text.setAttribute('font-size', '11');
        text.setAttribute('font-family', 'sans-serif');
        text.setAttribute('opacity', '0.6');
        text.textContent = 'Sign here';

        this.baselineGroup.appendChild(line);
        this.baselineGroup.appendChild(xMark1);
        this.baselineGroup.appendChild(xMark2);
        this.baselineGroup.appendChild(text);
    }

    private attachEventListeners(): void {
        // We attach listeners to containerElement to ensure all clicks and touches inside the box trigger drawing
        const target = this.containerElement;

        // Pointer Events (Mouse, Touch, Stylus)
        target.addEventListener('pointerdown', this.onPointerDown.bind(this), { passive: false });
        window.addEventListener('pointermove', this.onPointerMove.bind(this), { passive: false });
        window.addEventListener('pointerup', this.onPointerUp.bind(this), { passive: false });
        window.addEventListener('pointercancel', this.onPointerCancel.bind(this), { passive: false });

        // Touch event preventDefault to block mobile pull-to-refresh / zoom
        target.addEventListener('touchstart', (e) => {
            if (e.target === target || this.svgElement.contains(e.target as Node)) {
                e.preventDefault();
            }
        }, { passive: false });

        target.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    private getPointFromEvent(e: PointerEvent | MouseEvent): Point {
        const rect = this.svgElement.getBoundingClientRect();
        const rawX = ((e.clientX - rect.left) / rect.width) * this.viewBoxWidth;
        const rawY = ((e.clientY - rect.top) / rect.height) * this.viewBoxHeight;

        const clampedX = Math.max(0, Math.min(this.viewBoxWidth, rawX));
        const clampedY = Math.max(0, Math.min(this.viewBoxHeight, rawY));

        return {
            x: Math.round(clampedX * 100) / 100,
            y: Math.round(clampedY * 100) / 100,
            pressure: ('pressure' in e && (e as PointerEvent).pressure > 0) ? (e as PointerEvent).pressure : 0.5,
            time: Date.now()
        };
    }

    private onPointerDown(e: PointerEvent): void {
        // Only respond to primary mouse button (left click = 0) or touches/pens
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();

        this.activePointerId = e.pointerId;
        try {
            this.containerElement.setPointerCapture(e.pointerId);
        } catch {
            // Ignore if pointer capture fails
        }

        this.isDrawing = true;
        const pt = this.getPointFromEvent(e);

        this.currentStroke = {
            points: [pt],
            color: this.penColor,
            width: this.penWidth
        };

        // Clear redo stack upon new action
        this.redoStack = [];

        // Create dynamic path element for this stroke
        this.currentStrokePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.currentStrokePath.setAttribute('stroke', this.penColor);
        this.currentStrokePath.setAttribute('stroke-width', this.penWidth.toString());
        this.currentStrokePath.setAttribute('fill', 'none');
        this.currentStrokePath.setAttribute('stroke-linecap', 'round');
        this.currentStrokePath.setAttribute('stroke-linejoin', 'round');
        this.currentStrokePath.setAttribute('d', this.generatePathData(this.currentStroke.points));

        this.strokesGroup.appendChild(this.currentStrokePath);
    }

    private onPointerMove(e: PointerEvent): void {
        if (!this.isDrawing || !this.currentStroke) return;
        if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
        e.preventDefault();

        const pt = this.getPointFromEvent(e);
        const pts = this.currentStroke.points;

        // Filter out duplicate or very close points to optimize vector path
        const lastPt = pts[pts.length - 1];
        const dx = pt.x - lastPt.x;
        const dy = pt.y - lastPt.y;
        if (dx * dx + dy * dy < 0.8) return;

        pts.push(pt);

        if (this.currentStrokePath) {
            this.currentStrokePath.setAttribute('d', this.generatePathData(pts));
        }
    }

    private onPointerUp(e: PointerEvent): void {
        if (!this.isDrawing) return;
        if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
        e.preventDefault();
        this.finalizeStroke();
    }

    private onPointerCancel(e: PointerEvent): void {
        if (!this.isDrawing) return;
        if (this.activePointerId !== null && e.pointerId !== this.activePointerId) return;
        this.finalizeStroke();
    }

    private finalizeStroke(): void {
        if (!this.isDrawing || !this.currentStroke) return;

        if (this.currentStroke.points.length > 0) {
            this.strokes.push(this.currentStroke);
        }

        this.isDrawing = false;
        this.currentStroke = null;
        this.currentStrokePath = null;
        this.activePointerId = null;

        this.renderStrokes();
        this.notifyChange();
    }

    /**
     * Generates silky smooth SVG path data using Midpoint Quadratic Bézier curve smoothing
     */
    public generatePathData(points: Point[]): string {
        if (points.length === 0) return '';
        if (points.length === 1) {
            // Single tap dot: small zero-length line with round caps
            const p = points[0];
            return `M ${p.x} ${p.y} L ${p.x + 0.01} ${p.y}`;
        }
        if (points.length === 2) {
            return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
        }

        let d = `M ${points[0].x} ${points[0].y}`;

        // For 3+ points, connect each mid-point with quadratic bezier curves
        for (let i = 1; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            d += ` Q ${p1.x} ${p1.y}, ${midX} ${midY}`;
        }

        // Connect to the final point
        const last = points[points.length - 1];
        const prev = points[points.length - 2];
        d += ` Q ${prev.x} ${prev.y}, ${last.x} ${last.y}`;

        return d;
    }

    private renderStrokes(): void {
        this.strokesGroup.innerHTML = '';
        for (const stroke of this.strokes) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('stroke', stroke.color);
            path.setAttribute('stroke-width', stroke.width.toString());
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('d', this.generatePathData(stroke.points));
            this.strokesGroup.appendChild(path);
        }
    }

    public render(): void {
        this.renderStrokes();
        this.updateBaseline();
    }

    public undo(): boolean {
        if (this.strokes.length === 0) return false;
        const removed = this.strokes.pop();
        if (removed) {
            this.redoStack.push(removed);
            this.renderStrokes();
            this.notifyChange();
            return true;
        }
        return false;
    }

    public redo(): boolean {
        if (this.redoStack.length === 0) return false;
        const restored = this.redoStack.pop();
        if (restored) {
            this.strokes.push(restored);
            this.renderStrokes();
            this.notifyChange();
            return true;
        }
        return false;
    }

    public clear(): void {
        if (this.strokes.length === 0) return;
        this.redoStack = [...this.strokes]; // Store all for full restore if cleared by accident
        this.strokes = [];
        this.renderStrokes();
        this.notifyChange();
    }

    public canUndo(): boolean {
        return this.strokes.length > 0;
    }

    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    public isEmpty(): boolean {
        return this.strokes.length === 0;
    }

    public getStrokes(): Stroke[] {
        return JSON.parse(JSON.stringify(this.strokes));
    }

    public loadStrokes(strokes: Stroke[]): void {
        this.strokes = JSON.parse(JSON.stringify(strokes));
        this.redoStack = [];
        this.renderStrokes();
        this.notifyChange();
    }

    public setPenColor(color: string): void {
        this.penColor = color;
    }

    public setPenWidth(width: number): void {
        this.penWidth = width;
    }

    private notifyChange(): void {
        if (this.onChangeCallback) {
            this.onChangeCallback();
        }
    }

    /**
     * Computes the bounding box of the actual drawn signature content
     */
    public getContentBounds(): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } | null {
        if (this.strokes.length === 0) return null;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const stroke of this.strokes) {
            const pad = stroke.width;
            for (const pt of stroke.points) {
                if (pt.x - pad < minX) minX = pt.x - pad;
                if (pt.y - pad < minY) minY = pt.y - pad;
                if (pt.x + pad > maxX) maxX = pt.x + pad;
                if (pt.y + pad > maxY) maxY = pt.y + pad;
            }
        }

        minX = Math.max(0, Math.floor(minX));
        minY = Math.max(0, Math.floor(minY));
        maxX = Math.min(this.viewBoxWidth, Math.ceil(maxX));
        maxY = Math.min(this.viewBoxHeight, Math.ceil(maxY));

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: Math.max(10, maxX - minX),
            height: Math.max(10, maxY - minY)
        };
    }
}
