/**
 * Plain-stream messages, used before Ink mounts and after it unmounts.
 *
 * Anything shown *while* the interface is running belongs in a component:
 * writing to the stream underneath Ink corrupts the frame.
 */
export function showError(message: string): void {
  console.error(`× ${message}`);
}

export function showInfo(message: string): void {
  console.log(message);
}
