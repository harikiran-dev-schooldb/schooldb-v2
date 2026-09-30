const DEFAULT_WORKSPACE_BRAND = "#4f46e5";

type CachedBrandColor = {
  logoUrl: string;
  color: string;
};

function toHex(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function softenBrandColor(red: number, green: number, blue: number) {
  const softenAmount = 0.18;
  const neutral = { red: 248, green: 250, blue: 252 };

  return rgbToHex(
    red * (1 - softenAmount) + neutral.red * softenAmount,
    green * (1 - softenAmount) + neutral.green * softenAmount,
    blue * (1 - softenAmount) + neutral.blue * softenAmount,
  );
}

function extractDominantColor(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  const size = 72;
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return DEFAULT_WORKSPACE_BRAND;

  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;

  const buckets = new Map<
    string,
    { red: number; green: number; blue: number; weight: number }
  >();

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const alpha = pixels[index + 3] / 255;

    if (alpha < 0.65) continue;

    const max = Math.max(red, green, blue) / 255;
    const min = Math.min(red, green, blue) / 255;
    const saturation = max === 0 ? 0 : (max - min) / max;
    const luminance =
      (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

    // Ignore white/black backgrounds and neutral pixels so the selected
    // color represents the logo artwork rather than its canvas.
    if (
      saturation < 0.22 ||
      luminance > 0.93 ||
      luminance < 0.08
    ) {
      continue;
    }

    const key = `${red >> 5}-${green >> 5}-${blue >> 5}`;
    const weight =
      alpha *
      (0.45 + saturation * 1.7) *
      (1 - Math.abs(luminance - 0.5) * 0.35);

    const bucket = buckets.get(key) ?? {
      red: 0,
      green: 0,
      blue: 0,
      weight: 0,
    };

    bucket.red += red * weight;
    bucket.green += green * weight;
    bucket.blue += blue * weight;
    bucket.weight += weight;
    buckets.set(key, bucket);
  }

  const dominant = [...buckets.values()].sort(
    (left, right) => right.weight - left.weight,
  )[0];

  if (!dominant?.weight) return DEFAULT_WORKSPACE_BRAND;

  return softenBrandColor(
    dominant.red / dominant.weight,
    dominant.green / dominant.weight,
    dominant.blue / dominant.weight,
  );
}

function loadLogo(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load school logo."));
    image.src = url;
  });
}

function setWorkspaceBrandColor(color: string) {
  document.documentElement.style.setProperty(
    "--school-workspace-brand",
    color,
  );
}

export async function applySchoolLogoBrandColor(
  schoolSlug: string,
  logoUrl: string | null,
) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return DEFAULT_WORKSPACE_BRAND;
  }

  const cacheKey = `schooldb-workspace-brand-v2:${schoolSlug}`;
  const currentLogoUrl = logoUrl ?? "";

  try {
    const cachedValue = window.sessionStorage.getItem(cacheKey);
    if (cachedValue) {
      const cached = JSON.parse(cachedValue) as CachedBrandColor;
      if (cached.logoUrl === currentLogoUrl && cached.color) {
        setWorkspaceBrandColor(cached.color);
        return cached.color;
      }
    }
  } catch {
    // Ignore malformed or unavailable session storage.
  }

  setWorkspaceBrandColor(DEFAULT_WORKSPACE_BRAND);

  if (!logoUrl) return DEFAULT_WORKSPACE_BRAND;

  try {
    const image = await loadLogo(logoUrl);
    const color = extractDominantColor(image);
    setWorkspaceBrandColor(color);

    try {
      window.sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ logoUrl: currentLogoUrl, color }),
      );
    } catch {
      // The transition still works if storage is unavailable.
    }

    return color;
  } catch {
    return DEFAULT_WORKSPACE_BRAND;
  }
}
