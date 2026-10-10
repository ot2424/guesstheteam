/** Safari's gesture events supplement touch-action for pinch zoom. */
export function configureAppViewport() {
  const preventGesture = (event: Event) => event.preventDefault();
  document.addEventListener('gesturestart', preventGesture, { passive: false });
  document.addEventListener('gesturechange', preventGesture, { passive: false });
}
