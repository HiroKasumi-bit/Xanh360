import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Vietnamese typed or pasted fully decomposed (a base letter plus combining marks, as macOS file names are) would draw
// its marks from a fallback font, in the wrong places: the Be Vietnam Pro subsets carry the precomposed letters only.
// A text field keeps its value composed (NFC) and the caret stays where it was. Matching normalises on its own, so this
// changes only what is shown. Text still being composed by an input method is left alone.
export function composedValue(event: {target: HTMLInputElement | HTMLTextAreaElement; nativeEvent: Event}): string {
  const field = event.target;
  const value = field.value;
  if ((event.nativeEvent as InputEvent).isComposing) return value;
  const composed = value.normalize("NFC");
  if (composed === value) return value;
  const caret = value.slice(0, field.selectionEnd ?? value.length).normalize("NFC").length;
  field.value = composed;
  try {
    field.setSelectionRange(caret, caret);
  } catch {
    // Field types without a selection keep the caret at the end.
  }
  return composed;
}
