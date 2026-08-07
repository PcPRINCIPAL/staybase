import { useEffect } from "react";

/**
 * Laat elementen met de klasse .lp-fade invaren zodra ze in beeld scrollen.
 * Wordt gebruikt door zowel de landingspagina als de artikelpagina's.
 */
export function useFadeIn(deps: unknown[] = []) {
  useEffect(() => {
    const els = document.querySelectorAll(".lp-fade:not(.in)");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
