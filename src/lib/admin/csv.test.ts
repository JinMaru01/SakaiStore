import { describe, expect, it } from "vitest";
import { escapeCsvCell, toCsv } from "./csv";

describe("escapeCsvCell", () => {
  it("leaves plain values alone", () => {
    expect(escapeCsvCell("SK7F3K9Q2M")).toBe("SK7F3K9Q2M");
    expect(escapeCsvCell(123)).toBe("123");
    expect(escapeCsvCell(-5)).toBe("-5"); // numbers are never formulas
    expect(escapeCsvCell(true)).toBe("true");
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
    expect(escapeCsvCell(Number.NaN)).toBe("");
  });

  it("quotes commas, quotes and newlines (RFC 4180)", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvCell("cr\r")).toBe('"cr\r"');
  });

  it("neutralizes spreadsheet formulas with a leading quote", () => {
    expect(escapeCsvCell("=1+1")).toBe("'=1+1");
    expect(escapeCsvCell("+85512345678")).toBe("'+85512345678");
    expect(escapeCsvCell("-2+3")).toBe("'-2+3");
    expect(escapeCsvCell("@SUM(A1:A2)")).toBe("'@SUM(A1:A2)");
    expect(escapeCsvCell("\t=cmd")).toBe("'\t=cmd");
    expect(escapeCsvCell("\r=cmd")).toBe("\"'\r=cmd\"");
  });

  it("guards and quotes together", () => {
    expect(escapeCsvCell('=HYPERLINK("http://x","click")')).toBe('"\'=HYPERLINK(""http://x"",""click"")"');
  });

  it("does not guard formula characters in the middle of text", () => {
    expect(escapeCsvCell("a=b")).toBe("a=b");
    expect(escapeCsvCell("user@example.com")).toBe("user@example.com");
  });

  it("writes dates as ISO strings", () => {
    expect(escapeCsvCell(new Date("2026-10-13T07:00:00Z"))).toBe("2026-10-13T07:00:00.000Z");
  });
});

describe("toCsv", () => {
  it("writes a header and CRLF-separated rows", () => {
    const csv = toCsv(
      [
        { code: "SK1", name: "Fox, the" },
        { code: "SK2", name: "=evil()" },
      ],
      [
        { header: "code", value: (r) => r.code },
        { header: "name", value: (r) => r.name },
      ],
    );
    expect(csv).toBe('code,name\r\nSK1,"Fox, the"\r\nSK2,\'=evil()\r\n');
  });

  it("writes only the header for no rows", () => {
    expect(toCsv([], [{ header: "a", value: () => 1 }])).toBe("a\r\n");
  });
});
