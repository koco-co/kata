source_refs: ["prd.file:p0-weak#sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]

await expect(page.getByText("Order submitted")).toBeTruthy();
