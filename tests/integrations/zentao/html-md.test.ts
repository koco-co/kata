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

  it("parses tags whose attribute values contain >", () => {
    const md = htmlFragmentToMarkdown('<img alt="a > b" src="/zentao/file-read-2.png" />');
    assert.equal(md, "![](/zentao/file-read-2.png)");
  });

  it("strips span wrappers and inline styles but keeps text", () => {
    const md = htmlFragmentToMarkdown('<p>接口<span style="color:#1F1F1F;">/a/b</span>：</p>');
    assert.equal(md, "接口/a/b：");
  });

  it("converts <br> to newline", () => {
    const md = htmlFragmentToMarkdown("<p>a<br />b</p>");
    assert.equal(md, "a\nb");
  });

  it("wraps <a> text with its href", () => {
    const md = htmlFragmentToMarkdown(
      '<a href="https://zentao.example.cn/zentao/bug-view-1.html">单号</a>',
    );
    assert.equal(md, "[单号](https://zentao.example.cn/zentao/bug-view-1.html)");
  });

  it("keeps text of an unclosed <a> without leaking into following content", () => {
    const md = htmlFragmentToMarkdown(
      '<p><a href="/zentao/bug-view-1.html">链接文字</p><p>后续</p>',
    );
    assert.equal(md, "链接文字\n后续");
  });

  it("does not let a nested unclosed <a> swallow the next link", () => {
    const md = htmlFragmentToMarkdown('<a href="/1.html">第一 <a href="/2.html">第二</a>');
    assert.equal(md, "第一 [第二](/2.html)");
  });

  it("decodes entities, then escapes literal < > so markdown cannot swallow them", () => {
    const md = htmlFragmentToMarkdown("<p>1 &lt; 2 &amp;&amp; 3 &gt; 0</p>");
    assert.equal(md, "1 &lt; 2 && 3 &gt; 0");
  });

  it("escapes raw angle brackets in text", () => {
    const md = htmlFragmentToMarkdown("<p>期望值 a < b 且 c > d</p>");
    assert.equal(md, "期望值 a &lt; b 且 c &gt; d");
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
