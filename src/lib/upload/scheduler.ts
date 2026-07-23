export async function runBounded<T, R>(
  items: readonly T[],
  requestedLimit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const limit = Number.isNaN(requestedLimit)
    ? 1
    : Math.min(4, Math.max(1, Math.floor(requestedLimit)));
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let cursor = 0;

  const consume = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;

      try {
        results[index] = {
          status: "fulfilled",
          value: await worker(items[index], index),
        };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));

  return results;
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const copy = [...items];

  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    from >= copy.length ||
    to < 0 ||
    to >= copy.length
  ) {
    return copy;
  }

  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);

  return copy;
}
