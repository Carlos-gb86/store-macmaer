"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#f9f5f0",
          color: "#2e211e",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <main
          style={{
            boxSizing: "border-box",
            display: "grid",
            minHeight: "100vh",
            placeContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p style={{ letterSpacing: ".16em", textTransform: "uppercase" }}>
            A loose thread
          </p>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400 }}>
            We couldn’t finish loading this page.
          </h1>
          <p>
            Please try again. Your cart and payment details remain protected.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              justifySelf: "center",
              minHeight: 48,
              marginTop: "1rem",
              padding: ".9rem 1.7rem",
              border: 0,
              background: "#593c39",
              color: "white",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
