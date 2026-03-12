"use client";

import { useEffect, useRef, TextareaHTMLAttributes } from "react";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
}

export default function AutoResizeTextarea({ value, ...props }: Props) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [value]);

    return (
        <textarea
            {...props}
            ref={textareaRef}
            value={value}
            onChange={(e) => {
                if (props.onChange) props.onChange(e);
                adjustHeight();
            }}
            style={{
                ...props.style,
                overflow: "hidden",
                resize: "none",
            }}
        />
    );
}
