import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { htmlFragmentToMarkdown } from "../../../cli/integrations/zentao/html-md.ts";

describe("htmlFragmentToMarkdown", () => {
  it("turns <p> blocks into separate lines", () => {
    const md = htmlFragmentToMarkdown("<p>第一行</p>\n<p>第二行</p>");
    assert.equal(md, "第一行\n第二行");
  });

  it("keeps image src as markdown image ref, drops onload attr", () => {
    const md = htmlFragmentToMarkdown(
      '<p><img onload="setImageSize(this,0)" src="/zentao/file-read-1.png" alt="" /></p>',
    );
    assert.equal(md, "![](/zentao/file-read-1.png)");
  });

  it("strips span wrappers and inline styles but keeps text", () => {
    const md = htmlFragmentToMarkdown('<p>接口<span style="color:#1F1F1F;">/a/b</span>：</p>');
    assert.equal(md, "接口/a/b：");
  });

  it("converts <br> to newline", () => {
    const md = htmlFragmentToMarkdown("<p>a<br />b</p>");
    assert.equal(md, "a\nb");
  });

  it("decodes html entities", () => {
    const md = htmlFragmentToMarkdown("<p>1 &lt; 2 &amp;&amp; 3 &gt; 0</p>");
    assert.equal(md, "1 < 2 && 3 > 0");
  });

  it("collapses blank lines and trims", () => {
    const md = htmlFragmentToMarkdown("<p>a</p>\n<p><br /></p>\n<p>b</p>");
    assert.equal(md, "a\nb");
  });

  it("returns empty string for empty/whitespace input", () => {
    assert.equal(htmlFragmentToMarkdown(""), "");
    assert.equal(htmlFragmentToMarkdown("   "), "");
  });
});
