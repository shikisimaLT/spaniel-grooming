"use client";

import { useEffect, useState } from "react";

/**
 * Global "something is loading" indicator for the back office.
 * Next.js navigations, ?search-param changes and server actions all go through fetch() with an
 * `RSC` or `Next-Action` header. We count those in-flight requests (until their body is fully read),
 * and while any is pending we show a top bar, dim <main>, and mark the clicked submit button as busy.
 */
export function NavProgress() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const originalFetch = window.fetch;
    let inflight = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const root = document.documentElement;

    const tracked = (input: RequestInfo | URL, init?: RequestInit) => {
      const h = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      if (h.has("Next-Router-Prefetch")) return false; // background link prefetch, not user-visible
      return h.has("RSC") || h.has("Next-Action");
    };
    const start = () => {
      inflight++;
      if (inflight === 1) {
        // skip the bar for instant responses so it doesn't flicker
        timer = setTimeout(() => {
          setActive(true);
          root.dataset.loading = "1";
        }, 150);
      }
    };
    const end = () => {
      inflight = Math.max(0, inflight - 1);
      if (inflight === 0) {
        clearTimeout(timer);
        setActive(false);
        delete root.dataset.loading;
        clearPending();
      }
    };

    window.fetch = function (this: unknown, input: RequestInfo | URL, init?: RequestInit) {
      if (!tracked(input, init)) return originalFetch.call(window, input, init);
      start();
      return originalFetch.call(window, input, init).then(
        (res) => {
          // finished only when the streamed body has been fully read
          res.clone().arrayBuffer().then(end, end);
          return res;
        },
        (err) => {
          end();
          throw err;
        },
      );
    };

    const onSubmit = (e: SubmitEvent) => {
      const b = e.submitter;
      // React already calls preventDefault() on action forms, so don't check defaultPrevented here
      if (b instanceof HTMLElement) {
        b.setAttribute("data-pending", "");
        b.setAttribute("aria-busy", "true");
        // safety net for plain GET forms / cancelled submits where no fetch ever reports completion
        setTimeout(() => {
          if (inflight === 0) clearPending();
        }, 20000);
      }
    };
    const clearPending = () =>
      document.querySelectorAll("[data-pending]").forEach((el) => {
        el.removeAttribute("data-pending");
        el.removeAttribute("aria-busy");
      });
    // coming back via the browser's back/forward cache must not show a stuck spinner
    const onPageShow = () => clearPending();
    document.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.fetch = originalFetch;
      document.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", onPageShow);
      clearTimeout(timer);
      delete root.dataset.loading;
    };
  }, []);

  return (
    <div className={`navbar ${active ? "on" : ""}`} role="progressbar" aria-label="Memuat halaman" aria-hidden={!active}>
      <i />
    </div>
  );
}
