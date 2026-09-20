export interface ScanHistoryItem {
  scanId: string;
  timestamp: number;
  fileName?: string;
  itemsCount: number;
  scoreBefore?: number;
  scoreAfter?: number;
  verdict?: string;
}

const STORAGE_KEY = "personashield_scan_history";

export const getScanHistory = (): ScanHistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveScanToHistory = (item: Omit<ScanHistoryItem, "timestamp">) => {
  try {
    const history = getScanHistory();
    // Filter out if duplicate
    const filtered = history.filter((h) => h.scanId !== item.scanId);
    const updated: ScanHistoryItem[] = [
      { ...item, timestamp: Date.now() },
      ...filtered,
    ].slice(0, 15); // Keep up to 15 items
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save scan history", err);
  }
};

export const clearScanHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear scan history", err);
  }
};
