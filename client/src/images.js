// Uses the event's own image, or a placeholder photo until one is set
export function eventImage(ev, w = 800, h = 1000) {
  return ev.image_url || `https://picsum.photos/seed/eventhub-${ev.id}/${w}/${h}`;
}

export function hideBroken(e) {
  e.currentTarget.style.display = 'none';
}