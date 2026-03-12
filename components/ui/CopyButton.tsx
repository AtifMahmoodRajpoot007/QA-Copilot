"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  text: string;
}

export default function CopyButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="btn-secondary"
      style={{ padding: "6px 12px", fontSize: "0.78rem" }}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check size={13} />
          Copied!
        </>
      ) : (
        <>
          <Copy size={13} />
          Copy
        </>
      )}
    </button>
  );
}
