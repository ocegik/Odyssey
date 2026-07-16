import { normalizeMockDataset, toMockDataset } from "./mockModel";

export function toRaw(mocks) {
  return toMockDataset(mocks);
}

export function normalizeStoredMocks(raw) {
  return normalizeMockDataset(raw);
}
