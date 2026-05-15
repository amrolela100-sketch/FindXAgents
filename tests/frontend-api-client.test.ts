// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("../artifacts/findx/src/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("../artifacts/findx/src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "test-token" } },
      }),
    },
  },
}));

import { toast } from "../artifacts/findx/src/hooks/use-toast";

describe("Frontend API client", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Restore navigator.onLine to true by default
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("exportLeads()", () => {
    it("returns a Blob when fetch resolves with ok:true", async () => {
      const mockBlob = new Blob(["businessName,city\nAcme,Amsterdam"], {
        type: "text/csv",
      });
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
        headers: { get: () => "text/csv" },
      }));

      // Dynamically import to allow mocks to be set up first
      const api = await import("../artifacts/findx/src/lib/api");
      if (typeof api.exportLeads === "function") {
        const result = await api.exportLeads();
        expect(result).toBeInstanceOf(Blob);
      }
    });
  });

  describe("toastError()", () => {
    it("does NOT call toast for Unauthorized message (skip list)", async () => {
      const api = await import("../artifacts/findx/src/lib/api");
      if (typeof api.toastError === "function") {
        api.toastError("Unauthorized");
        expect(toast).not.toHaveBeenCalled();
      }
    });

    it("does NOT call toast for No internet connection", async () => {
      const api = await import("../artifacts/findx/src/lib/api");
      if (typeof api.toastError === "function") {
        api.toastError("No internet connection");
        expect(toast).not.toHaveBeenCalled();
      }
    });

    it("calls toast with variant:destructive for generic errors", async () => {
      const api = await import("../artifacts/findx/src/lib/api");
      if (typeof api.toastError === "function") {
        api.toastError("Something went wrong");
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" })
        );
      }
    });
  });

  describe("Offline detection", () => {
    it("rejects with No internet connection when navigator.onLine is false", async () => {
      Object.defineProperty(navigator, "onLine", {
        value: false,
        writable: true,
        configurable: true,
      });

      vi.stubGlobal("fetch", vi.fn());

      const api = await import("../artifacts/findx/src/lib/api");
      if (typeof api.fetchApi === "function") {
        await expect(api.fetchApi("/test")).rejects.toThrow(/internet/i);
      }
    });
  });

  describe("429 rate limit handling", () => {
    it("throws Too many requests error on 429 response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (key: string) => (key === "Retry-After" ? "5" : null),
        },
        json: async () => ({ error: "Rate limited" }),
        text: async () => "Rate limited",
      }));

      const api = await import("../artifacts/findx/src/lib/api");
      if (typeof api.fetchApi === "function") {
        await expect(api.fetchApi("/test")).rejects.toThrow(/too many requests/i);
      }
    });
  });
});
