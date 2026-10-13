import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { paragraphs, richText } from "./rich-text";

const html = (nodes: React.ReactNode[]) => renderToStaticMarkup(<>{nodes}</>);

describe("richText", () => {
  it("replaces tags with rendered nodes and keeps surrounding text", () => {
    const out = richText("By paying you agree to our <terms>Terms</terms> and <privacy>Privacy Policy</privacy>.", {
      terms: (c) => <a href="/terms">{c}</a>,
      privacy: (c) => <a href="/privacy">{c}</a>,
    });
    expect(html(out)).toBe(
      'By paying you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.',
    );
    expect(out.filter(isValidElement)).toHaveLength(2);
  });

  it("supports any tag order (translations may reorder)", () => {
    const out = richText("<privacy>P</privacy> + <terms>T</terms>", {
      terms: (c) => <b>{c}</b>,
      privacy: (c) => <i>{c}</i>,
    });
    expect(html(out)).toBe("<i>P</i> + <b>T</b>");
  });

  it("renders unknown tags as plain text and escapes content", () => {
    expect(html(richText("<x>hi</x> <img>", {}))).toBe("hi &lt;img&gt;");
  });

  it("returns plain strings untouched", () => {
    expect(richText("no tags", {})).toEqual(["no tags"]);
  });
});

describe("paragraphs", () => {
  it("splits on blank lines and trims", () => {
    expect(paragraphs("One.\n\n  Two.\n \nThree.")).toEqual(["One.", "Two.", "Three."]);
    expect(paragraphs("")).toEqual([]);
  });
});
