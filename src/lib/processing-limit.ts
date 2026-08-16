type Waiter = () => void;

const MAX_SERVER_PROCESSING = 4;
let active = 0;
const waiters: Waiter[] = [];

async function acquire() {
  if (active < MAX_SERVER_PROCESSING) {
    active += 1;
    return;
  }
  await new Promise<void>((resolve) => waiters.push(resolve));
  active += 1;
}

function release() {
  active -= 1;
  waiters.shift()?.();
}

export async function withProcessingSlot<T>(work: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await work();
  } finally {
    release();
  }
}
