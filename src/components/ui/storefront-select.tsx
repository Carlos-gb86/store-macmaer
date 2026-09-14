"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useStorefrontI18n } from "@/components/i18n/storefront-i18n";

const emptyValue = "__macmaer_empty__";

export type StorefrontSelectOption = {
  value: string;
  label: string;
  leading?: string;
  disabled?: boolean;
};

export function StorefrontSelect({
  id,
  name,
  value,
  defaultValue = "",
  options,
  disabled = false,
  required = false,
  ariaLabel,
  ariaDescribedBy,
  className = "",
  align = "start",
  onValueChange,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: StorefrontSelectOption[];
  disabled?: boolean;
  required?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
  align?: "start" | "center" | "end";
  onValueChange?: (value: string) => void;
}) {
  const { locale } = useStorefrontI18n();
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = value ?? internalValue;
  const radixValue = selectedValue === "" ? emptyValue : selectedValue;

  return (
    <SelectPrimitive.Root
      name={name}
      value={radixValue}
      disabled={disabled}
      required={required}
      onValueChange={(nextValue) => {
        const next = nextValue === emptyValue ? "" : nextValue;
        if (value === undefined) setInternalValue(next);
        onValueChange?.(next);
      }}
    >
      <SelectPrimitive.Trigger
        id={id}
        className={`storefront-select-trigger ${className}`.trim()}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="storefront-select-chevron">
          <ChevronDown aria-hidden="true" size={15} strokeWidth={1.7} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          lang={locale === "sv" ? "sv-SE" : "en"}
          className="storefront-select-content"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          align={align}
        >
          <SelectPrimitive.ScrollUpButton className="storefront-select-scroll">
            <ChevronUp aria-hidden="true" size={15} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="storefront-select-viewport">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value || emptyValue}
                value={option.value || emptyValue}
                disabled={option.disabled}
                className="storefront-select-item"
              >
                <SelectPrimitive.ItemText>
                  <span className="storefront-select-item-label">
                    {option.leading && (
                      <span
                        className="storefront-select-leading"
                        aria-hidden="true"
                      >
                        {option.leading}
                      </span>
                    )}
                    <span>{option.label}</span>
                  </span>
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="storefront-select-check">
                  <Check aria-hidden="true" size={15} strokeWidth={2} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="storefront-select-scroll">
            <ChevronDown aria-hidden="true" size={15} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
