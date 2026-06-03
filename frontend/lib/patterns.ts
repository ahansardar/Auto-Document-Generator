const specialCharacters = "!@#$%&*-_";

export function generateFromPattern(pattern?: string | null, preview = false) {
  const source = pattern?.trim() || "{####}";
  return source.replace(/\{([^{}]+)\}/g, (_, token: string) =>
    token
      .split("")
      .map((marker) => characterForMarker(marker, preview))
      .join("")
  );
}

function characterForMarker(marker: string, preview: boolean) {
  if (marker === "#" || marker === "9") return preview ? "7" : randomFrom("0123456789");
  if (marker === "A") return preview ? "K" : randomFrom("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  if (marker === "a") return preview ? "k" : randomFrom("abcdefghijklmnopqrstuvwxyz");
  if (marker === "X") return preview ? "K" : randomFrom("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
  if (marker === "x") return preview ? "k" : randomFrom("abcdefghijklmnopqrstuvwxyz0123456789");
  if (marker === "*") return preview ? "@" : randomFrom(specialCharacters);
  if (marker === "?") return preview ? "Q" : randomFrom(`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789${specialCharacters}`);
  return marker;
}

function randomFrom(characters: string) {
  return characters[Math.floor(Math.random() * characters.length)];
}
