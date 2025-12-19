import { SoundClip } from '../types';

// Convert string to base HSL
const stringToHue = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 360);
};

// Hex to HSL helper
export const hexToHsl = (hex: string): { h: number, s: number, l: number } => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt("0x" + hex[1] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[2]);
    b = parseInt("0x" + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt("0x" + hex[1] + hex[2]);
    g = parseInt("0x" + hex[3] + hex[4]);
    b = parseInt("0x" + hex[5] + hex[6]);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const cmin = Math.min(r,g,b), cmax = Math.max(r,g,b), delta = cmax - cmin;
  let h = 0, s = 0, l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
};

// Convert HSL to Hex
const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// Hex to RGB Helper
export const hexToRgb = (hex: string) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt("0x" + hex[1] + hex[1]);
    g = parseInt("0x" + hex[2] + hex[2]);
    b = parseInt("0x" + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt("0x" + hex[1] + hex[2]);
    g = parseInt("0x" + hex[3] + hex[4]);
    b = parseInt("0x" + hex[5] + hex[6]);
  }
  return { r, g, b };
};

// RGB to Hex Helper
export const rgbToHex = (r: number, g: number, b: number) => {
  const componentToHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  };
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

// Determine if color is light (high brightness)
export const isLightColor = (hex: string): boolean => {
  const { r, g, b } = hexToRgb(hex);
  // YIQ equation
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 200; // Threshold. 128 is standard, 140 biases slightly towards keeping white text longer
};

export const parseName = (name: string) => {
    // Attempt to parse "Name #123", "Name 123", "Name #123 suffix"
    const match = name.match(/^(.*?)(?:[ #]*(\d+))(.*)$/);
    let baseName = name;
    let number = 1;

    if (match && match[2]) {
        const prefix = match[1].trim();
        if (prefix) {
            baseName = prefix;
        } else if (match[3] && match[3].trim()) {
           baseName = match[3].trim();
        }
        number = parseInt(match[2], 10);
    }
    return { baseName, number };
};

// Calculates a color for a follower based on a leader's hex color and the follower's number
export const deriveColorFromLeader = (leaderHex: string, followerNumber: number): string => {
    const { h, s, l } = hexToHsl(leaderHex);
    
    // Shift Logic (Consistent with generateSmartColor)
    const hueShift = (followerNumber - 1) * 6;
    const lightnessShift = ((followerNumber - 1) * 3) % 15; 

    const newH = (h + hueShift) % 360;
    const newL = Math.max(20, Math.min(80, l + (followerNumber % 2 === 0 ? 3 : -3) - (lightnessShift / 2)));

    return hslToHex(newH, s, newL);
};

export const generateSmartColor = (name: string, existingClips: SoundClip[] = []): string => {
  const { baseName, number } = parseName(name);

  let h: number, s: number, l: number;

  const leader = existingClips.find(c => {
      const p = parseName(c.name);
      return p.baseName.toLowerCase() === baseName.toLowerCase() && p.number === 1;
  });

  if (leader && leader.color) {
      const hsl = hexToHsl(leader.color);
      h = hsl.h;
      s = hsl.s;
      l = hsl.l;
  } else {
      h = stringToHue(baseName);
      s = 65; 
      l = 50; 
  }
  
  const hueShift = (number - 1) * 6; 
  const lightnessShift = ((number - 1) * 3) % 15; 

  const newH = (h + hueShift) % 360;
  const newL = Math.max(20, Math.min(80, l + (number % 2 === 0 ? 3 : -3) - (lightnessShift / 2)));

  return hslToHex(newH, s, newL);
};