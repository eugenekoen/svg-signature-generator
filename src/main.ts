import { DrawingEngine } from './drawing-engine';
import { generateSvgMarkup, downloadSvgFile, downloadVectorPdf, downloadA4DocumentPdf } from './vector-export';
import { signatureStore } from './storage';
import { ExportSettings, SignatureRecord } from './types';

// DOM Elements
const svgElement = document.getElementById('signature-svg') as unknown as SVGSVGElement;
const canvasWrapper = document.getElementById('canvas-wrapper') as HTMLElement;
const previewSvg = document.getElementById('preview-svg') as unknown as SVGSVGElement;

// Action Buttons
const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
const btnRedo = document.getElementById('btn-redo') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
const btnDownloadSvg = document.getElementById('btn-download-svg') as HTMLButtonElement;
const btnDownloadPdf = document.getElementById('btn-download-pdf') as HTMLButtonElement;
const btnSaveHistory = document.getElementById('btn-save-history') as HTMLButtonElement;
const btnCopySvg = document.getElementById('btn-copy-svg') as HTMLButtonElement;
const btnDownloadA4 = document.getElementById('btn-download-a4') as HTMLButtonElement;
const btnClearHistory = document.getElementById('btn-clear-history') as HTMLButtonElement;

// Settings Controls
const staffNameInput = document.getElementById('staff-name') as HTMLInputElement;
const toggleBaseline = document.getElementById('toggle-baseline') as HTMLInputElement;
const toggleBg = document.getElementById('toggle-bg') as HTMLInputElement;
const toggleGuideExport = document.getElementById('toggle-guide-export') as HTMLInputElement;
const colorSwatches = document.querySelectorAll<HTMLButtonElement>('.color-swatch-btn');
const widthButtons = document.querySelectorAll<HTMLButtonElement>('.width-btn');

// History Container & Toast Container
const historyGrid = document.getElementById('history-grid') as HTMLElement;
const emptyHistoryMsg = document.getElementById('empty-history-msg') as HTMLElement;
const toastContainer = document.getElementById('toast-container') as HTMLElement;

// Fullscreen & Rotation Elements
const standardCanvasSlot = document.getElementById('standard-canvas-slot') as HTMLElement;
const fullscreenCanvasSlot = document.getElementById('fullscreen-canvas-slot') as HTMLElement;
const btnFullscreenToggle = document.getElementById('btn-fullscreen-toggle') as HTMLElement;
const fsBtnUndo = document.getElementById('fs-btn-undo') as HTMLButtonElement;
const fsBtnRedo = document.getElementById('fs-btn-redo') as HTMLButtonElement;
const fsBtnClear = document.getElementById('fs-btn-clear') as HTMLButtonElement;
const fsBtnDone = document.getElementById('fs-btn-done') as HTMLButtonElement;

// Initialize Drawing Engine
const engine = new DrawingEngine({
    svgElement,
    containerElement: canvasWrapper,
    viewBoxWidth: 500,
    viewBoxHeight: 250,
    penColor: '#0f172a',
    penWidth: 3.2,
    onChange: onDrawingStateChanged
});

function getExportSettings(): ExportSettings {
    return {
        background: toggleBg.checked ? 'white' : 'transparent',
        includeBaseline: toggleGuideExport.checked,
        trimPadding: false,
        staffName: staffNameInput.value.trim()
    };
}

function getSafeFilename(extension: 'svg' | 'pdf'): string {
    const staff = staffNameInput.value.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'signature';
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    return `${staff}_5x2.5cm_${dateStr}.${extension}`;
}

function onDrawingStateChanged(): void {
    const hasStrokes = !engine.isEmpty();
    btnUndo.disabled = !engine.canUndo();
    btnRedo.disabled = !engine.canRedo();
    btnClear.disabled = !hasStrokes;
    btnDownloadSvg.disabled = !hasStrokes;
    btnDownloadPdf.disabled = !hasStrokes;
    btnSaveHistory.disabled = !hasStrokes;
    btnCopySvg.disabled = !hasStrokes;
    btnDownloadA4.disabled = !hasStrokes;

    // Synchronize Fullscreen HUD buttons
    if (fsBtnUndo) fsBtnUndo.disabled = !engine.canUndo();
    if (fsBtnRedo) fsBtnRedo.disabled = !engine.canRedo();
    if (fsBtnClear) fsBtnClear.disabled = !hasStrokes;

    if (hasStrokes) {
        canvasWrapper.classList.add('canvas-has-strokes');
    } else {
        canvasWrapper.classList.remove('canvas-has-strokes');
    }

    // Update 1:1 physical preview box
    updatePhysicalPreview();
}

function updatePhysicalPreview(): void {
    if (engine.isEmpty()) {
        previewSvg.innerHTML = '<text x="250" y="130" text-anchor="middle" fill="#94a3b8" font-size="28" font-family="sans-serif">5cm × 2.5cm</text>';
        return;
    }

    const settings = getExportSettings();
    const svgMarkup = generateSvgMarkup(engine, settings);
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
    const innerContent = doc.documentElement.innerHTML;
    previewSvg.innerHTML = innerContent;
}

// Button Events
btnUndo.addEventListener('click', () => engine.undo());
btnRedo.addEventListener('click', () => engine.redo());
btnClear.addEventListener('click', () => engine.clear());

// Toggles
toggleBaseline.addEventListener('change', () => {
    engine.setShowBaseline(toggleBaseline.checked);
});

toggleBg.addEventListener('change', () => {
    if (toggleBg.checked) {
        canvasWrapper.style.backgroundColor = '#ffffff';
    } else {
        canvasWrapper.style.backgroundColor = '#ffffff';
    }
    updatePhysicalPreview();
});

toggleGuideExport.addEventListener('change', () => {
    updatePhysicalPreview();
});

// Color Picker
colorSwatches.forEach((btn) => {
    btn.addEventListener('click', () => {
        colorSwatches.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const color = btn.dataset.color || '#0f172a';
        engine.setPenColor(color);
    });
});

// Width Presets
widthButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        widthButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const width = parseFloat(btn.dataset.width || '3.2');
        engine.setPenWidth(width);
    });
});

// Download SVG
btnDownloadSvg.addEventListener('click', () => {
    if (engine.isEmpty()) return;
    const settings = getExportSettings();
    const svgString = generateSvgMarkup(engine, settings);
    const filename = getSafeFilename('svg');
    downloadSvgFile(svgString, filename);
    autoSaveToHistory();
    showToast(`Downloaded ${filename} (50mm × 25mm Vector SVG)`);
});

// Download Vector PDF
btnDownloadPdf.addEventListener('click', async () => {
    if (engine.isEmpty()) return;
    const settings = getExportSettings();
    const filename = getSafeFilename('pdf');
    btnDownloadPdf.disabled = true;

    try {
        await downloadVectorPdf(engine, settings, filename);
        autoSaveToHistory();
        showToast(`Downloaded ${filename} (50mm × 25mm Pure Vector PDF)`);
    } catch (err) {
        console.error('Failed to generate PDF:', err);
        showToast('Error generating vector PDF');
    } finally {
        btnDownloadPdf.disabled = false;
    }
});

// Download A4 Sheet PDF
btnDownloadA4.addEventListener('click', async () => {
    if (engine.isEmpty()) return;
    const settings = getExportSettings();
    const staff = staffNameInput.value.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'staff';
    const filename = `${staff}_signature_verification_sheet.pdf`;
    btnDownloadA4.disabled = true;

    try {
        await downloadA4DocumentPdf(engine, settings, filename);
        showToast('Downloaded A4 Verification Sheet PDF');
    } catch (err) {
        console.error('Failed to generate A4 sheet:', err);
        showToast('Error generating sheet PDF');
    } finally {
        btnDownloadA4.disabled = false;
    }
});

// Copy SVG
btnCopySvg.addEventListener('click', async () => {
    if (engine.isEmpty()) return;
    const settings = getExportSettings();
    const svgString = generateSvgMarkup(engine, settings);
    try {
        await navigator.clipboard.writeText(svgString);
        showToast('SVG markup copied to clipboard');
    } catch {
        showToast('Failed to copy to clipboard');
    }
});

// Save to History Manually
btnSaveHistory.addEventListener('click', () => {
    if (engine.isEmpty()) return;
    saveSignatureRecord();
    showToast('Signature saved to in-memory history');
});

function autoSaveToHistory(): void {
    // Only auto-save if not already an identical record
    saveSignatureRecord();
}

function saveSignatureRecord(): void {
    const settings = getExportSettings();
    const svgString = generateSvgMarkup(engine, settings);
    const strokes = engine.getStrokes();

    const record: SignatureRecord = {
        id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        staffName: staffNameInput.value.trim() || 'Staff Signature',
        createdAt: Date.now(),
        widthMm: 50,
        heightMm: 25,
        viewBox: `0 0 ${engine.viewBoxWidth} ${engine.viewBoxHeight}`,
        strokes,
        svgString,
        penColor: engine.penColor,
        strokeWidth: engine.penWidth
    };

    signatureStore.addSignature(record);
}

// Clear History Button
btnClearHistory.addEventListener('click', () => {
    if (confirm('Clear all saved signatures from memory?')) {
        signatureStore.clearAll();
        showToast('Signature history cleared');
    }
});

// Subscribe to History Changes
signatureStore.subscribe((records) => {
    renderHistory(records);
});

function renderHistory(records: SignatureRecord[]): void {
    if (records.length === 0) {
        emptyHistoryMsg.style.display = 'block';
        btnClearHistory.style.display = 'none';
        // Remove any existing cards
        const cards = historyGrid.querySelectorAll('.history-card');
        cards.forEach((card) => card.remove());
        return;
    }

    emptyHistoryMsg.style.display = 'none';
    btnClearHistory.style.display = 'inline-flex';

    // Remove existing cards and re-render
    const cards = historyGrid.querySelectorAll('.history-card');
    cards.forEach((card) => card.remove());

    for (const item of records) {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.dataset.id = item.id;

        const dateFormatted = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        card.innerHTML = `
      <div class="history-preview-box">
        ${item.svgString}
      </div>
      <div class="history-meta">
        <span class="history-staff-name">${escapeHtml(item.staffName)}</span>
        <span class="history-date">${dateFormatted}</span>
      </div>
      <div class="history-actions">
        <button class="btn btn-sm btn-hist-svg" title="Download SVG">SVG</button>
        <button class="btn btn-sm btn-hist-pdf" title="Download Vector PDF">PDF</button>
        <button class="btn btn-sm btn-hist-load" title="Load back into drawing canvas">Edit</button>
        <button class="btn btn-sm btn-danger btn-hist-del" title="Delete from memory">✕</button>
      </div>
    `;

        // Hook events
        const btnHistSvg = card.querySelector('.btn-hist-svg') as HTMLButtonElement;
        const btnHistPdf = card.querySelector('.btn-hist-pdf') as HTMLButtonElement;
        const btnHistLoad = card.querySelector('.btn-hist-load') as HTMLButtonElement;
        const btnHistDel = card.querySelector('.btn-hist-del') as HTMLButtonElement;

        btnHistSvg.addEventListener('click', () => {
            const filename = `${item.staffName.replace(/[^a-zA-Z0-9_-]/g, '_')}_5x2.5cm.svg`;
            downloadSvgFile(item.svgString, filename);
            showToast(`Downloaded ${filename}`);
        });

        btnHistPdf.addEventListener('click', async () => {
            // Re-create vector PDF directly from the stored strokes
            const tempEngine = new DrawingEngine({
                svgElement: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
                containerElement: document.createElement('div'),
                viewBoxWidth: 500,
                viewBoxHeight: 250
            });
            tempEngine.loadStrokes(item.strokes);
            const filename = `${item.staffName.replace(/[^a-zA-Z0-9_-]/g, '_')}_5x2.5cm.pdf`;
            await downloadVectorPdf(tempEngine, {
                background: 'transparent',
                includeBaseline: false,
                trimPadding: false,
                staffName: item.staffName
            }, filename);
            showToast(`Downloaded ${filename}`);
        });

        btnHistLoad.addEventListener('click', () => {
            engine.loadStrokes(item.strokes);
            staffNameInput.value = item.staffName;
            showToast(`Loaded "${item.staffName}" to canvas`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        btnHistDel.addEventListener('click', () => {
            signatureStore.deleteSignature(item.id);
            showToast('Deleted signature from memory');
        });

        historyGrid.appendChild(card);
    }
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    <span>${escapeHtml(message)}</span>
  `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// Keyboard shortcuts for Undo / Redo
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
            engine.redo();
        } else {
            engine.undo();
        }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        engine.redo();
    } else if (e.key === 'Escape' && document.body.classList.contains('fullscreen-mode')) {
        exitFullscreen();
    }
});

// Fullscreen & Mobile Landscape Mode Management
let isAutoLandscapeMode = false;

function enterFullscreen(auto: boolean = false): void {
    isAutoLandscapeMode = auto;
    document.body.classList.add('fullscreen-mode');
    fullscreenCanvasSlot.appendChild(canvasWrapper);
}

function exitFullscreen(): void {
    isAutoLandscapeMode = false;
    document.body.classList.remove('fullscreen-mode');
    standardCanvasSlot.appendChild(canvasWrapper);
    updatePhysicalPreview();
}

if (btnFullscreenToggle) {
    btnFullscreenToggle.addEventListener('click', () => {
        enterFullscreen(false);
        showToast('Landscape full-screen signing mode active. Tap Done or rotate when finished.');
    });
}

if (fsBtnDone) {
    fsBtnDone.addEventListener('click', () => {
        exitFullscreen();
        showToast('Signature captured! Ready to download & save.');
    });
}

if (fsBtnUndo) fsBtnUndo.addEventListener('click', () => engine.undo());
if (fsBtnRedo) fsBtnRedo.addEventListener('click', () => engine.redo());
if (fsBtnClear) fsBtnClear.addEventListener('click', () => engine.clear());

// Automatic detection when rotating phone between portrait and landscape
function handleOrientationChange(): void {
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    // Typical smartphone landscape height is <= 650px
    const isPhoneOrTabletLandscape = isLandscape && window.innerHeight <= 650;

    if (isPhoneOrTabletLandscape) {
        if (!document.body.classList.contains('fullscreen-mode')) {
            enterFullscreen(true);
            showToast('Landscape mode detected: fullscreen signing enabled');
        }
    } else {
        // When phone is held upright again (portrait), return back to the standard page
        if (document.body.classList.contains('fullscreen-mode') && isAutoLandscapeMode) {
            exitFullscreen();
            showToast('Phone held upright: signature ready to download');
        }
    }
}

window.addEventListener('resize', handleOrientationChange);
window.addEventListener('orientationchange', handleOrientationChange);
if (window.screen && window.screen.orientation) {
    window.screen.orientation.addEventListener('change', handleOrientationChange);
}

// Initial state call
onDrawingStateChanged();

