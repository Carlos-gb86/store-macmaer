"use client";

import { useEffect } from "react";

export function AboutRevealMotion() {
  useEffect(() => {
    const page = document.querySelector(".about-page-redesign");
    if (!page) return;

    const blocks = Array.from(
      page.querySelectorAll<HTMLElement>(".about-block:nth-child(n + 3)"),
    );
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion || !("IntersectionObserver" in window)) return;

    blocks.forEach((block) => {
      block.classList.add(
        "about-reveal",
        block.classList.contains("about-text-block")
          ? "about-reveal--up"
          : "about-reveal--side",
      );
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -28%", threshold: 0.04 },
    );

    blocks.forEach((block) => observer.observe(block));
    return () => observer.disconnect();
  }, []);

  return null;
}
