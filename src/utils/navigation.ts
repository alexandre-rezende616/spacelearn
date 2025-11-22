import type { Href } from 'expo-router';

export function goBackOrReplace(
  router: { canGoBack: () => boolean; back: () => void; replace: (href: Href) => void },
  fallback: Href,
) {
  try {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  } catch {
    router.replace(fallback);
  }
}
