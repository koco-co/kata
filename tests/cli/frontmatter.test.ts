import { describe, expect, it } from "bun:test";
import { parseFrontMatter, splitTopLevel } from "../../cli/lib/frontmatter.ts";

describe("parseFrontMatter", () => {
  it("keeps quoted scalars as strings (roundtrip safe)", () => {
    const { frontMatter } = parseFrontMatter('---\nprd_id: "12345"\nflag: "true"\n---\nbody');
    expect(frontMatter.prd_id).toBe("12345");
    expect(frontMatter.flag).toBe("true");
  });

  it("still coerces unquoted numbers and booleans", () => {
    const { frontMatter } = parseFrontMatter("---\nprd_id: 12345\nflag: true\n---\nbody");
    expect(frontMatter.prd_id).toBe(12345);
    expect(frontMatter.flag).toBe(true);
  });

  it("parses an empty value as an empty string, not null/array", () => {
    const { frontMatter } = parseFrontMatter("---\ndescription:\n---\nbody");
    expect(frontMatter.description).toBe("");
  });

  it("upgrades an empty value to an array when items follow", () => {
    const { frontMatter } = parseFrontMatter('---\ntags:\n- alpha\n- "b,c"\n---\nbody');
    expect(frontMatter.tags).toEqual(["alpha", "b,c"]);
  });

  it("keeps explicit [] as an empty array", () => {
    const { frontMatter } = parseFrontMatter("---\ntags: []\n---\nbody");
    expect(frontMatter.tags).toEqual([]);
  });

  it("splits inline objects on top-level commas only", () => {
    const { frontMatter } = parseFrontMatter(
      '---\nrepos:\n- { path: "a,b/c", branch: "main" }\n- { path: d, branch: dev }\n---\nbody',
    );
    expect(frontMatter.repos).toEqual([
      { path: "a,b/c", branch: "main" },
      { path: "d", branch: "dev" },
    ]);
  });

  it("only strips symmetric quotes", () => {
    const { frontMatter } = parseFrontMatter("---\na: \"x\nb: 'y'\nc: \"z'\n---\nbody");
    expect(frontMatter.a).toBe('"x');
    expect(frontMatter.b).toBe("y");
    expect(frontMatter.c).toBe("\"z'");
  });

  it("returns the body untouched when no frontmatter block", () => {
    const { frontMatter, body } = parseFrontMatter("# just markdown\n");
    expect(frontMatter).toEqual({});
    expect(body).toBe("# just markdown\n");
  });
});

describe("splitTopLevel", () => {
  it("ignores commas inside both quote styles", () => {
    expect(splitTopLevel("a, \"b,c\", 'd,e', f")).toEqual(["a", ' "b,c"', " 'd,e'", " f"]);
  });
  it("keeps an unterminated quote literal", () => {
    expect(splitTopLevel('a, "b,c')).toEqual(["a", ' "b,c']);
  });
});
