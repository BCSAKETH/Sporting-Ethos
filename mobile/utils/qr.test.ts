import { buildCheckinQrValue, isCheckinQrValue } from "./qr";

describe("check-in QR value", () => {
  it("builds the expected deep link", () => {
    expect(buildCheckinQrValue()).toBe("sportingethos://checkin");
  });

  it("accepts the counter QR's own value", () => {
    expect(isCheckinQrValue(buildCheckinQrValue())).toBe(true);
  });

  it("rejects QR codes from a different app/scheme", () => {
    expect(isCheckinQrValue("someotherapp://checkin")).toBe(false);
  });

  it("rejects a Sporting Ethos link that isn't the check-in link", () => {
    expect(isCheckinQrValue("sportingethos://reset-password")).toBe(false);
  });

  it("rejects arbitrary scanned text", () => {
    expect(isCheckinQrValue("just some plain text from a random QR code")).toBe(false);
  });
});
