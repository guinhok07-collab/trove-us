import { compareAt, retailPrice } from "./lib/cj-catalog-lib.mjs";

/** Default CJ shipping estimate by store (relink scripts). */
export const SHIP_BY_STORE = {
  pet: 4,
  home: 4,
  wellness: 3.5,
  tech: 3.5,
};

export const SHIP_CANDIDATES = [3, 3.5, 4, 4.5, 5, 5.5, 6];

export function shipForStore(store) {
  return SHIP_BY_STORE[store] ?? 3.5;
}

/** True when stored price matches formula for any standard ship tier. */
export function priceMatchesFormula(cost, storedPrice, compareStored) {
  for (const ship of SHIP_CANDIDATES) {
    const expected = retailPrice(cost, ship);
    const expectedCompare = compareAt(expected);
    if (
      Math.abs(storedPrice - expected) < 0.02 &&
      Math.abs((compareStored ?? 0) - expectedCompare) < 0.02
    ) {
      return { ok: true, ship, expected, expectedCompare };
    }
  }
  return { ok: false };
}
