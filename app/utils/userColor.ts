// Deterministic user color assignment from a user identifier string.
// Uses HSL to generate a visually distinct color palette.

function hashStringToNumber(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash >>> 0);
}

export function userIdToColor(userId: string): string {
    const hash = hashStringToNumber(userId || "guest");
    const hue = hash % 360; // 0 - 359
    const saturation = 70; // keep vivid
    const lightness = 55; // mid-light
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
}


