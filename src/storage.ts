import { SignatureRecord } from './types';

const STORAGE_KEY = 'svg_signatures_office_store';

class SignatureStore {
    private signatures: SignatureRecord[] = [];
    private listeners: Array<(items: SignatureRecord[]) => void> = [];

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage(): void {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                this.signatures = JSON.parse(data);
            }
        } catch (e) {
            console.warn('Failed to read signatures from storage:', e);
            this.signatures = [];
        }
    }

    private persist(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.signatures));
        } catch (e) {
            console.warn('Failed to save signatures to storage:', e);
        }
        this.notify();
    }

    public getSignatures(): SignatureRecord[] {
        return [...this.signatures];
    }

    public addSignature(record: SignatureRecord): void {
        // Add to the front of the list
        this.signatures.unshift(record);
        this.persist();
    }

    public deleteSignature(id: string): void {
        this.signatures = this.signatures.filter((item) => item.id !== id);
        this.persist();
    }

    public clearAll(): void {
        this.signatures = [];
        this.persist();
    }

    public getSignatureById(id: string): SignatureRecord | undefined {
        return this.signatures.find((item) => item.id === id);
    }

    public subscribe(listener: (items: SignatureRecord[]) => void): () => void {
        this.listeners.push(listener);
        listener([...this.signatures]);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }

    private notify(): void {
        const copy = [...this.signatures];
        for (const listener of this.listeners) {
            listener(copy);
        }
    }
}

export const signatureStore = new SignatureStore();

