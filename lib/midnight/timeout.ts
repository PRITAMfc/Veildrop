export const withTimeout = async <T,>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () =>
        reject(
          new Error(
            `${label} timed out after ${ms / 1000}s. If a Lace popup is open, approve it and wait; if it is already approved, it may still be confirming on the network. Then try again.`,
          ),
        ),
      ms,
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timeoutId),
  );
};
