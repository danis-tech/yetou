import { rateLimit, getClientIp } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("should allow requests within limit", () => {
    for (let i = 0; i < 10; i++) {
      const result = rateLimit("test:127.0.0.1", 10, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9 - i);
    }
  });

  it("should block requests exceeding limit", () => {
    for (let i = 0; i < 10; i++) {
      rateLimit("test-block:127.0.0.1", 10, 60000);
    }
    const result = rateLimit("test-block:127.0.0.1", 10, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should use different keys independently", () => {
    for (let i = 0; i < 10; i++) {
      rateLimit("key-a:127.0.0.1", 10, 60000);
    }
    const blockedA = rateLimit("key-a:127.0.0.1", 10, 60000);
    expect(blockedA.allowed).toBe(false);

    const stillAllowedB = rateLimit("key-b:127.0.0.1", 10, 60000);
    expect(stillAllowedB.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("should extract IP from x-forwarded-for header", () => {
    const headers = new Headers({ "x-forwarded-for": "192.168.1.1, 10.0.0.1" });
    const req = { headers } as unknown as Request;
    expect(getClientIp(req)).toBe("192.168.1.1");
  });

  it("should extract IP from x-real-ip header", () => {
    const headers = new Headers({ "x-real-ip": "10.0.0.1" });
    const req = { headers } as unknown as Request;
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("should fallback to 127.0.0.1 when no headers", () => {
    const headers = new Headers();
    const req = { headers } as unknown as Request;
    expect(getClientIp(req)).toBe("127.0.0.1");
  });
});
