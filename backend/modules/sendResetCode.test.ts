import { resetEmail } from "./sendResetCode";

describe("resetEmail", () => {
  it("puts the code in the subject, the text and the html", () => {
    const email = resetEmail("482913");

    expect(email.subject).toContain("482913");
    expect(email.text).toContain("482913");
    expect(email.html).toContain("482913");
  });

  it("says how long the code is valid", () => {
    expect(resetEmail("482913").text).toContain("15 minutes");
  });
});
