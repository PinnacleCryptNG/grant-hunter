export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://grant-hunter-omega.vercel.app";
export const SITE_NAME = "Grant Hunter";
export const LIME = "#c6f432";
export const NIGHT = "#07090e";

export function Mark({ size, stroke = NIGHT }: { size: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M22 12h-4M6 12H2M12 6V2M12 22v-4" />
    </svg>
  );
}

async function googleFont(family: string, text: string) {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function ogFonts(display: string, italic: string) {
  const [d, s] = await Promise.all([
    googleFont("Bricolage+Grotesque:wght@700", display),
    googleFont("Instrument+Serif:ital@1", italic),
  ]);
  return [
    ...(d ? [{ name: "Display", data: d, weight: 700 as const, style: "normal" as const }] : []),
    ...(s ? [{ name: "Serif", data: s, weight: 400 as const, style: "italic" as const }] : []),
  ];
}
