import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("skips falsy values", () => {
    const hidden = false;
    const zero = 0;
    expect(cn("a", hidden && "no", null, undefined, zero && "zero", "b")).toBe("a b");
  });

  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    const darkMode = true;
    expect(cn("text-slate-500", darkMode && "text-white")).toBe("text-white");
  });
});
